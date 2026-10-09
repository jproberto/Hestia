import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-006 (Mílon #5, aditamento 2026-10-09 dos 3 achados).
// Fonte: tasks.json TASK-006 (migration-0013.test.ts) + plan.md Aditamento
// 2026-10-09 §1 Mudança A + §3 (Modo do exercício) + D25.
//
// Contrato fixado aqui (nomes que a TASK-007 deve implementar):
// - arquivo: utils/migrations/migration-0013-milon-exercise-mode.sql
// - coluna nova na tabela public.exercises, textual, com "mode" no nome
//   (ex.: exercise_mode), valores permitidos repeticao ou tempo, nula
//   permitida (linhas antigas sem modo; leitura com fallback repetição);
// - NENHUMA coluna nova nas séries ("valor único" é interface + escrita,
//   D26 — o teste trava isso);
// - registro em public.schema_migrations com script_name idêntico ao nome
//   do arquivo e conflito ignorado pelo nome do script;
// - inteiro 0012 NÃO reutilizado (D25).
//
// O arquivo ainda NÃO existe: este teste falha com ENOENT até Hefesto
// entregá-lo (Expected: FAIL). Nenhum arquivo de produção alterado.
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0013-milon-exercise-mode.sql";

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

describe("Milon 05 TASK-006 — migração 0013 do modo do exercício", () => {
  it("adiciona coluna textual de modo na tabela public.exercises", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/ALTER TABLE\s+public\.exercises/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+\w*mode\w*/i);
  });

  it("restringe o modo aos valores permitidos repeticao ou tempo", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/repeticao/i);
    expect(sql).toMatch(/tempo/i);
    expect(sql).toMatch(/CHECK/i);
  });

  it("permite modo nulo para as linhas antigas (sem NOT NULL na coluna)", () => {
    const sql = loadMigrationSql();
    const lines = sql
      .split("\n")
      .filter((line) => /mode/i.test(line) && /add column/i.test(line));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toMatch(/NOT NULL/i);
    }
  });

  it("não cria coluna nova nas séries (valor único é interface + escrita, D26)", () => {
    const sql = loadMigrationSql().toLowerCase();
    expect(sql).not.toMatch(/alter table\s+public\.workout_series\s+add/i);
    expect(sql).not.toMatch(/alter table\s+public\.workout_entries\s+add/i);
    expect(sql).not.toMatch(/alter table\s+public\.workouts\s+add/i);
  });

  it("não reutiliza o inteiro 0012 (D25)", () => {
    const sql = loadMigrationSql();
    expect(sql).not.toMatch(/migration-0012/i);
  });

  it("registra a auditoria com script_name idêntico ao arquivo", () => {
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
