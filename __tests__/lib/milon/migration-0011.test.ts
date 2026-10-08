import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-001 (Mílon #5) — consumido pela TASK-002.
// Fonte: plan.md §3 (Banco, tabela de execuções + tabela de realizadas) +
// tasks.json TASK-001 (migration-0011.test.ts lendo o SQL como texto).
//
// O arquivo utils/migrations/migration-0011-milon-execucao.sql ainda NÃO
// existe: este teste falha com ENOENT até Hefesto entregá-lo (Expected FAIL).
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0011-milon-execucao.sql";

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

describe("Milon 05 TASK-001 — migração 0011 da execução série a série", () => {
  it("cria as duas tabelas novas de execução e realizadas", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CREATE TABLE/i);
    expect(sql).toMatch(/public\.workout_executions/i);
    expect(sql).toMatch(/public\.workout_execution_series/i);
  });

  it("define as colunas da execução com início obrigatório e fim reservado nulo", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/workout_id.*REFERENCES\s+public\.workouts/i);
    expect(sql).toMatch(/program_id.*REFERENCES\s+public\.programs/i);
    expect(sql).toMatch(/started_at.*TIMESTAMP\s+WITH\s+TIME\s+ZONE.*NOT NULL/i);
    expect(sql).toMatch(/started_at.*DEFAULT\s+now\(\)/i);
    // finished_at existe, é anulável e nunca NOT NULL (reservado à feature 7).
    expect(sql).toMatch(/finished_at\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE/i);
    expect(sql).not.toMatch(/finished_at\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE\s+NOT NULL/i);
    expect(sql).toMatch(/created_at.*DEFAULT\s+now\(\)/i);
    expect(sql).toMatch(/created_by\s+TEXT\s+NOT NULL/i);
  });

  it("define as colunas da realizada com retrato e cascatas do plano", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/execution_id.*REFERENCES\s+public\.workout_executions/i);
    expect(sql).toMatch(/ON DELETE CASCADE/i);
    expect(sql).toMatch(/entry_id.*REFERENCES\s+public\.workout_entries/i);
    expect(sql).toMatch(/series_id.*REFERENCES\s+public\.workout_series/i);
    expect(sql).toMatch(/position\s+INTEGER\s+NOT NULL/i);
    expect(sql).toMatch(/reps\s+INTEGER/i);
    expect(sql).toMatch(/duration_seconds\s+INTEGER/i);
    expect(sql).toMatch(/load\s+NUMERIC/i);
  });

  it("garante no máximo uma execução aberta por treino (índice único parcial)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CREATE UNIQUE INDEX/i);
    expect(sql).toMatch(/workout_executions/i);
    expect(sql).toMatch(/WHERE[\s\S]*finished_at\s+IS\s+NULL/i);
  });

  it("garante unicidade de uma linha por par execução mais série do template", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/execution_id/i);
    expect(sql).toMatch(/series_id/i);
    expect(sql).toMatch(/UNIQUE/i);
  });

  it("habilita RLS com permissão total a autenticados nas duas tabelas", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/ALTER TABLE\s+public\.workout_executions\s+ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(
      /ALTER TABLE\s+public\.workout_execution_series\s+ENABLE ROW LEVEL SECURITY/i,
    );
    expect(sql).toContain("Permitir tudo para autenticados");
    expect(sql).toMatch(/TO authenticated/i);
  });

  it("não cria coluna nova no template (feito nunca vive no template)", () => {
    const sql = loadMigrationSql().toLowerCase();
    expect(sql).not.toMatch(/alter table\s+public\.workouts\s+add/i);
    expect(sql).not.toMatch(/alter table\s+public\.workout_entries\s+add/i);
    expect(sql).not.toMatch(/alter table\s+public\.workout_series\s+add/i);
  });

  it("registra a auditoria milon-05 com script_name idêntico ao arquivo", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/'milon-05'/);
    expect(sql).toMatch(/Execução série a série/);
    expect(sql).toContain(SCRIPT_NAME);
    expect(sql).toMatch(/INSERT INTO\s+public\.schema_migrations/i);
    expect(sql).toMatch(/ON CONFLICT\s*\(\s*script_name\s*\)\s*DO NOTHING/i);
  });

  it("garante self-bootstrap idempotente de schema_migrations antes da auditoria", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS\s+public\.schema_migrations/i);
    const bootstrapIdx = sql.search(/CREATE TABLE IF NOT EXISTS\s+public\.schema_migrations/i);
    const auditIdx = sql.search(/INSERT INTO\s+public\.schema_migrations/i);
    expect(bootstrapIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeGreaterThan(bootstrapIdx);
  });
});
