import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-010 (Mílon #5, Aditamento 2026-10-09 "0012 CORRETA").
// Fonte: tasks.json TASK-010 (migration-0012-entry.test.ts) + plan.md
// Aditamento 0012 CORRETA §1 Mudança A + §3 (Modo/Unidade da entry) + D29.
//
// Contrato fixado aqui (nomes que a TASK-011 deve implementar):
// - arquivo NOVO: utils/migrations/migration-0012-milon-entry-mode-unit.sql
//   (mesmo inteiro 0012, slug novo; o arquivo antigo do modo-na-biblioteca
//   é excluído — ver critério de ausência na TASK-011);
// - colunas novas na tabela public.workout_entries (NÃO na biblioteca nem
//   nas séries): modo (texto: repeticao|tempo) + unidade (texto: kg|libra);
// - preenchimento das linhas existentes: modo ausente vira repeticao;
//   unidade ausente copia a unidade da biblioteca do mesmo exercício
//   (public.exercises.load_unit) quando houver, senão kg;
// - restrição de valores permitidos nas duas colunas (CHECK);
// - preenchimento obrigatório com padrões para linhas futuras
//   (DEFAULT 'repeticao' / DEFAULT 'kg');
// - registro em public.schema_migrations com script_name idêntico ao nome
//   do arquivo novo e conflito ignorado pelo nome do script;
// - self-bootstrap idempotente de schema_migrations antes da auditoria.
//
// Expected: FAIL — o arquivo novo ainda não existe (leitura lança ENOENT).
// Hefesto fará GREEN na TASK-011 sem mudar estes testes.
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0012-milon-entry-mode-unit.sql";

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

describe("Milon 05 TASK-010 — migração 0012 correta (modo+unidade na entry)", () => {
  it("adiciona coluna de modo na tabela public.workout_entries", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/ALTER TABLE\s+public\.workout_entries/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+\w*mode\w*/i);
  });

  it("adiciona coluna de unidade na tabela public.workout_entries", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/ALTER TABLE\s+public\.workout_entries/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS\s+\S*(unit|unidade)/i);
  });

  it("restringe o modo da entry aos valores repeticao ou tempo", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/repeticao/i);
    expect(sql).toMatch(/tempo/i);
    expect(sql).toMatch(/CHECK/i);
  });

  it("restringe a unidade da entry aos valores kg ou libra", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/kg/i);
    expect(sql).toMatch(/libra/i);
    expect(sql).toMatch(/CHECK/i);
  });

  it("preenche as linhas existentes: modo ausente vira repeticao", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/UPDATE\s+public\.workout_entries/i);
    expect(sql).toMatch(/repeticao/i);
    expect(sql).toMatch(/IS NULL/i);
  });

  it("preenche as linhas existentes: unidade copia a biblioteca ou kg", () => {
    const sql = loadMigrationSql();
    // Copia public.exercises.load_unit do mesmo exercício...
    expect(sql).toMatch(/public\.exercises/i);
    expect(sql).toMatch(/load_unit/i);
    // ...com fallback para kg quando a biblioteca não tem unidade.
    expect(sql).toMatch(/kg/i);
  });

  it("define padrões para linhas futuras (DEFAULT repeticao / kg)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/DEFAULT\s+'repeticao'/i);
    expect(sql).toMatch(/DEFAULT\s+'kg'/i);
  });

  it("não cria coluna nova na biblioteca nem nas séries", () => {
    const sql = loadMigrationSql();
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.exercises\s+ADD/i);
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.workout_series\s+ADD/i);
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.workouts\s+ADD/i);
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
