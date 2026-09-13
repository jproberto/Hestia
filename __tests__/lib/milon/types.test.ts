import { describe, it, expect } from "vitest";
// @ts-expect-error — arquivo de produção criado por Hefesto nesta task (RED até existir)
import migrationSql from "@/utils/migrations/migration-0007-milon-exercises.sql?raw";
import type {
  ExerciseRow,
  Exercise,
  CreateExerciseInput,
  UpdateExerciseInput,
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
      created_at: "2026-09-12T00:00:00.000Z",
      created_by: "a@example.com",
    };
    const withLink: ExerciseRow = { ...withoutLink, video_link: "https://example.com/video" };
    expect(withoutLink.video_link).toBeNull();
    expect(withLink.video_link).toContain("https://");
  });

  it("Exercise expõe os mesmos dados com link e data em camelCase", () => {
    const exercise: Exercise = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Supino reto",
      muscle: "peito",
      videoLink: null,
      createdAt: "2026-09-12T00:00:00.000Z",
      created_by: "a@example.com",
    };
    expect(exercise.videoLink).toBeNull();
    expect(exercise.createdAt).toContain("2026");
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
