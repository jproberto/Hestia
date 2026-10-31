import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-013 (Mílon #5, Aditamento 2026-10-10 "valor único +
// lb + ícones", D38 — substitui a D35).
// Fonte: tasks.json TASK-013 (migration-0014.test.ts) + plan.md Aditamento
// 2026-10-10 §1 Mudança B + §3 (Unidade abreviada no banco, exibição direta)
// + D38 + revisão D35.
//
// Contrato fixado aqui (nomes que a TASK-014 deve implementar):
// - arquivo NOVO: utils/migrations/migration-0014-milon-unidade-lb.sql
//   (inteiro 0014, seguinte ao 0013 do valor único; nunca edita as
//   migrações aplicadas 0009 nem 0012 — regra 7);
// - restrições de valores permitidos de load_unit passam a (kg,lb) nas
//   tabelas public.exercises (coluna legada da 0009) e
//   public.workout_entries (coluna da 0012);
// - conversão dos dados existentes: libra vira lb nas duas tabelas;
// - registro em public.schema_migrations com script_name idêntico ao nome
//   do arquivo novo e conflito ignorado pelo nome do script;
// - self-bootstrap idempotente de schema_migrations antes da auditoria.
//
// Expected: FAIL — o arquivo novo ainda não existe (leitura lança ENOENT).
// Hefesto fará GREEN na TASK-014 sem mudar estes testes.
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0014-milon-unidade-lb.sql";

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

describe("Milon 05 TASK-013 — migração 0014 (unidade lb no banco)", () => {
  it("restringe load_unit a (kg,lb) na tabela public.exercises", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/public\.exercises/i);
    expect(sql).toMatch(/load_unit/i);
    expect(sql).toMatch(/CHECK/i);
    expect(sql).toMatch(/'lb'/);
  });

  it("restringe load_unit a (kg,lb) na tabela public.workout_entries", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/public\.workout_entries/i);
    expect(sql).toMatch(/load_unit/i);
    expect(sql).toMatch(/CHECK/i);
    expect(sql).toMatch(/'lb'/);
  });

  it("converte os dados existentes libra → lb nas duas tabelas", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/UPDATE\s+public\.exercises/i);
    expect(sql).toMatch(/UPDATE\s+public\.workout_entries/i);
    expect(sql).toMatch(/'libra'/);
    expect(sql).toMatch(/'lb'/);
  });

  it("não permite mais libra como valor gravado (só kg ou lb)", () => {
    const sql = loadMigrationSql();
    // A restrição nova cita kg e lb; nenhum CHECK novo deve listar 'libra'
    // como valor permitido.
    const checks = sql.match(/CHECK\s*\([^)]*\)/gi) ?? [];
    expect(checks.length).toBeGreaterThan(0);
    for (const check of checks) {
      if (/load_unit/i.test(check) || /kg/i.test(check)) {
        expect(check).not.toMatch(/'libra'/);
      }
    }
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
