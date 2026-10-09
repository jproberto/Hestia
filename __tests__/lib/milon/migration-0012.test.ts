import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-001 (Mílon #5, replano 2ª volta) — consumido pela
// TASK-002. Fonte: plan.md §2 (Create: migration-0012 adiciona coluna JSONB
// `snapshot` na tabela `workout_executions`, incremental, registra execução em
// `public.schema_migrations` com nome do arquivo idêntico) + §3 (contrato
// WorkoutExecutionSnapshot: foto congelada persistida na coluna `snapshot`) +
// tasks.json TASK-001 (migration-0012.test.ts lendo o SQL como texto).
//
// O arquivo utils/migrations/migration-0012-milon-execucao-snapshot.sql ainda
// NÃO existe: este teste falha com ENOENT até Hefesto entregá-lo
// (Expected: FAIL — acceptanceCriteria 1 da TASK-001).
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0012-milon-execucao-snapshot.sql";

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

describe("Milon 05 TASK-001 (2ª volta) — migração 0012 da foto congelada", () => {
  it("adiciona a coluna JSONB snapshot na tabela workout_executions", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+public\.workout_executions\s+ADD\s+COLUMN\s+snapshot\s+JSONB/i,
    );
  });

  it("é incremental: não recria nem dropa as tabelas da migração 0011", () => {
    const sql = loadMigrationSql();
    expect(sql).not.toMatch(
      /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.workout_executions/i,
    );
    expect(sql).not.toMatch(
      /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.workout_execution_series/i,
    );
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
  });

  it("não altera colunas existentes nem toca outras tabelas (só ADD COLUMN snapshot)", () => {
    const sql = loadMigrationSql();
    expect(sql).not.toMatch(/ALTER\s+COLUMN/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.workouts/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.workout_entries/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+public\.workout_series/i);
  });

  it("registra a auditoria com script_name idêntico ao nome do arquivo", () => {
    const sql = loadMigrationSql();
    expect(sql).toContain(SCRIPT_NAME);
    expect(sql).toMatch(/INSERT\s+INTO\s+public\.schema_migrations/i);
    expect(sql).toMatch(/ON\s+CONFLICT\s*\(\s*script_name\s*\)\s*DO\s+NOTHING/i);
  });

  it("garante self-bootstrap idempotente de schema_migrations antes da auditoria", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.schema_migrations/i,
    );
    const bootstrapIdx = sql.search(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.schema_migrations/i,
    );
    const auditIdx = sql.search(/INSERT\s+INTO\s+public\.schema_migrations/i);
    expect(bootstrapIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeGreaterThan(bootstrapIdx);
  });
});
