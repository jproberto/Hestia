import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato da T0 (Pluto 11, Categorias e Contas sem Distinção de Caixa e
// Acentos) — teste de conteúdo RED da migração 0019, no padrão EXATO de
// `__tests__/lib/pluto/migration-0018.test.ts`.
// Fontes: `tasks.json` T0 (acceptanceCriteria 1-12), `spec.md` §5 (regras
// R8-R10) e §6 (migração) + `plan.md` §"Migrações" (número reservado 0019;
// ordem obrigatória: 1) tentativa de habilitar unaccent com aborto claro —
// D15; 2) fusão de categories (sobrevivente = maior contagem de apontadores
// em transactions + budget_items + checklist_items, desempate menor
// created_at — D3/D18; em budget_items a colidente da perdedora é descartada,
// prevalece a linha da sobrevivente, não é somada — R9) com reapontamento dos
// quatro ponteiros (transactions.category_id, budget_items.category_id,
// checklist_items.category_id, transactions.account_id) ANTES dos DELETE das
// perdedoras (D9/R9); 3) fusão de financial_accounts (contagem via
// transactions.account_id); 4) troca das travas: DROP das travas de nome
// único (categories_name_key / financial_accounts_name_key) + CREATE UNIQUE
// INDEX de (nome normalizado, type) nas duas tabelas (D10/D19), DEPOIS de
// toda a fusão (D11); 5) auditoria com self-bootstrap idempotente de
// public.schema_migrations e INSERT com script_name idêntico ao arquivo,
// spec_id `pluto-11`, spec_name `Categorias e Contas sem Distinção de Caixa e
// Acentos`, executed_by joaopsroberto@gmail.com e ON CONFLICT (script_name)
// DO NOTHING; 6) commit só no fim (transação própria, tudo ou nada — D16);
// rollback em comentário no rodapé (remover índices novos, recriar as travas
// de nome originais; fusão irreversível — D9); verificações pós-aplicação
// documentadas em comentário; "explicitamente não faz": fora de comentários
// nenhum DROP TABLE / DROP COLUMN / RENAME e nenhuma política RLS nova em
// nenhuma tabela além do próprio bootstrap de schema_migrations).
//
// RED ESPERADO (Gate 3, antes de Hefesto/T1): o arquivo
// utils/migrations/migration-0019-pluto-categorias-contas-normalizadas.sql é
// produzido apenas na T1 e ainda NÃO existe — logo `readFileSync` lança
// ENOENT e TODOS os casos falham pelo motivo certo (arquivo da migração
// inexistente), sem SyntaxError/TS2 no output. Nenhum arquivo de produção é
// tocado por esta task (acceptanceCriteria 12 — apenas este teste é criado).
// ---------------------------------------------------------------------------

const SCRIPT_NAME = "migration-0019-pluto-categorias-contas-normalizadas.sql";

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

/** Extrai todos os comandos SQL que casam com o regex, cada um até o `;` seguinte (inclusive). */
function extractStatements(sql: string, search: RegExp): string[] {
  const flags = search.flags.includes("g") ? search.flags : `${search.flags}g`;
  const re = new RegExp(search.source, flags);
  const out: string[] = [];
  let match: RegExpExecArray | null = re.exec(sql);
  while (match !== null) {
    const end = sql.indexOf(";", match.index);
    out.push(end < 0 ? sql.slice(match.index) : sql.slice(match.index, end + 1));
    re.lastIndex = match.index + Math.max(match[0].length, 1);
    match = re.exec(sql);
  }
  return out;
}

/** True se, depois da última linha executável (código fora de comentário), existe alguma linha de comentário casando com o padrão (rodapé). */
function hasFooterAfterExecutable(sql: string, pattern: RegExp): boolean {
  const lines = sql.split(/\r?\n/);
  let lastExecLine = -1;
  lines.forEach((line, index) => {
    if (line.replace(/--.*$/, "").trim() !== "") lastExecLine = index;
  });
  return lines
    .slice(lastExecLine + 1)
    .some((line) => pattern.test(line));
}

/**
 * D15 sem plano B: nenhum handler `EXCEPTION WHEN` que não volte a lançar —
 * nada pode engolir a falha da indisponibilidade do unaccent (a falha deve
 * abortar a transação inteira, falha alta).
 */
function hasSilentExceptionHandler(sql: string): boolean {
  const matches = [...sql.matchAll(/EXCEPTION\s+WHEN[\s\S]*?THEN/gi)];
  return matches.some((match) => {
    const start = (match.index ?? 0) + match[0].length;
    const after = sql.slice(start, start + 600);
    const endIdx = after.search(/\bEND\b/i);
    const handler = endIdx >= 0 ? after.slice(0, endIdx) : after;
    return !/\bRAISE\b/i.test(handler);
  });
}

/** Índice da tentativa de habilitar o unaccent (extensão ou função) fora de comentários; -1 se ausente. */
function unaccentAttemptIndex(executable: string): number {
  return executable.search(
    /CREATE\s+EXTENSION[\s\S]{0,200}?unaccent|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[\s\S]{0,400}?unaccent/i,
  );
}

describe("Pluto 11 T0 — migração 0019 (categorias e contas sem distinção de caixa/acento)", () => {
  it("abre transação própria e só confirma no final — tudo ou nada (D16, critério 2)", () => {
    const sql = loadMigrationSql();
    const executable = stripSqlComments(sql);
    const beginIdx = executable.search(/\bBEGIN\s*;|\bSTART\s+TRANSACTION\b/i);
    expect(
      beginIdx,
      "abertura de transação fora de comentários (BEGIN/START TRANSACTION)",
    ).toBeGreaterThanOrEqual(0);
    // Exatamente uma confirmação, fora de comentários
    const commits = executable.match(/\bCOMMIT\b/gi) ?? [];
    expect(commits, "apenas um COMMIT fora de comentários").toHaveLength(1);
    const commitIdx = executable.search(/\bCOMMIT\b/i);
    // A transação abre antes de qualquer mutação (inclusive a tentativa de unaccent)
    const firstMutation = executable.search(
      /CREATE\s+EXTENSION|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION|ALTER\s+TABLE|UPDATE\s+public|DELETE\s+FROM|CREATE\s+UNIQUE\s+INDEX|INSERT\s+INTO/i,
    );
    expect(firstMutation).toBeGreaterThan(beginIdx);
    // E confirma somente depois da auditoria (a auditoria participa da mesma transação)
    const auditIdx = executable.search(
      /INSERT\s+INTO\s+public\.schema_migrations/i,
    );
    expect(auditIdx, "auditoria fora de comentários").toBeGreaterThanOrEqual(0);
    expect(commitIdx).toBeGreaterThan(auditIdx);
    // Sem ROLLBACK executável: o desfazer é automático em caso de falha (D16)
    expect(executable, "nenhum ROLLBACK explícito executável").not.toMatch(
      /\bROLLBACK\b/i,
    );
  });

  it("tenta habilitar o unaccent com erro claro ANTES de qualquer trava nova e sem plano B (D15, critério 3)", () => {
    const sql = loadMigrationSql();
    const executable = stripSqlComments(sql);
    const attemptIdx = unaccentAttemptIndex(executable);
    expect(
      attemptIdx,
      "tentativa de habilitar a função de remover acento (unaccent) fora de comentários",
    ).toBeGreaterThanOrEqual(0);
    // Aborto com erro claro (falha alta): a indisponibilidade lança erro e derruba a transação
    expect(
      executable,
      "RAISE EXCEPTION = erro claro/aborto quando o unaccent falta",
    ).toMatch(/RAISE\s+EXCEPTION/i);
    // Ordem: a tentativa vem antes de qualquer DROP da trava antiga e de qualquer índice único novo
    const firstLockSwap = Math.min(
      ...[
        executable.search(
          /DROP\s+(?:CONSTRAINT|INDEX)\s+(?:IF\s+EXISTS\s+)?categories_name_key/i,
        ),
        executable.search(
          /DROP\s+(?:CONSTRAINT|INDEX)\s+(?:IF\s+EXISTS\s+)?financial_accounts_name_key/i,
        ),
        executable.search(/CREATE\s+UNIQUE\s+INDEX/i),
      ].filter((index) => index >= 0),
    );
    expect(firstLockSwap).toBeGreaterThan(attemptIdx);
    // Sem plano B: nenhuma trava nova criada sem a normalização de acento
    expect(executable).toMatch(/unaccent/i);
    expect(
      hasSilentExceptionHandler(executable),
      "nenhum handler EXCEPTION WHEN silencioso que engule a falha do unaccent",
    ).toBe(false);
  });

  it("reaponta os quatro ponteiros ANTES de qualquer exclusão (R9/D18, critério 4)", () => {
    const executable = stripSqlComments(loadMigrationSql());
    const pointers: Array<[string, RegExp]> = [
      [
        "transactions.category_id",
        /UPDATE\s+public\.transactions(?:\s+(?:AS\s+)?\w+)?\s+SET\s*\(?\s*category_id\s*\)?\s*=/i,
      ],
      [
        "budget_items.category_id",
        /UPDATE\s+public\.budget_items(?:\s+(?:AS\s+)?\w+)?\s+SET\s*\(?\s*category_id\s*\)?\s*=/i,
      ],
      [
        "checklist_items.category_id",
        /UPDATE\s+public\.checklist_items(?:\s+(?:AS\s+)?\w+)?\s+SET\s*\(?\s*category_id\s*\)?\s*=/i,
      ],
      [
        "transactions.account_id",
        /UPDATE\s+public\.transactions(?:\s+(?:AS\s+)?\w+)?\s+SET\s*\(?\s*account_id\s*\)?\s*=/i,
      ],
    ];
    const deletePatterns: Array<[string, RegExp]> = [
      ["budget_items (descarte de colidente)", /DELETE\s+FROM\s+public\.budget_items/i],
      ["categories (perdedoras)", /DELETE\s+FROM\s+public\.categories/i],
      ["financial_accounts (perdedoras)", /DELETE\s+FROM\s+public\.financial_accounts/i],
    ];
    for (const [label, updateRe] of pointers) {
      const updateIdx = executable.search(updateRe);
      expect(updateIdx, `UPDATE de ${label} fora de comentários`).toBeGreaterThanOrEqual(
        0,
      );
      for (const [delLabel, deleteRe] of deletePatterns) {
        const deleteIdx = executable.search(deleteRe);
        expect(deleteIdx, `DELETE em ${delLabel} existe`).toBeGreaterThanOrEqual(0);
        expect(
          deleteIdx,
          `${label} é reapontado antes do DELETE em ${delLabel}`,
        ).toBeGreaterThan(updateIdx);
      }
    }
  });

  it("escolhe a sobrevivente por contagem dos três apontadores, ordem decrescente e desempate por menor created_at; contas via transactions.account_id (D3/D18, critério 5)", () => {
    const executable = stripSqlComments(loadMigrationSql());
    // Contagem em CÓDIGO (não só nas consultas de verificação em comentário)
    expect(executable, "contagem fora de comentários").toMatch(/count\s*\(/i);
    // A seleção das categorias referencia as três tabelas apontadoras antes do DELETE das perdedoras
    const firstCount = executable.search(/count\s*\(/i);
    const firstDelCategories = executable.search(
      /DELETE\s+FROM\s+public\.categories/i,
    );
    expect(firstDelCategories).toBeGreaterThan(firstCount);
    const selection = executable.slice(firstCount, firstDelCategories);
    expect(selection, "contagem inclui transactions").toMatch(/category_id/i);
    expect(selection, "contagem inclui budget_items").toMatch(/budget_items/i);
    expect(selection, "contagem inclui checklist_items (3º ponteiro, D18)").toMatch(
      /checklist_items/i,
    );
    // Ordem decrescente da contagem com desempate pelo menor created_at (mais antiga)
    expect(selection, "ordenação na seleção").toMatch(/order\s+by/i);
    expect(selection, "contagem em ordem decrescente").toMatch(/\bdesc\b/i);
    expect(selection, "desempate por created_at").toMatch(/created_at/i);
    expect(
      selection,
      "desempate = menor created_at (ASC); created_at DESC escolheria a mais nova",
    ).not.toMatch(/created_at\s+desc/i);
    // Para financial_accounts a contagem usa transactions.account_id (único referenciador)
    const countMatches = [...executable.matchAll(/count\s*\(/gi)];
    const accountWindow = countMatches
      .map((match) => {
        const index = match.index ?? 0;
        return executable.slice(Math.max(0, index - 500), index + 500);
      })
      .find((window) => /account_id/.test(window));
    expect(
      accountWindow,
      "há uma contagem perto de transactions.account_id",
    ).toBeDefined();
    expect(accountWindow ?? "", "contagem de contas usa account_id").toMatch(
      /account_id/i,
    );
    expect(accountWindow ?? "", "contagem de contas em ordem decrescente").toMatch(
      /\bdesc\b/i,
    );
    expect(accountWindow ?? "", "desempate de contas por created_at").toMatch(
      /created_at/i,
    );
    expect(
      accountWindow ?? "",
      "desempate de contas = menor created_at",
    ).not.toMatch(/created_at\s+desc/i);
  });

  it("descarta em public.budget_items as colidentes da perdedora ANTES de excluir as perdedoras, com comentário de que prevalece a sobrevivente (não é somada) (R9, critério 6)", () => {
    const sql = loadMigrationSql();
    const executable = stripSqlComments(sql);
    const delBudgetIdx = executable.search(
      /DELETE\s+FROM\s+public\.budget_items/i,
    );
    const delCategoriesIdx = executable.search(
      /DELETE\s+FROM\s+public\.categories/i,
    );
    expect(
      delBudgetIdx,
      "DELETE de descarte em public.budget_items fora de comentários",
    ).toBeGreaterThanOrEqual(0);
    expect(
      delCategoriesIdx,
      "DELETE das perdedoras em public.categories vem depois do descarte",
    ).toBeGreaterThan(delBudgetIdx);
    // Comentário: em colisão prevalece a linha da sobrevivente — a da perdedora é descartada, não somada
    const comments = extractCommentLines(sql);
    expect(comments, "comentário: prevalece a linha da sobrevivente").toMatch(
      /prevalece/i,
    );
    expect(comments, "comentário cita a sobrevivente").toMatch(/sobrevivente/i);
    expect(
      comments,
      "comentário: a linha colidente da perdedora NÃO é somada",
    ).toMatch(/n[ãa]o\s+(?:é\s+)?somad|sem\s+soma/i);
  });

  it("troca as travas DEPOIS de toda a fusão: DROP das travas de nome único + CREATE UNIQUE INDEX (normalização, type) nas duas tabelas (D10/D11/D19, critério 7)", () => {
    const sql = loadMigrationSql();
    const executable = stripSqlComments(sql);
    // Drop das travas antigas de nome único (nomes implícitos do catálogo Postgres)
    const dropCatIdx = executable.search(
      /DROP\s+(?:CONSTRAINT|INDEX)\s+(?:IF\s+EXISTS\s+)?categories_name_key/i,
    );
    const dropAccIdx = executable.search(
      /DROP\s+(?:CONSTRAINT|INDEX)\s+(?:IF\s+EXISTS\s+)?financial_accounts_name_key/i,
    );
    expect(dropCatIdx, "DROP de categories_name_key").toBeGreaterThanOrEqual(0);
    expect(dropAccIdx, "DROP de financial_accounts_name_key").toBeGreaterThanOrEqual(
      0,
    );
    // Índice único novo com expressão de normalização + coluna type nas DUAS tabelas
    const newIndexes = extractStatements(executable, /CREATE\s+UNIQUE\s+INDEX/i);
    const onCategories = newIndexes.find((statement) =>
      /ON\s+public\.categories\b/i.test(statement),
    );
    const onAccounts = newIndexes.find((statement) =>
      /ON\s+public\.financial_accounts\b/i.test(statement),
    );
    expect(onCategories, "CREATE UNIQUE INDEX em public.categories").toBeDefined();
    expect(onAccounts, "CREATE UNIQUE INDEX em public.financial_accounts").toBeDefined();
    expect(onCategories ?? "", "expressão de normalização em categories").toMatch(
      /unaccent|normalize/i,
    );
    expect(onCategories ?? "", "coluna type na chave de categories").toMatch(
      /\btype\b/i,
    );
    expect(onAccounts ?? "", "expressão de normalização em financial_accounts").toMatch(
      /unaccent|normalize/i,
    );
    expect(onAccounts ?? "", "coluna type na chave de financial_accounts").toMatch(
      /\btype\b/i,
    );
    // Ordem D11: todos os passos de fusão (UPDATE/DELETE) ANTES da troca de trava
    const fusionPatterns = [
      /UPDATE\s+public\.transactions(?:\s+(?:AS\s+)?\w+)?\s+SET\s*\(?\s*category_id/gi,
      /UPDATE\s+public\.budget_items(?:\s+(?:AS\s+)?\w+)?\s+SET\s*\(?\s*category_id/gi,
      /UPDATE\s+public\.checklist_items(?:\s+(?:AS\s+)?\w+)?\s+SET\s*\(?\s*category_id/gi,
      /UPDATE\s+public\.transactions(?:\s+(?:AS\s+)?\w+)?\s+SET\s*\(?\s*account_id/gi,
      /DELETE\s+FROM\s+public\.budget_items/gi,
      /DELETE\s+FROM\s+public\.categories/gi,
      /DELETE\s+FROM\s+public\.financial_accounts/gi,
    ];
    const fusionIndexes = fusionPatterns.flatMap((pattern) =>
      [...executable.matchAll(pattern)].map((match) => match.index ?? 0),
    );
    expect(fusionIndexes.length).toBeGreaterThanOrEqual(7);
    const lastFusion = Math.max(...fusionIndexes);
    const firstLockSwap = Math.min(
      dropCatIdx,
      dropAccIdx,
      executable.search(/CREATE\s+UNIQUE\s+INDEX/i),
    );
    expect(
      firstLockSwap,
      "fusão inteira (UPDATE/DELETE) concluída antes da troca de trava",
    ).toBeGreaterThan(lastFusion);
  });

  it("garante self-bootstrap idempotente de schema_migrations antes da auditoria e registra script_name idêntico, spec_id pluto-11, spec_name, executed_by e ON CONFLICT DO NOTHING (critério 8)", () => {
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
    expect(sql).toContain(SCRIPT_NAME);
    expect(sql).toMatch(/pluto-11/);
    expect(sql).toContain("Categorias e Contas sem Distinção de Caixa e Acentos");
    expect(sql).toContain("joaopsroberto@gmail.com");
    expect(sql).toMatch(/ON\s+CONFLICT\s*\(\s*script_name\s*\)\s+DO\s+NOTHING/i);
  });

  it("documenta o rollback em comentário no rodapé (remover índices novos, recriar travas de nome; fusão irreversível) (D9, critério 9)", () => {
    const sql = loadMigrationSql();
    const comments = extractCommentLines(sql);
    // Remoção dos índices novos
    expect(comments, "rollback remove os índices novos").toMatch(
      /DROP\s+(?:UNIQUE\s+)?INDEX/i,
    );
    // Recriação das travas de nome originais
    expect(comments, "rollback recria categories_name_key").toMatch(
      /categories_name_key/i,
    );
    expect(comments, "rollback recria financial_accounts_name_key").toMatch(
      /financial_accounts_name_key/i,
    );
    expect(comments, "recriação das travas de nome única").toMatch(
      /CREATE\s+UNIQUE\s+(?:INDEX|CONSTRAINT)|ADD\s+CONSTRAINT/i,
    );
    // Fusão documentada como irreversível (exclusão de verdade, D9)
    expect(comments, "fusão documentada como irreversível").toMatch(/irrevers/i);
    expect(comments, "a fusão é citada no rollback").toMatch(/fus[ãa]o/i);
    // Rodapé: o bloco de rollback vive depois do último comando executável
    expect(
      hasFooterAfterExecutable(sql, /rollback|revers/i),
      "bloco de rollback está no rodapé (após o último comando executável)",
    ).toBe(true);
  });

  it("documenta em comentário as consultas de verificação pós-aplicação (critério 10)", () => {
    const comments = extractCommentLines(loadMigrationSql());
    // Zero pares do mesmo tipo com nome normalizado coincidente
    expect(comments, "contagem nas verificações").toMatch(/count\s*\(/i);
    expect(comments, "verificação sobre nome normalizado").toMatch(/normaliz/i);
    expect(comments, "resultado esperado = 0").toMatch(/=\s*0\b|\bzero\b/i);
    // Total de transactions/budget_items/checklist_items inalterado (exceto colisões de budget_items)
    expect(comments).toMatch(/transactions/i);
    expect(comments).toMatch(/budget_items/i);
    expect(comments).toMatch(/checklist_items/i);
    expect(comments, "totais inalterados/conservados").toMatch(
      /inalterad|conservad|diferen[çc]a/i,
    );
    // Nenhum ponteiro órfão
    expect(comments, "nenhum ponteiro órfão").toMatch(/rf[aã]o/i);
    // Contagem de apontadores conservada antes/depois (só o ponteiro mudou)
    expect(comments).toMatch(/antes/i);
    expect(comments).toMatch(/depois/i);
    expect(comments, "contagem de apontadores antes/depois").toMatch(
      /contagem|count/i,
    );
  });

  it("asserções negativas: fora de comentários não há DROP TABLE, DROP COLUMN ou RENAME e nenhuma política RLS nova em nenhuma tabela (critério 11)", () => {
    const executable = stripSqlComments(loadMigrationSql());
    expect(executable).not.toMatch(/\bDROP\s+(?:TABLE|COLUMN)\b/i);
    expect(executable).not.toMatch(/\bRENAME\b/i);
    // Nenhuma política RLS nova além do self-bootstrap de schema_migrations (exigido no critério 8)
    const policyTables = [
      ...executable.matchAll(/CREATE\s+POLICY\b[\s\S]*?ON\s+public\.(\w+)/gi),
    ].map((match) => match[1]);
    for (const table of policyTables) {
      expect(table, "política RLS fora de schema_migrations").toBe(
        "schema_migrations",
      );
    }
    const rlsEnabled = [
      ...executable.matchAll(
        /ALTER\s+TABLE\s+public\.(\w+)[\s\S]{0,120}?ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi,
      ),
    ].map((match) => match[1]);
    for (const table of rlsEnabled) {
      expect(table, "RLS habilitado fora de schema_migrations").toBe(
        "schema_migrations",
      );
    }
    expect(executable).not.toMatch(/DROP\s+POLICY\b/i);
  });
});
