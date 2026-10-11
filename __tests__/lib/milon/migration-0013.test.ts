import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-013 (Mílon #5, Aditamento 2026-10-10 "valor único +
// lb + ícones", D34).
// Fonte: tasks.json TASK-013 (migration-0013.test.ts) + plan.md Aditamento
// 2026-10-10 §1 Mudança A + §3 (Valor único da série) + D34.
//
// Contrato fixado aqui (nomes que a TASK-014 deve implementar):
// - arquivo NOVO: utils/migrations/migration-0013-milon-series-valor-unico.sql
//   (inteiro 0013, slug de valor único; nunca edita as migrações aplicadas
//   0009/0011/0012);
// - coluna nova `value` (inteira, nula permitida, com restrição de
//   não-negatividade permitindo nulo) nas tabelas public.workout_series
//   (planejadas) e public.workout_execution_series (retrato da execução,
//   paridade template-retrato);
// - preenchimento das linhas existentes pela coalescência das antigas
//   (reps primeiro, tempo como fallback — coerente com o fallback de
//   leitura para repetições);
// - remoção das duas colunas antigas (reps + duration_seconds) nas duas
//   tabelas, no mesmo arquivo;
// - registro em public.schema_migrations com script_name idêntico ao nome
//   do arquivo novo e conflito ignorado pelo nome do script;
// - self-bootstrap idempotente de schema_migrations antes da auditoria.
//
// Expected: FAIL — o arquivo novo ainda não existe (leitura lança ENOENT).
// Hefesto fará GREEN na TASK-014 sem mudar estes testes.
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0013-milon-series-valor-unico.sql";

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

describe("Milon 05 TASK-013 — migração 0013 (coluna única value nas séries)", () => {
  it("adiciona a coluna value na tabela public.workout_series", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/ALTER TABLE\s+public\.workout_series/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+value\b/i);
  });

  it("adiciona a coluna value na tabela public.workout_execution_series (paridade template-retrato)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/ALTER TABLE\s+public\.workout_execution_series/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+value\b/i);
  });

  it("restringe value a não-negativo permitindo nulo", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/CHECK/i);
    expect(sql).toMatch(/value\s+.*>=\s*0|CHECK\s*\([^)]*value[^)]*\)/i);
  });

  it("preenche as linhas existentes pela coalescência das antigas (reps primeiro)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/UPDATE\s+public\.workout_series/i);
    expect(sql).toMatch(/UPDATE\s+public\.workout_execution_series/i);
    expect(sql).toMatch(/COALESCE\s*\(\s*reps/i);
  });

  it("remove as colunas antigas reps e duration_seconds das duas tabelas", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/DROP COLUMN IF EXISTS\s+reps/i);
    expect(sql).toMatch(/DROP COLUMN IF EXISTS\s+duration_seconds/i);
  });

  it("não cria tabela nova nem toca nas migrações aplicadas", () => {
    const sql = loadMigrationSql();
    expect(sql).not.toMatch(/CREATE TABLE\s+public\.workout_series/i);
    expect(sql).not.toMatch(/CREATE TABLE\s+public\.workout_execution_series/i);
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.exercises\s+ADD/i);
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.workout_entries\s+ADD/i);
  });

  it("registra a auditoria com script_name idêntico ao arquivo novo", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/INSERT INTO\s+public\.schema_migrations/i);
    expect(sql).toContain(SCRIPT_NAME);
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
