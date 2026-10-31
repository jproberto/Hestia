import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato da TASK-001 (Mílon 06, Timer de descanso auto + PWA push) — teste de
// conteúdo RED da migração 0017, no padrão EXATO de
// `__tests__/lib/milon/migration-0016.test.ts`.
// Fontes: `plan.md` §"Migrações" (plan.md:274-285 — estrutura textual exata:
// 1) public.push_subscriptions com id UUID PK default gen_random_uuid, endpoint
// TEXT NOT NULL UNIQUE, p256dh/auth TEXT NOT NULL, created_at e created_by;
// 2) public.rest_push_schedules com id UUID PK (uuid do cliente),
// subscription_id NOT NULL REFERENCES push_subscriptions (id) ON DELETE
// CASCADE, duration_seconds INTEGER NOT NULL, fire_at NOT NULL, status TEXT NOT
// NULL DEFAULT 'agendado' com CHECK restrito a agendado/enviado/cancelado/erro,
// sent_at anulável, created_at e created_by; 3) RLS padrão do módulo
// (ENABLE ROW LEVEL SECURITY + política "Permitir tudo para autenticados") nas
// duas; 4) índices idx_rest_push_schedules_owner_status (created_by, status) e
// idx_rest_push_schedules_subscription (subscription_id); 5) rollback em texto
// com DROP das duas tabelas na ordem schedules → subscriptions (FK); 6)
// self-bootstrap idempotente de schema_migrations antes da auditoria, com
// spec_id milon-06, spec_name "Timer de descanso auto + PWA push", script_name
// idêntico ao arquivo, executed_by joaopsroberto@gmail.com e ON CONFLICT
// (script_name) DO NOTHING; backfill vazio) + `tasks.json` TASK-001
// (acceptanceCriteria 1-10) + spec.md §3 ("Nenhuma escrita em
// workout_executions, workout_execution_series ou template por conta do timer
// nem do agendamento. As tabelas tocadas são só as da migração 0017") e §6
// (0017 é a única migração nova, sem alteração de tabelas existentes).
//
// RED ESPERADO (Fase 1, antes de Hefesto): o arquivo
// utils/migrations/migration-0017-milon-timer-descanso-push.sql é produzido
// apenas na TASK-002 e ainda NÃO existe — logo `readFileSync` lança ENOENT e
// TODOS os casos falham pelo motivo certo (arquivo da migração inexistente).
// Nenhum arquivo de produção é tocado por esta task.
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0017-milon-timer-descanso-push.sql";

// Tabelas existentes de execução/template que a 0017 NÃO pode alterar
// (plan.md §"Migrações" parágrafo final + spec.md §3/§6).
const EXISTING_TABLES = [
  "workout_executions",
  "workout_execution_series",
  "workout_entries",
  "workout_series",
  "workouts",
  "programs",
  "exercises",
];

function loadMigrationSql(): string {
  const file = path.resolve(
    __dirname,
    "../../../utils/migrations",
    SCRIPT_NAME,
  );
  return fs.readFileSync(file, "utf8");
}

/** Extrai o bloco `CREATE TABLE IF NOT EXISTS public.<table> (...)` contando parênteses. */
function extractCreateTableBlock(sql: string, tableName: string): string {
  const start = sql.search(
    new RegExp(
      `CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+public\\.${tableName}\\s*\\(`,
      "i",
    ),
  );
  if (start < 0) return "";
  const open = sql.indexOf("(", start);
  let depth = 0;
  for (let i = open; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return sql.slice(start, i + 1);
    }
  }
  return sql.slice(start);
}

/** Remove comentários de linha (`-- ...`) para as asserções negativas não trocalem em texto de rollback/header. */
function stripSqlComments(sql: string): string {
  return sql
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

describe("Milon 06 TASK-001 — migração 0017 (assinaturas e agendamentos de push)", () => {
  it("cria a tabela public.push_subscriptions com id, endpoint NOT NULL UNIQUE, p256dh, auth, created_at e created_by", () => {
    const sql = loadMigrationSql();
    const block = extractCreateTableBlock(sql, "push_subscriptions");
    expect(block).not.toBe("");
    // id UUID PRIMARY KEY DEFAULT gen_random_uuid()
    expect(block).toMatch(/id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i);
    // endpoint TEXT NOT NULL com UNIQUE (inline ou constraint de tabela)
    expect(block).toMatch(/endpoint\s+TEXT\s+NOT\s+NULL/i);
    const endpointUnique =
      /endpoint\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(block) ||
      /UNIQUE\s*\(\s*endpoint\s*\)/i.test(block) ||
      /CONSTRAINT\s+\w+\s+UNIQUE\s*\(\s*endpoint\s*\)/i.test(block);
    expect(endpointUnique).toBe(true);
    // chaves da assinatura
    expect(block).toMatch(/p256dh\s+TEXT\s+NOT\s+NULL/i);
    expect(block).toMatch(/auth\s+TEXT\s+NOT\s+NULL/i);
    // autoria
    expect(block).toMatch(/created_at\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE\s+DEFAULT\s+now\(\)\s+NOT\s+NULL/i);
    expect(block).toMatch(/created_by\s+TEXT\s+NOT\s+NULL/i);
  });

  it("cria a tabela public.rest_push_schedules com id UUID, subscription_id NOT NULL com FK em cascata, duration_seconds e fire_at", () => {
    const sql = loadMigrationSql();
    const block = extractCreateTableBlock(sql, "rest_push_schedules");
    expect(block).not.toBe("");
    // id UUID PRIMARY KEY (uuid gerado no cliente — default aceito, mas a PK é obrigatória)
    expect(block).toMatch(/id\s+UUID\s+PRIMARY\s+KEY/i);
    // FK em cascata para a assinatura
    expect(block).toMatch(
      /subscription_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.push_subscriptions\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i,
    );
    // duração e instante de disparo
    expect(block).toMatch(/duration_seconds\s+INTEGER\s+NOT\s+NULL/i);
    expect(block).toMatch(/fire_at\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE\s+NOT\s+NULL/i);
    // autoria
    expect(block).toMatch(/created_at\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE\s+DEFAULT\s+now\(\)\s+NOT\s+NULL/i);
    expect(block).toMatch(/created_by\s+TEXT\s+NOT\s+NULL/i);
  });

  it("restringe status com CHECK aos quatro valores (agendado/enviado/cancelado/erro), default agendado e sent_at anulável", () => {
    const sql = loadMigrationSql();
    const block = extractCreateTableBlock(sql, "rest_push_schedules");
    expect(block).not.toBe("");
    // status TEXT NOT NULL DEFAULT 'agendado'
    expect(block).toMatch(/status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'agendado'/i);
    // CHECK restrito aos quatro valores do plan §Migrações item 2
    const checkIdx = block.search(/CHECK\s*\(/i);
    expect(checkIdx).toBeGreaterThanOrEqual(0);
    const checkClause = block.slice(checkIdx);
    expect(checkClause).toContain("'agendado'");
    expect(checkClause).toContain("'enviado'");
    expect(checkClause).toContain("'cancelado'");
    expect(checkClause).toContain("'erro'");
    // sent_at TIMESTAMP WITH TIME ZONE anulável (sem NOT NULL)
    const sentAtLine =
      block.match(/sent_at\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE[^,\n]*/i)?.[0] ?? "";
    expect(sentAtLine).not.toBe("");
    expect(sentAtLine).not.toMatch(/NOT\s+NULL/i);
  });

  it("habilita RLS e cria a política 'Permitir tudo para autenticados' nas duas tabelas novas", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+public\.push_subscriptions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+"Permitir tudo para autenticados"\s+ON\s+public\.push_subscriptions/i,
    );
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+public\.rest_push_schedules\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+"Permitir tudo para autenticados"\s+ON\s+public\.rest_push_schedules/i,
    );
  });

  it("cria os índices (created_by, status) e (subscription_id) em rest_push_schedules", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(
      /CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+idx_rest_push_schedules_owner_status\s+ON\s+public\.rest_push_schedules\s*\(\s*created_by\s*,\s*status\s*\)/i,
    );
    expect(sql).toMatch(
      /CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+idx_rest_push_schedules_subscription\s+ON\s+public\.rest_push_schedules\s*\(\s*subscription_id\s*\)/i,
    );
  });

  it("documenta o rollback em texto com DROP das duas tabelas (schedules antes de subscriptions, por causa da FK)", () => {
    const sql = loadMigrationSql();
    const dropSchedules = sql.indexOf(
      "DROP TABLE IF EXISTS public.rest_push_schedules",
    );
    const dropSubscriptions = sql.indexOf(
      "DROP TABLE IF EXISTS public.push_subscriptions",
    );
    expect(dropSchedules).toBeGreaterThanOrEqual(0);
    expect(dropSubscriptions).toBeGreaterThanOrEqual(0);
    // schedules ANTES de subscriptions (a FK de schedules aponta para subscriptions)
    expect(dropSubscriptions).toBeGreaterThan(dropSchedules);
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

  it("registra a auditoria com spec_id milon-06, script_name idêntico ao arquivo, executed_by e ON CONFLICT DO NOTHING", () => {
    const sql = loadMigrationSql();
    expect(sql).toMatch(/INSERT INTO\s+public\.schema_migrations/i);
    expect(sql).toContain(SCRIPT_NAME);
    expect(sql).toMatch(/milon-06/);
    expect(sql).toContain("Timer de descanso auto + PWA push");
    expect(sql).toContain("joaopsroberto@gmail.com");
    expect(sql).toMatch(/ON CONFLICT\s*\(\s*script_name\s*\)\s+DO NOTHING/i);
  });

  it("asserções negativas: nenhum ADD COLUMN em nenhuma tabela (backfill vazio, tabelas só novas)", () => {
    const sql = stripSqlComments(loadMigrationSql());
    expect(sql).not.toMatch(/\bADD\s+COLUMN\b/i);
  });

  it("asserções negativas: nenhum ALTER TABLE, DROP ou CREATE INDEX sobre as tabelas existentes de execução/template", () => {
    const sql = stripSqlComments(loadMigrationSql());
    for (const table of EXISTING_TABLES) {
      const ddl = new RegExp(
        `\\b(?:ALTER\\s+TABLE|DROP\\s+(?:TABLE|COLUMN|INDEX)|CREATE\\s+(?:UNIQUE\\s+)?INDEX)\\b[^;]*?${table}`,
        "i",
      );
      expect(sql, `nenhuma DDL de alteração sobre public.${table}`).not.toMatch(
        ddl,
      );
    }
  });
});
