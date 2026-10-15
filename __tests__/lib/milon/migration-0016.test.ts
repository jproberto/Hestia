import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato da TASK-003 (Mílon 07c, Troca com execução ativa) — teste de
// conteúdo da migração 0016, seguindo o padrão de
// `__tests__/lib/milon/migration-0015.test.ts`.
// Fonte: `plan.md` §"Migrações" (plan.md:138 — arquivo
// utils/migrations/migration-0016-milon-execucao-por-dono.sql: remove o índice
// único parcial por treino da 0011; cria índice único parcial sobre a coluna
// de autoria filtrando só data de encerramento nula; auditoria em
// public.schema_migrations com script_name idêntico ao arquivo e conflito
// ignorado pelo nome do script; bootstrap idempotente; rollback em texto;
// sem backfill) + `tasks.json` TASK-003 (acceptanceCriteria 6) + spec.md R1
// (máximo 1 aberta por dono, global, independente de programa).
//
// EXCEÇÃO DOCUMENTADA (delegação Zeus/Minos TASK-003): se a migração da
// TASK-002 já converge ao plano, este arquivo nasce PASSANDO com evidência —
// não é RED, é cobertura do conteúdo auditado (mesmo regime do teste da 0015,
// que nasceu passando). Evidência em 2026-10-15: o arquivo da TASK-002 contém
// DROP do índice por treino + CREATE do índice por dono + auditoria
// milon-07c + bootstrap (ver asserções abaixo, todas verdes).
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0016-milon-execucao-por-dono.sql";

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

describe("Milon 07c TASK-003 — migração 0016 (execução aberta por dono, R1)", () => {
  it("remove o índice único parcial por treino criado na 0011", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/DROP INDEX IF EXISTS\s+public\.idx_workout_executions_open_unique/i);
  });

  it("cria o índice único parcial por dono sobre created_by filtrando só abertas (finished_at nulo)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS\s+idx_workout_executions_open_by_owner/i,
    );
    expect(sql).toMatch(
      /ON\s+public\.workout_executions\s*\(\s*created_by\s*\)\s*WHERE\s+finished_at\s+IS\s+NULL/i,
    );
  });

  it("não cria tabela nem coluna nova (só índice; sem backfill por YAGNI)", () => {
    const sql = loadMigrationSql();
    expect(sql).not.toMatch(/ADD COLUMN/i);
    expect(sql).not.toMatch(/CREATE TABLE\s+public\.workout_executions/i);
  });

  it("documenta o rollback em texto (remove o índice por dono e recria o por treino)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/DROP INDEX IF EXISTS\s+public\.idx_workout_executions_open_by_owner/i);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS\s+idx_workout_executions_open_unique/i);
    expect(sql).toMatch(/ON\s+public\.workout_executions\s*\(\s*workout_id\s*\)\s*WHERE\s+finished_at\s+IS\s+NULL/i);
  });

  it("registra a auditoria com spec_id milon-07c e script_name idêntico ao arquivo", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/INSERT INTO\s+public\.schema_migrations/i);
    expect(sql).toContain(SCRIPT_NAME);
    expect(sql).toMatch(/milon-07c/);
    expect(sql).toMatch(/ON CONFLICT\s*\(\s*script_name\s*\)\s*DO NOTHING/i);
  });

  it("garante self-bootstrap idempotente de schema_migrations antes da auditoria", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS\s+public\.schema_migrations/i);
    const bootstrapIdx = sql.search(
      /CREATE TABLE IF NOT EXISTS\s+public\.schema_migrations/i,
    );
    const auditIdx = sql.search(/INSERT INTO\s+public\.schema_migrations/i);
    expect(bootstrapIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeGreaterThan(bootstrapIdx);
  });
});
