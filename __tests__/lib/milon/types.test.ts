import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error — arquivo de produção criado por Hefesto nesta task (RED até existir)
import migrationSql from "@/utils/migrations/migration-0007-milon-exercises.sql?raw";
import type {
  ExerciseRow,
  Exercise,
  CreateExerciseInput,
  UpdateExerciseInput,
  LoadUnit,
} from "@/lib/milon/types";

import type {
  WorkoutExecutionRow,
  WorkoutExecution,
  WorkoutExecutionSeriesRow,
  WorkoutExecutionSeries,
} from "@/lib/milon/types";

function loadMigrationSql(): string {
  return migrationSql as unknown as string;
}

describe("Milon TASK-001 — migração da biblioteca de exercícios", () => {
  it("cria apenas a tabela public.exercises", () => {
    const sql = loadMigrationSql();
    expect(sql).toContain("public.exercises");
    expect(sql).toMatch(/CREATE TABLE/i);
  });

  it("não toca em tabelas financeiras", () => {
    const sql = loadMigrationSql().toLowerCase();
    for (const table of [
      "transactions",
      "categories",
      "financial_accounts",
      "budget_",
      "checklist_items",
      "monthly_periods",
      "public.accounts",
    ]) {
      expect(sql).not.toContain(table);
    }
  });

  it("define colunas obrigatórias, link anulável e auditoria", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/gen_random_uuid\(\)/);
    expect(sql).toMatch(/name\s+TEXT\s+NOT NULL/i);
    expect(sql).toMatch(/muscle\s+TEXT\s+NOT NULL/i);
    expect(sql).toMatch(/video_link\s+TEXT/i);
    expect(sql).not.toMatch(/video_link\s+TEXT\s+NOT NULL/i);
    expect(sql).toMatch(/created_at.*DEFAULT\s+now\(\)/i);
    expect(sql).toMatch(/created_by\s+TEXT\s+NOT NULL/i);
  });

  it("habilita RLS com permissão total a autenticados e indexa músculo+nome", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toContain("Permitir tudo para autenticados");
    expect(sql).toMatch(/TO authenticated/i);
    expect(sql).toMatch(/CREATE INDEX.*muscle/i);
    expect(sql).toMatch(/CREATE INDEX.*name/i);
  });

  it("registra a execução em schema_migrations ignorando conflito", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/INSERT INTO\s+public\.schema_migrations/i);
    expect(sql).toMatch(/ON CONFLICT\s*\(\s*script_name\s*\)\s*DO NOTHING/i);
  });

  it("garante schema_migrations com self-bootstrap idempotente antes da auditoria", () => {
    const sql = loadMigrationSql();
    // Bloco bootstrap: CREATE TABLE IF NOT EXISTS com definição idêntica à 2a
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS\s+public\.schema_migrations/i);
    expect(sql).toMatch(/id\s+SERIAL\s+PRIMARY KEY/i);
    expect(sql).toMatch(/spec_id\s+VARCHAR\(50\)\s+NOT NULL/i);
    expect(sql).toMatch(/spec_name\s+TEXT\s+NOT NULL/i);
    expect(sql).toMatch(/script_name\s+TEXT\s+NOT NULL\s+UNIQUE/i);
    expect(sql).toMatch(/executed_at\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE\s+DEFAULT\s+now\(\)\s+NOT NULL/i);
    expect(sql).toMatch(/executed_by\s+TEXT/i);
    // RLS + política espelhando a 2a
    expect(sql).toMatch(/ALTER TABLE\s+public\.schema_migrations\s+ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(
      /DROP POLICY IF EXISTS\s+"Permitir tudo para autenticados"\s+ON\s+public\.schema_migrations/i,
    );
    expect(sql).toMatch(/CREATE POLICY\s+"Permitir tudo para autenticados"\s+ON\s+public\.schema_migrations/i);
    // Bootstrap deve vir ANTES do INSERT de auditoria
    const bootstrapIdx = sql.search(/CREATE TABLE IF NOT EXISTS\s+public\.schema_migrations/i);
    const auditIdx = sql.search(/INSERT INTO\s+public\.schema_migrations/i);
    expect(bootstrapIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeGreaterThan(bootstrapIdx);
  });
});

describe("Milon TASK-001 — types da biblioteca de exercícios", () => {
  it("ExerciseRow representa a linha do banco com link anulável", () => {
    const withoutLink: ExerciseRow = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Supino reto",
      muscle: "peito",
      video_link: null,
      load_unit: null,
      deleted_at: null,
      created_at: "2026-09-12T00:00:00.000Z",
      created_by: "a@example.com",
    };
    const withLink: ExerciseRow = { ...withoutLink, video_link: "https://example.com/video" };
    expect(withoutLink.video_link).toBeNull();
    expect(withLink.video_link).toContain("https://");
  });

  it("ExerciseRow expõe load_unit e deleted_at anuláveis (contrato da #3)", () => {
    const ativo: ExerciseRow = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Supino reto",
      muscle: "peito",
      video_link: null,
      load_unit: "kg",
      deleted_at: null,
      created_at: "2026-09-12T00:00:00.000Z",
      created_by: "a@example.com",
    };
    // Ativo: sem data de exclusão. Soft delete preenche deleted_at sem remover a linha.
    expect(ativo.deleted_at).toBeNull();
    expect(ativo.load_unit).toBe("kg");

    const excluido: ExerciseRow = {
      ...ativo,
      load_unit: null,
      deleted_at: "2026-10-01T12:00:00.000Z",
    };
    expect(excluido.deleted_at).toBe("2026-10-01T12:00:00.000Z");
    expect(excluido.load_unit).toBeNull();
    // Unidade nasce vazia: é escolhida só na primeira digitação de peso (D10).
    const recemCriado: ExerciseRow = { ...ativo, load_unit: null };
    expect(recemCriado.load_unit).toBeNull();
  });

  it("Exercise expõe os mesmos dados com link e data em camelCase", () => {
    const exercise: Exercise = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Supino reto",
      muscle: "peito",
      videoLink: null,
      loadUnit: null,
      deletedAt: null,
      createdAt: "2026-09-12T00:00:00.000Z",
      created_by: "a@example.com",
    };
    expect(exercise.videoLink).toBeNull();
    expect(exercise.createdAt).toContain("2026");
  });

  it("Exercise carrega loadUnit e deletedAt obrigatórios no domínio", () => {
    const ativo: Exercise = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Supino reto",
      muscle: "peito",
      videoLink: null,
      loadUnit: "lb",
      deletedAt: null,
      createdAt: "2026-09-12T00:00:00.000Z",
      created_by: "a@example.com",
    };
    expect(ativo.loadUnit).toBe("lb");
    expect(ativo.deletedAt).toBeNull();

    const excluido: Exercise = { ...ativo, loadUnit: null, deletedAt: "2026-10-01T12:00:00.000Z" };
    expect(excluido.loadUnit).toBeNull();
    expect(excluido.deletedAt).toBe("2026-10-01T12:00:00.000Z");
  });

  it("LoadUnit aceita apenas kg e lb (unidade por exercício, D38)", () => {
    const unidades: LoadUnit[] = ["kg", "lb"];
    expect(unidades).toEqual(["kg", "lb"]);
    const semUnidade: LoadUnit | null = null;
    expect(semUnidade).toBeNull();
  });

  it("CreateExerciseInput exige nome+músculo com link opcional", () => {
    const minimal: CreateExerciseInput = { name: "Agachamento", muscle: "perna" };
    const withLink: CreateExerciseInput = {
      name: "Agachamento",
      muscle: "perna",
      videoLink: "https://example.com/video",
    };
    expect(minimal.muscle).toBe("perna");
    expect(withLink.videoLink).toContain("https://");
  });

  it("UpdateExerciseInput submete os três campos juntos", () => {
    const update: UpdateExerciseInput = {
      name: "Supino reto",
      muscle: "peito",
      videoLink: null,
    };
    expect(update.name).toBe("Supino reto");
    expect(update.muscle).toBe("peito");
    expect(update.videoLink).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Contrato RED da TASK-001 (Mílon #5) — consumido pela TASK-002.
// Fonte: plan.md §3 (Tipos de domínio: WorkoutExecutionRow/WorkoutExecution
// com início textual obrigatório e fim textual anulável;
// WorkoutExecutionSeriesRow/WorkoutExecutionSeries com os três
// identificadores, posição e retrato de valores anuláveis; nulo do banco vira
// nulo do domínio sem transformação de fuso; nenhum tipo do template muda).
// Estes blocos passam em runtime (import type é apagado) e falham no
// `npx tsc --noEmit` até Hefesto criar os tipos (Expected FAIL pelos nomes).
// ---------------------------------------------------------------------------

describe("Milon 05 TASK-001 — types da execução série a série", () => {
  it("WorkoutExecutionRow representa a linha com início preenchido e fim nulo", () => {
    const aberta: WorkoutExecutionRow = {
      id: "00000000-0000-4000-8000-000000000011",
      workout_id: "11111111-1111-4111-8111-111111111111",
      program_id: "22222222-2222-4222-8222-222222222222",
      started_at: "2026-10-08T10:00:00.000Z",
      finished_at: null,
      created_at: "2026-10-08T10:00:00.000Z",
      created_by: "a@example.com",
    };
    expect(aberta.started_at).toContain("2026");
    expect(aberta.finished_at).toBeNull();
  });

  it("WorkoutExecution expõe início obrigatório e fim anulável em camelCase sem transformar fuso", () => {
    const aberta: WorkoutExecution = {
      id: "00000000-0000-4000-8000-000000000011",
      workoutId: "11111111-1111-4111-8111-111111111111",
      programId: "22222222-2222-4222-8222-222222222222",
      startedAt: "2026-10-08T10:00:00.000Z",
      finishedAt: null,
      createdAt: "2026-10-08T10:00:00.000Z",
      created_by: "a@example.com",
    };
    // Mapeamento preserva o texto do banco (sem transformação de fuso).
    expect(aberta.startedAt).toBe("2026-10-08T10:00:00.000Z");
    expect(aberta.finishedAt).toBeNull();
  });

  it("WorkoutExecutionSeriesRow representa a realizada com retrato anulável", () => {
    const realizada: WorkoutExecutionSeriesRow = {
      id: "00000000-0000-4000-8000-000000000021",
      execution_id: "00000000-0000-4000-8000-000000000011",
      entry_id: "33333333-3333-4333-8333-333333333333",
      series_id: "44444444-4444-4444-8444-444444444444",
      position: 2,
      value: 10,
      load: 40,
      created_at: "2026-10-08T10:01:00.000Z",
      created_by: "a@example.com",
    };
    expect(realizada.position).toBe(2);
    expect(realizada.value).toBe(10);
    expect(realizada.value).not.toBeNull();
    expect(realizada.load).toBe(40);
  });

  it("WorkoutExecutionSeries expõe os três identificadores mais retrato em camelCase", () => {
    const realizada: WorkoutExecutionSeries = {
      id: "00000000-0000-4000-8000-000000000021",
      executionId: "00000000-0000-4000-8000-000000000011",
      entryId: "33333333-3333-4333-8333-333333333333",
      seriesId: "44444444-4444-4444-8444-444444444444",
      position: 2,
      value: 10,
      load: 40,
      createdAt: "2026-10-08T10:01:00.000Z",
      created_by: "a@example.com",
    };
    expect(realizada.executionId).toContain("00000000");
    expect(realizada.seriesId).toContain("44444444");
    expect(realizada.value).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Contrato RED da TASK-013 (Mílon #5, Aditamento 2026-10-10 "valor único +
// lb") — consumido pelas TASK-014/015.
// Fonte: tasks.json TASK-013 + plan.md Aditamento 2026-10-10 §3 (LoadUnit
// kg|lb; série planejada e realizada com coluna única `value`; entrada de
// marcação com valor único) + spec §3.
// Expected: FAIL (fonte única ainda com reps/durationSeconds/libra).
// Leitura da fonte por texto para manter tsc limpo (só runtime FAIL).
// ---------------------------------------------------------------------------

describe("Milon 05 TASK-013 RED — tipos do valor único + lb (D34/D38)", () => {
  function fonteTipos(): string {
    return fs.readFileSync(
      path.resolve(__dirname, "../../../lib/milon/types.ts"),
      "utf8",
    );
  }

  it("LoadUnit é kg|lb na fonte única (nunca libra por extenso)", () => {
    expect(fonteTipos()).toMatch(
      /LoadUnit\s*=\s*['"]kg['"]\s*\|\s*['"]lb['"]/,
    );
  });

  it("série planejada (Row + domínio) carrega a coluna única value", () => {
    expect(fonteTipos()).toMatch(/value:\s*number\s*\|\s*null/);
  });

  it("série realizada + entrada de marcação carregam o valor único", () => {
    const fonte = fonteTipos();
    expect(fonte).toMatch(
      /MarkExecutionSeriesInput[\s\S]*?value:\s*number\s*\|\s*null/,
    );
  });
});

