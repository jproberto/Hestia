import { describe, it, expect } from "vitest";
// @ts-expect-error — arquivo de produção criado por Hefesto nesta task (RED até existir)
import migrationSql from "@/utils/migrations/migration-milon-01-exercises.sql?raw";
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
