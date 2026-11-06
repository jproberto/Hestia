import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato da T0 (Pluto 05e, Lançamento com Data Livre) — teste de conteúdo
// RED da migração 0018, no padrão EXATO de
// `__tests__/lib/milon/migration-0017.test.ts`.
// Fontes: `plan.md` §"Migrações" (plan.md:94-110 — número reservado 0018;
// quatro passos ordenados: 1) ADD COLUMN IF NOT EXISTS period_year/period_month
// integer ANULÁVEIS em public.transactions; 2) backfill retroativo copiando
// ano/mês da própria `date` com CONVERSÃO EXPLÍCITA para integer nas
// atribuições, WHERE period_year IS NULL OR period_month IS NULL; 3) SET NOT NULL
// nas duas colunas SOMENTE após o backfill; 4) auditoria com self-bootstrap
// idempotente de public.schema_migrations (CREATE TABLE IF NOT EXISTS + RLS +
// política "Permitir tudo para autenticados", mesmo bloco das migrações
// 0008/0016) e INSERT com spec_id `pluto-05e`, spec_name `Lançamento com Data
// Livre`, script_name idêntico ao nome do arquivo e executed_by
// joaopsroberto@gmail.com, com ON CONFLICT (script_name) DO NOTHING;
// "explicitamente não faz": nenhuma remoção/renomeação de coluna ou tabela,
// nenhuma política RLS nova em transactions, nenhum índice novo; rollback em
// texto no rodapé (DROP COLUMN IF EXISTS das duas colunas); verificação
// pós-aplicação documentada em comentário no próprio script — contagem de
// linhas com mês de cálculo nulo = 0 e soma de amount agrupada por ano/mês de
// `date` antes/depois com diferença zero) + `tasks.json` T0
// (acceptanceCriteria 1-10) + `spec.md` §6 (migração aditiva; auditoria com
// nome idêntico ao arquivo; verificação de saldos por mês).
//
// RED ESPERADO (Gate 3, antes de Hefesto/T1): o arquivo
// utils/migrations/migration-0018-pluto-lancamento-data-livre.sql é produzido
// apenas na T1 e ainda NÃO existe — logo `readFileSync` lança ENOENT e TODOS
// os casos falham pelo motivo certo (arquivo da migração inexistente), sem
// SyntaxError/TS2 no output. Nenhum arquivo de produção é tocado por esta task.
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0018-pluto-lancamento-data-livre.sql";

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

/** Remove comentários de linha (`-- ...`) para as asserções negativas não trocarem em texto de rollback/header. */
function stripSqlComments(sql: string): string {
  return sql
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

/** Extrai apenas o texto de comentários (linhas com `--`), para as consultas de verificação em comentário. */
function extractCommentLines(sql: string): string {
  return sql
    .split(/\r?\n/)
    .filter((line) => line.includes("--"))
    .join("\n");
}

/** Extrai um comando SQL a partir do match até o `;` seguinte (inclusive). */
function extractStatement(sql: string, search: RegExp): string {
  const start = sql.search(search);
  if (start < 0) return "";
  const end = sql.indexOf(";", start);
  return end < 0 ? sql.slice(start) : sql.slice(start, end + 1);
}

describe("Pluto 05e T0 — migração 0018 (lançamento com data livre, mês de cálculo)", () => {
  it("adiciona as colunas period_year e period_month inteiras e anuláveis em public.transactions", () => {
    const sql = loadMigrationSql();
    const addYear = extractStatement(
      sql,
      /ALTER\s+TABLE\s+public\.transactions\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+period_year/i,
    );
    const addMonth = extractStatement(
      sql,
      /ALTER\s+TABLE\s+public\.transactions\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+period_month/i,
    );
    expect(addYear).not.toBe("");
    expect(addMonth).not.toBe("");
    expect(addYear).toMatch(/\binteger\b/i);
    expect(addMonth).toMatch(/\binteger\b/i);
    // Anuláveis na criação: o backfill precisa rodar antes de impor obrigatoriedade
    expect(addYear).not.toMatch(/NOT\s+NULL/i);
    expect(addMonth).not.toMatch(/NOT\s+NULL/i);
  });

  it("faz o backfill pela própria date com conversão explícita para integer, ANTES do SET NOT NULL", () => {
    const sql = loadMigrationSql();
    const backfill = extractStatement(
      sql,
      /UPDATE\s+public\.transactions\s+SET\s+period_year\s*=/i,
    );
    expect(backfill).not.toBe("");
    // Copia ano/mês da própria coluna date (decisão D8)
    expect(backfill).toMatch(
      /period_year\s*=\s*(?:EXTRACT\s*\(\s*YEAR\s+FROM\s+date\s*\)\s*::\s*(?:integer|int)\b|CAST\s*\(\s*EXTRACT\s*\(\s*YEAR\s+FROM\s+date\s*\)\s+AS\s+(?:integer|int)\s*\))/i,
    );
    expect(backfill).toMatch(
      /period_month\s*=\s*(?:EXTRACT\s*\(\s*MONTH\s+FROM\s+date\s*\)\s*::\s*(?:integer|int)\b|CAST\s*\(\s*EXTRACT\s*\(\s*MONTH\s+FROM\s+date\s*\)\s+AS\s+(?:integer|int)\s*\))/i,
    );
    // Só nas linhas ainda sem período calculado (idempotente)
    expect(backfill).toMatch(
      /WHERE\s+period_year\s+IS\s+NULL\s+OR\s+period_month\s+IS\s+NULL/i,
    );
    // Ordem: backfill ANTES da imposição de obrigatoriedade (passos 2 → 3)
    const backfillIdx = sql.search(
      /UPDATE\s+public\.transactions\s+SET\s+period_year\s*=/i,
    );
    const notNullYearIdx = sql.search(
      /ALTER\s+TABLE\s+public\.transactions\s+ALTER\s+COLUMN\s+period_year\s+SET\s+NOT\s+NULL/i,
    );
    const notNullMonthIdx = sql.search(
      /ALTER\s+TABLE\s+public\.transactions\s+ALTER\s+COLUMN\s+period_month\s+SET\s+NOT\s+NULL/i,
    );
    expect(backfillIdx).toBeGreaterThanOrEqual(0);
    expect(notNullYearIdx).toBeGreaterThan(backfillIdx);
    expect(notNullMonthIdx).toBeGreaterThan(backfillIdx);
  });

  it("impõe SET NOT NULL nas duas colunas somente após o backfill", () => {
    const sql = loadMigrationSql();
    const setNotNullYear = extractStatement(
      sql,
      /ALTER\s+TABLE\s+public\.transactions\s+ALTER\s+COLUMN\s+period_year\s+SET\s+NOT\s+NULL/i,
    );
    const setNotNullMonth = extractStatement(
      sql,
      /ALTER\s+TABLE\s+public\.transactions\s+ALTER\s+COLUMN\s+period_month\s+SET\s+NOT\s+NULL/i,
    );
    expect(setNotNullYear).not.toBe("");
    expect(setNotNullMonth).not.toBe("");
    // O SET NOT NULL chega depois do backfill, nunca na criação (ver também o caso anterior sobre ordem)
    const backfillIdx = sql.search(
      /UPDATE\s+public\.transactions\s+SET\s+period_year\s*=/i,
    );
    const notNullYearIdx = sql.search(
      /ALTER\s+TABLE\s+public\.transactions\s+ALTER\s+COLUMN\s+period_year\s+SET\s+NOT\s+NULL/i,
    );
    const notNullMonthIdx = sql.search(
      /ALTER\s+TABLE\s+public\.transactions\s+ALTER\s+COLUMN\s+period_month\s+SET\s+NOT\s+NULL/i,
    );
    expect(notNullYearIdx).toBeGreaterThan(backfillIdx);
    expect(notNullMonthIdx).toBeGreaterThan(backfillIdx);
  });

  it("garante self-bootstrap idempotente de schema_migrations (tabela + RLS + política) antes da auditoria", () => {
    const sql = loadMigrationSql();
    expect(
      sql,
      "CREATE TABLE IF NOT EXISTS public.schema_migrations",
    ).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.schema_migrations/i);
    expect(
      sql,
      "RLS habilitado em public.schema_migrations",
    ).toMatch(
      /ALTER\s+TABLE\s+public\.schema_migrations\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    expect(
      sql,
      'política "Permitir tudo para autenticados" em public.schema_migrations',
    ).toMatch(
      /CREATE\s+POLICY\s+"Permitir tudo para autenticados"\s+ON\s+public\.schema_migrations/i,
    );
    const bootstrapIdx = sql.search(
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.schema_migrations/i,
    );
    const auditIdx = sql.search(/INSERT\s+INTO\s+public\.schema_migrations/i);
    expect(bootstrapIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeGreaterThan(bootstrapIdx);
  });

  it("registra a auditoria com spec_id pluto-05e, spec_name, script_name idêntico ao arquivo, executed_by e ON CONFLICT DO NOTHING", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/INSERT\s+INTO\s+public\.schema_migrations/i);
    expect(sql).toContain(SCRIPT_NAME);
    expect(sql).toMatch(/pluto-05e/);
    expect(sql).toContain("Lançamento com Data Livre");
    expect(sql).toContain("joaopsroberto@gmail.com");
    expect(sql).toMatch(/ON\s+CONFLICT\s*\(\s*script_name\s*\)\s+DO\s+NOTHING/i);
  });

  it("documenta o rollback em texto (DROP COLUMN IF EXISTS das duas colunas, no rodapé)", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+public\.transactions\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+period_year/i,
    );
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+public\.transactions\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+period_month/i,
    );
    // O rollback é só texto: fora de comentários não há DROP algum (ver também as negativas)
    const executable = stripSqlComments(sql);
    expect(executable).not.toMatch(/\bDROP\s+COLUMN\b/i);
  });

  it("documenta em comentário as consultas de verificação (nulos = 0; soma por mês antes/depois com diferença zero)", () => {
    const comments = extractCommentLines(loadMigrationSql());
    // Contagem de transactions com period_year ou period_month nulo deve ser zero
    expect(comments).toMatch(/count\s*\(/i);
    expect(comments).toMatch(/period_year\s+IS\s+NULL/i);
    expect(comments).toMatch(/period_month\s+IS\s+NULL/i);
    expect(comments).toMatch(/=\s*0\b|deve ser\s+(?:0|zero)|\bzero\b/i);
    // Soma de amount agrupada por ano/mês de date, comparada antes e depois do backfill
    expect(comments).toMatch(/sum\s*\(\s*amount\s*\)/i);
    expect(comments).toMatch(/EXTRACT\s*\(\s*YEAR\s+FROM\s+date\s*\)/i);
    expect(comments).toMatch(/EXTRACT\s*\(\s*MONTH\s+FROM\s+date\s*\)/i);
    expect(comments).toMatch(/group\s+by/i);
    expect(comments).toMatch(/antes/i);
    expect(comments).toMatch(/depois/i);
    expect(comments).toMatch(/diferen[çc]a/i);
  });

  it("asserções negativas: nenhuma remoção ou renomeação de coluna/tabela existente (rollback só em comentário)", () => {
    const sql = stripSqlComments(loadMigrationSql());
    expect(sql).not.toMatch(/\bDROP\s+(?:TABLE|COLUMN)\b/i);
    expect(sql).not.toMatch(/\bRENAME\b/i);
  });

  it("asserções negativas: nenhuma política RLS nova em transactions e nenhum índice novo", () => {
    const sql = stripSqlComments(loadMigrationSql());
    // RLS de transactions intocado (nenhuma política nova, nenhum ENABLE/DROP de política)
    expect(sql).not.toMatch(
      /CREATE\s+POLICY\b[^;]*ON\s+public\.transactions/i,
    );
    expect(sql).not.toMatch(
      /ALTER\s+TABLE\s+public\.transactions\s+(?:ENABLE|DISABLE)\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    expect(sql).not.toMatch(/DROP\s+POLICY\b[^;]*ON\s+public\.transactions/i);
    // Nenhum índice novo em lugar nenhum (bootstrap de schema_migrations não cria índice; tabela doméstica — YAGNI)
    expect(sql).not.toMatch(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i);
  });
});
