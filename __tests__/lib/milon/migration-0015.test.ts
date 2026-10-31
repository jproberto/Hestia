import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato da TASK-002 (Mílon 07b, Aditamento "ordem própria dos treinos").
// Fonte: plan.md §"Migrações" (migração 0015 — DDL, backfill, índice,
// rollback em texto, auditoria) + tasks.json TASK-002 (acceptanceCriteria:
// "auditoria script_name idêntico a migration-0015-milon-workout-position.sql").
//
// EXCEÇÃO DOCUMENTADA AO RED (delegação Zeus/Minos TASK-003 + pendência da
// TASK-002): Hefesto já implementou o SQL em
// utils/migrations/migration-0015-milon-workout-position.sql na TASK-002 sem
// que Minos tivesse escrito este teste na TASK-001. Este arquivo nasce
// PASSANDO — não é RED, é cobertura retroativa da migração. Os 2 arquivos de
// hooks da TASK-003 seguem RED de verdade (falham pelo motivo certo).
//
// Contrato fixado aqui (o que a migração 0015 deve conter):
// - arquivo: utils/migrations/migration-0015-milon-workout-position.sql
//   (inteiro 0015, seguinte ao 0014; nunca edita migração aplicada — regra 7);
// - DDL: coluna position inteira ANULÁVEL em public.workouts (DDLT1: anulável
//   para aplicar sobre base com treinos sem violar restrição);
// - backfill: numeração sequencial a partir de 1 dentro de cada programa,
//   ordenando por created_at asc + id asc; cobre todas as linhas;
// - índice por (program_id, position) para a leitura ordenada;
// - rollback em texto (remoção do índice + da coluna, só onde a 0015 ainda
//   não foi promovida);
// - registro em public.schema_migrations com spec_id milon-07b e script_name
//   idêntico ao nome do arquivo, com conflito ignorado pelo nome do script;
// - self-bootstrap idempotente de schema_migrations antes da auditoria;
// - idempotência: reexecução recalcula os mesmos valores (determinístico).
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0015-milon-workout-position.sql";

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

describe("Milon 07b TASK-002 — migração 0015 (posição do treino no programa)", () => {
  it("adiciona a coluna position anulável em public.workouts de forma idempotente", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/ALTER TABLE\s+public\.workouts/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+position/i);
    expect(sql).toMatch(/INTEGER/i);
    // Anulável (DDLT1): sem NOT NULL na adição — aplica sobre base com treinos
    const addColumn = sql.match(/ADD COLUMN IF NOT EXISTS\s+position[^\n;]*/i)?.[0] ?? "";
    expect(addColumn).not.toMatch(/NOT NULL/i);
  });

  it("preenche o backfill com sequência por programa ordenada por criação (determinístico e idempotente)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/UPDATE\s+public\.workouts/i);
    expect(sql).toMatch(/PARTITION BY\s+program_id/i);
    expect(sql).toMatch(/ROW_NUMBER/i);
    expect(sql).toMatch(/ORDER BY\s+created_at\s+ASC/i);
    // Desempate por id garante o mesmo valor em reexecução (idempotente)
    expect(sql).toMatch(/id\s+ASC/i);
  });

  it("cria o índice de leitura por programa mais posição de forma idempotente", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS\s+idx_workouts_program_position/i);
    expect(sql).toMatch(/ON\s+public\.workouts\s*\(\s*program_id\s*,\s*position\s*\)/i);
  });

  it("documenta o rollback em texto (índice + coluna, só onde a 0015 não foi promovida)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/DROP INDEX IF EXISTS/i);
    expect(sql).toMatch(/DROP COLUMN IF EXISTS\s+position/i);
  });

  it("registra a auditoria com spec_id milon-07b e script_name idêntico ao arquivo", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/INSERT INTO\s+public\.schema_migrations/i);
    expect(sql).toContain(SCRIPT_NAME);
    expect(sql).toMatch(/milon-07b/);
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
