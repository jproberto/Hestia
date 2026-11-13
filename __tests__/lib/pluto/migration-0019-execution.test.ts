// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import realProcess from "node:process";

// ---------------------------------------------------------------------------
// RED de EXECUÇÃO da migração 0019 (blocker CRITICAL findings[0] da 3a
// re-review 2026-11-11). `migration-0019.test.ts` são 10 asserções de string
// que passam com SQL não-aplicável; este teste executa a cadeia inteira como o
// CI faz (job integration, ci.yml:123-125: `migration-feature-*.sql` ordenado
// antes de `migration-[0-9]*.sql`, um arquivo por transação, equivalente a
// psql ON_ERROR_STOP=1) num PostgreSQL EFÊMERO (embedded-postgres, PG 17.x),
// com SEED de duplicatas entre a 0018 e a 0019 para as seções de fusão
// rodarem de verdade (gap apontado pelo Argos: fusão só rodava com seed
// manual).
//
// RED ESPERADO HOJE (reproduz o replay do Argos em PG 17.11/15.19/18.6):
// a aplicação da 0019 falha com
//     `function min(uuid) does not exist`
// porque migration-0019:153-154 usa `min(l.id)` sobre `budget_items.id` UUID
// e o PostgreSQL não possui agregado min(uuid). Após corrigir esse defect, no
// PG16+ o próximo modo de falha do findings[0] é o índice das l.334-338 com
// `unaccent` não qualificado (`function unaccent(text) does not exist`).
// O teste só fica VERDE quando a 0019 corrigida aplicar de ponta a ponta —
// inclusive fusão de duplicatas, troca de travas, auditoria e re-execução.
//
// INFRA (condicionado, nunca falso-verde):
//   - `embedded-postgres` + `pg` instalados com `npm install --no-save`
//     (package.json/lock intocados). Sem os módulos:
//       * MIGRATION_EXECUTION_REQUIRED=1 → o teste FALHA (gate duro);
//       * caso contrário → SKIP com aviso claro no console.
//   - Roda localmente SEM SUPABASE_INTEGRATION_URL (diferente de
//     __tests__/integration/unique-normalized.test.ts).
// GATE REAL NO CI: o job `integration` (ci.yml:123-125, psql com
// ON_ERROR_STOP=1) já aplica a cadeia e reproduz a falha da 0019 no PR —
// este teste é o gate local de execução com o mesmo replay.
// ---------------------------------------------------------------------------

// setup.ts faz vi.stubGlobal("process", { env: parcial }); devolve o process
// real para o módulo (leitura de env) e para as bibliotecas de infra
// (pg/embedded-postgres leem platform/cwd/env) antes de carregá-las.
vi.stubGlobal("process", realProcess);

const MIG_DIR = path.resolve(__dirname, "../../../utils/migrations");
const SCRIPT_0019 = "migration-0019-pluto-categorias-contas-normalizadas.sql";
const EXEC_REQUIRED = realProcess.env.MIGRATION_EXECUTION_REQUIRED === "1";

// Resolução síncrona dos módulos de infra no escopo de coleção do arquivo
// (sem top-level await) para decidir registrar o describe real, o skip ou o
// gate duro ANTES do vitest coletar os testes.
const requireFromTest = createRequire(import.meta.url);
function moduleResolves(id: string): boolean {
  try {
    requireFromTest.resolve(id);
    return true;
  } catch {
    return false;
  }
}
const hasInfra = moduleResolves("embedded-postgres") && moduleResolves("pg");

/** Ordem exata do CI (ci.yml:123-125): feature-* congelados primeiro, depois NNNN. */
function orderedMigrations(): string[] {
  const files = fs.readdirSync(MIG_DIR);
  return [
    ...files.filter((f) => /^migration-feature-.*\.sql$/.test(f)).sort(),
    ...files.filter((f) => /^migration-[0-9].*\.sql$/.test(f)).sort(),
  ];
}

// Ids fixos do seed (UUIDs hex válidos) — referenciados nas asserções.
const ID = {
  adjA: "aaaaaaaa-0000-4000-8000-000000000001",
  adjB: "aaaaaaaa-0000-4000-8000-000000000002",
  catSobrevivente: "cccccccc-0000-4000-8000-000000000001", // "Mercaria" (mais antiga)
  catPerdedora: "cccccccc-0000-4000-8000-000000000002", // "mercaria" (mais nova)
  catComum: "cccccccc-0000-4000-8000-000000000003", // "Alimentação" (sem duplicata)
  accSobrevivente: "ffffffff-0000-4000-8000-000000000001", // "Itau" conta
  accPerdedora: "ffffffff-0000-4000-8000-000000000002", // "Itaú" conta
  tx1: "dddddddd-0000-4000-8000-000000000001",
  tx2: "dddddddd-0000-4000-8000-000000000002",
  tx3: "dddddddd-0000-4000-8000-000000000003",
  tx4: "dddddddd-0000-4000-8000-000000000004",
  tx5: "dddddddd-0000-4000-8000-000000000005",
  bud1: "bbbbbbbb-0000-4000-8000-000000000001",
  bud2: "bbbbbbbb-0000-4000-8000-000000000002",
  bud3: "bbbbbbbb-0000-4000-8000-000000000003",
  chk1: "eeeeeeee-0000-4000-8000-000000000001",
  chk2: "eeeeeeee-0000-4000-8000-000000000002",
};

/**
 * Seed de duplicatas legadas (rodar DEPOIS da 0018 e ANTES da 0019 — a
 * trava antiga UNIQUE(name) só permite variantes de caixa/acentos, nunca a
 * mesma grafia literal). Desenho:
 *
 * categories (mesmo tipo despesa, par "Mercaria"/"mercaria"):
 *   - usos do grupo: sobrevivente = t3+t4 (transactions) + k1 + b1 = 4;
 *     perdedora = t5 + k2 + b2 + b3 = 4 → EMPATE → vence a mais antiga
 *     (desempate created_at ASC, spec §10 l.182).
 *   - b2 em (ajuste A, perdedora) COLIDE com b1 em (ajuste A, sobrevivente)
 *     → descartada sem soma (R9/spec l.183); b3 em (ajuste B, perdedora) não
 *     colide → é reapontada (seção 2.2 — onde o min(uuid) aborta HOJE).
 * financial_accounts (conta "Itau"/"Itaú"): sobrevivente tem 3 transactions
 *   vs 2 da perdedora → vence por MAIS USOS (caminho principal da regra).
 */
const SEED_DUPLICATAS = `
INSERT INTO public.budget_adjustments (id, year, start_month, description, created_at, created_by) VALUES
  ('${ID.adjA}', 2026, 1, 'Ajuste A', '2026-01-01T00:00:00+00', 'seed@hestia.com'),
  ('${ID.adjB}', 2026, 2, 'Ajuste B', '2026-01-01T00:00:00+00', 'seed@hestia.com');

INSERT INTO public.categories (id, name, type, created_at, created_by) VALUES
  ('${ID.catSobrevivente}', 'Mercaria', 'despesa', '2026-01-01T00:00:00+00', 'seed@hestia.com'),
  ('${ID.catPerdedora}', 'mercaria', 'despesa', '2026-02-01T00:00:00+00', 'seed@hestia.com'),
  ('${ID.catComum}', 'Alimentação', 'despesa', '2026-01-01T00:00:00+00', 'seed@hestia.com');

INSERT INTO public.financial_accounts (id, name, type, created_at, created_by) VALUES
  ('${ID.accSobrevivente}', 'Itau', 'conta', '2026-01-01T00:00:00+00', 'seed@hestia.com'),
  ('${ID.accPerdedora}', 'Itaú', 'conta', '2026-02-01T00:00:00+00', 'seed@hestia.com');

INSERT INTO public.transactions (id, description, amount, type, is_refund, date, category_id, account_id, period_year, period_month, created_at, created_by) VALUES
  ('${ID.tx1}', 'Compra 1', 10.00, 'despesa', false, '2026-03-05', '${ID.catComum}', '${ID.accSobrevivente}', 2026, 3, '2026-03-05T12:00:00+00', 'seed@hestia.com'),
  ('${ID.tx2}', 'Compra 2', 20.00, 'despesa', false, '2026-03-06', '${ID.catComum}', '${ID.accPerdedora}', 2026, 3, '2026-03-06T12:00:00+00', 'seed@hestia.com'),
  ('${ID.tx3}', 'Compra 3', 30.00, 'despesa', false, '2026-03-07', '${ID.catSobrevivente}', '${ID.accSobrevivente}', 2026, 3, '2026-03-07T12:00:00+00', 'seed@hestia.com'),
  ('${ID.tx4}', 'Compra 4', 40.00, 'despesa', false, '2026-03-08', '${ID.catSobrevivente}', '${ID.accSobrevivente}', 2026, 3, '2026-03-08T12:00:00+00', 'seed@hestia.com'),
  ('${ID.tx5}', 'Compra 5', 50.00, 'despesa', false, '2026-03-09', '${ID.catPerdedora}', '${ID.accPerdedora}', 2026, 3, '2026-03-09T12:00:00+00', 'seed@hestia.com');

INSERT INTO public.checklist_items (id, parent_id, month_id, day, description, type, category_id, amount, is_completed, is_active, created_at, created_by) VALUES
  ('${ID.chk1}', NULL, NULL, 10, 'Conta de luz', 'despesa', '${ID.catSobrevivente}', 50.00, false, true, '2026-01-05T00:00:00+00', 'seed@hestia.com'),
  ('${ID.chk2}', NULL, NULL, 11, 'Internet', 'despesa', '${ID.catPerdedora}', 60.00, false, true, '2026-02-05T00:00:00+00', 'seed@hestia.com');

INSERT INTO public.budget_items (id, adjustment_id, category_id, amount, created_at, created_by) VALUES
  ('${ID.bud1}', '${ID.adjA}', '${ID.catSobrevivente}', 100.00, '2026-01-02T00:00:00+00', 'seed@hestia.com'),
  ('${ID.bud2}', '${ID.adjA}', '${ID.catPerdedora}', 50.00, '2026-02-02T00:00:00+00', 'seed@hestia.com'),
  ('${ID.bud3}', '${ID.adjB}', '${ID.catPerdedora}', 70.00, '2026-02-02T00:00:00+00', 'seed@hestia.com');
`;

interface PgQueryResult {
  rows: Array<Record<string, unknown>>;
}
interface PgClientLike {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string): Promise<PgQueryResult>;
}
interface EmbeddedPgLike {
  initialise(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  createDatabase(name: string): Promise<void>;
}
type EmbeddedCtor = new (options: Record<string, unknown>) => EmbeddedPgLike;

if (hasInfra) {
  describe("Pluto 11 T0 — migração 0019 EXECUTADA em PostgreSQL efêmero (replay da cadeia como o CI)", () => {
    let pgServer: EmbeddedPgLike | null = null;
    let client: PgClientLike | null = null;
    let dataRoot = "";

    /** Porta TCP livre para o PG efêmero (evita colisão entre workers). */
    function freePort(): Promise<number> {
      return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.unref();
        srv.on("error", reject);
        srv.listen(0, "127.0.0.1", () => {
          const addr = srv.address();
          const port = typeof addr === "object" && addr ? addr.port : 0;
          srv.close(() => resolve(port));
        });
      });
    }

    async function scalar(sql: string): Promise<number> {
      const res = await (client as PgClientLike).query(sql);
      const row = res.rows[0] ?? {};
      return Number(row[Object.keys(row)[0]]);
    }

    beforeAll(async () => {
      // Especificador em variável: `embedded-postgres` não é dependency do
      // projeto (CI faz npm ci sem ele) — import literal dispararia TS2307
      // no tsc --noEmit; com variável o TS não resolve o módulo (mesmo
      // truque do PG_MODULE_ID abaixo, usado para `pg` sem @types/pg).
      const EP_MODULE_ID = "embedded-postgres";
      const epModule = (await import(/* @vite-ignore */ EP_MODULE_ID)) as {
        default?: EmbeddedCtor;
        EmbeddedPostgres?: EmbeddedCtor;
      };
      const EmbeddedPostgres = epModule.default ?? epModule.EmbeddedPostgres;
      if (!EmbeddedPostgres) {
        throw new Error("embedded-postgres carregado sem export (default/EmbeddedPostgres)");
      }
      // Especificador em variável: `pg` não publica declarações de tipo
      // (@types/pg não é dependency do projeto) — import literal dispararia
      // TS7016 no tsc --noEmit; com variável o TS não resolve o módulo.
      const PG_MODULE_ID = "pg";
      const pgModule = (await import(/* @vite-ignore */ PG_MODULE_ID)) as {
        Client: new (config: Record<string, unknown>) => PgClientLike;
      };

      dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hestia-mig0019-"));
      const port = await freePort();
      pgServer = new EmbeddedPostgres({
        databaseDir: path.join(dataRoot, "data"),
        user: "postgres",
        password: "pw",
        port,
        persistent: false,
        autoRehydrateSymlinks: true,
      });
      await pgServer.initialise();
      await pgServer.start();
      await pgServer.createDatabase("chain");
      client = new pgModule.Client({
        host: "127.0.0.1",
        port,
        user: "postgres",
        password: "pw",
        database: "chain",
      });
      await client.connect();

      // Role usado pelas policies CREATE POLICY ... TO authenticated da cadeia.
      await client.query(
        "DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$",
      );

      // Replay da cadeia 0001→0018 na ordem do CI (ci.yml:123-125), um
      // arquivo por transação — erro aqui interrompe com o nome do arquivo.
      const chain = orderedMigrations().filter((f) => f !== SCRIPT_0019);
      expect(chain.length, "cadeia com todas as migrações menos a 0019").toBe(
        orderedMigrations().length - 1,
      );
      for (const f of chain) {
        const sql = fs.readFileSync(path.join(MIG_DIR, f), "utf8");
        try {
          await (client as PgClientLike).query(sql);
        } catch (err) {
          throw new Error(`FAIL ${f} -> ${(err as Error).message}`);
        }
      }

      // Seed de duplicatas (fusão precisa de dados para rodar de verdade).
      await (client as PgClientLike).query(SEED_DUPLICATAS);

      // Sanidade do fixture: duplicatas reais existem ANTES da 0019 e os
      // ponteiros estão nas contagens desenhadas. Sem unaccent aqui — a
      // extensão só nasce na própria 0019 (fiel ao replay do CI).
      const dupCategorias = await scalar(`
        SELECT count(*) FROM (
          SELECT lower(btrim(name)) AS n, type
            FROM public.categories GROUP BY 1, 2 HAVING count(*) > 1
        ) d`);
      const dupContas = await scalar(
        `SELECT count(*) FROM public.financial_accounts WHERE name IN ('Itau', 'Itaú')`,
      );
      expect(dupCategorias, "seed cria o par duplicado em categories (só caixa)").toBe(1);
      expect(dupContas, "seed cria o par duplicado em financial_accounts (acentos)").toBe(2);
      expect(await scalar("SELECT count(*) FROM public.categories")).toBe(3);
      expect(await scalar("SELECT count(*) FROM public.financial_accounts")).toBe(2);
      expect(await scalar("SELECT count(*) FROM public.transactions")).toBe(5);
      expect(await scalar("SELECT count(*) FROM public.budget_items")).toBe(3);
      expect(await scalar("SELECT count(*) FROM public.checklist_items")).toBe(2);
    }, 300_000);

    afterAll(async () => {
      try {
        await client?.end();
      } catch {
        /* conexão já fechada */
      }
      try {
        await pgServer?.stop();
      } catch {
        /* servidor já parado */
      }
      if (dataRoot) {
        try {
          fs.rmSync(dataRoot, { recursive: true, force: true });
        } catch {
          /* melhor esforço */
        }
      }
    }, 120_000);

    /**
     * Aplica a 0019 inteira (BEGIN→COMMIT próprios). Em falha, desfaz a
     * transação abortada (ROLLBACK) para a conexão não ficar em estado
     * aborted e propaga o motivo EXATO do PostgreSQL — é o RED do blocker
     * CRITICAL: `function min(uuid) does not exist`.
     */
    async function apply0019(): Promise<void> {
      const sql = fs.readFileSync(path.join(MIG_DIR, SCRIPT_0019), "utf8");
      try {
        await (client as PgClientLike).query(sql);
      } catch (err) {
        try {
          await (client as PgClientLike).query("ROLLBACK");
        } catch {
          /* sem transação aberta */
        }
        throw new Error(`FAIL ${SCRIPT_0019} -> ${(err as Error).message}`);
      }
    }

    it(
      "aplica a 0019 sem erro e valida a fusão das duplicatas, a troca de travas, o wrapper IMMUTABLE e a auditoria (RED blocker CRITICAL findings[0])",
      async () => {
        // RED aqui dentro: hoje a 0019 aborta em
        //   `function min(uuid) does not exist`
        // (min(l.id) sobre budget_items.id UUID — seção 2.2) e, no PG16+,
        // em seguida no índice com unaccent não qualificado (seção 6).
        await apply0019();

        // --- pares duplicados: zero após a fusão (spec §10 l.186) ---
        expect(
          await scalar(`
            SELECT count(*) FROM (
              SELECT lower(unaccent(btrim(name))) AS n, type
                FROM public.categories GROUP BY 1, 2 HAVING count(*) > 1
            ) d`),
          "zero pares de categories com nome normalizado coincidente no mesmo tipo",
        ).toBe(0);
        expect(
          await scalar(`
            SELECT count(*) FROM (
              SELECT lower(unaccent(btrim(name))) AS n, type
                FROM public.financial_accounts GROUP BY 1, 2 HAVING count(*) > 1
            ) d`),
          "zero pares de financial_accounts com nome normalizado coincidente no mesmo tipo",
        ).toBe(0);

        // --- perdedoras excluídas de verdade (D9) ---
        expect(
          await scalar(`SELECT count(*) FROM public.categories WHERE id = '${ID.catPerdedora}'`),
          "categoria perdedora excluída",
        ).toBe(0);
        expect(
          await scalar(
            `SELECT count(*) FROM public.financial_accounts WHERE id = '${ID.accPerdedora}'`,
          ),
          "conta perdedora excluída",
        ).toBe(0);

        // --- transactions: contagem conservada e ponteiros reapontados ---
        expect(await scalar("SELECT count(*) FROM public.transactions")).toBe(5);
        expect(
          await scalar(
            `SELECT count(*) FROM public.transactions WHERE category_id = '${ID.catPerdedora}'`,
          ),
          "nenhuma transaction aponta para a categoria perdedora",
        ).toBe(0);
        expect(
          await scalar(
            `SELECT count(*) FROM public.transactions WHERE category_id = '${ID.catSobrevivente}'`,
          ),
          "t3/t4/t5 reapontadas para a sobrevivente (3)",
        ).toBe(3);
        expect(
          await scalar(
            `SELECT count(*) FROM public.transactions WHERE account_id = '${ID.accPerdedora}'`,
          ),
          "nenhuma transaction aponta para a conta perdedora",
        ).toBe(0);
        expect(
          await scalar(
            `SELECT count(*) FROM public.transactions WHERE account_id = '${ID.accSobrevivente}'`,
          ),
          "todas as transactions reapontadas para a conta sobrevivente (5)",
        ).toBe(5);

        // --- checklist_items: contagem conservada e ponteiro reapontado ---
        expect(await scalar("SELECT count(*) FROM public.checklist_items")).toBe(2);
        const chk2Category = (
          await (client as PgClientLike).query(
            `SELECT category_id FROM public.checklist_items WHERE id = '${ID.chk2}'`,
          )
        ).rows[0]?.category_id;
        expect(
          chk2Category,
          "checklist da perdedora reapontada para a sobrevivente",
        ).toBe(ID.catSobrevivente);

        // --- budget_items: colisão descartada (prevalece a sobrevivente,
        //     NÃO é somada — R9/spec l.183) e não-colidente reapontada ---
        expect(await scalar("SELECT count(*) FROM public.budget_items")).toBe(2);
        expect(
          await scalar(
            `SELECT count(*) FROM public.budget_items WHERE adjustment_id = '${ID.adjA}'`,
          ),
          "em (ajuste A) só sobra a linha da sobrevivente (a colidente da perdedora é descartada)",
        ).toBe(1);
        expect(
          await scalar(
            `SELECT count(*) FROM public.budget_items WHERE id = '${ID.bud1}' AND amount = 100`,
          ),
          "linha da sobrevivente preservada com o valor original (sem soma do 50 da perdedora)",
        ).toBe(1);
        expect(
          await scalar(
            `SELECT count(*) FROM public.budget_items WHERE id = '${ID.bud3}' AND category_id = '${ID.catSobrevivente}'`,
          ),
          "linha não colidente da perdedora (ajuste B) reapontada para a sobrevivente",
        ).toBe(1);

        // --- nenhum ponteiro órfão (spec §6 verificações) ---
        expect(
          await scalar(`SELECT count(*) FROM public.transactions t
            WHERE t.category_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.id = t.category_id)`),
          "transactions sem categoria órfã",
        ).toBe(0);
        expect(
          await scalar(`SELECT count(*) FROM public.transactions t
            WHERE t.account_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM public.financial_accounts a WHERE a.id = t.account_id)`),
          "transactions sem conta órfã",
        ).toBe(0);
        expect(
          await scalar(`SELECT count(*) FROM public.budget_items b
            WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.id = b.category_id)`),
          "budget_items sem categoria órfã",
        ).toBe(0);
        expect(
          await scalar(`SELECT count(*) FROM public.checklist_items k
            WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.id = k.category_id)`),
          "checklist_items sem categoria órfã",
        ).toBe(0);

        // --- wrapper IMMUTABLE criado pela própria 0019 (emenda 2026-11-11) ---
        const wrapperVolatility = (await (client as PgClientLike).query(
          "SELECT provolatile FROM pg_catalog.pg_proc WHERE proname = 'pluto_normalize_name'",
        )).rows[0]?.provolatile;
        expect(wrapperVolatility, "pluto_normalize_name existe e é IMMUTABLE ('i')").toBe("i");

        // --- troca das travas (D10/D11): sai name_key, entra normalized ---
        expect(
          await scalar(`SELECT count(*) FROM pg_catalog.pg_constraint
            WHERE conname IN ('categories_name_key', 'financial_accounts_name_key')`),
          "travas antigas de nome único removidas",
        ).toBe(0);
        expect(
          await scalar(`SELECT count(*) FROM pg_catalog.pg_indexes
            WHERE indexname IN ('categories_name_type_normalized_key',
                                'financial_accounts_name_type_normalized_key')`),
          "índices únicos normalizados criados nas duas tabelas",
        ).toBe(2);

        // --- auditoria com script_name idêntico ao arquivo (regra 7) ---
        expect(
          await scalar(
            `SELECT count(*) FROM public.schema_migrations WHERE script_name = '${SCRIPT_0019}'`,
          ),
          "auditoria da 0019 registrada uma única vez",
        ).toBe(1);
      },
      180_000,
    );

    it(
      "é re-executável após o sucesso (tudo ou nada + idempotência, spec §10 l.184)",
      async () => {
        // Segunda aplicação completa deve passar sem erro e sem duplicar
        // auditoria nem alterar contagens.
        await apply0019();
        expect(
          await scalar(
            `SELECT count(*) FROM public.schema_migrations WHERE script_name = '${SCRIPT_0019}'`,
          ),
          "auditoria continua com 1 linha (ON CONFLICT DO NOTHING)",
        ).toBe(1);
        expect(await scalar("SELECT count(*) FROM public.transactions")).toBe(5);
        expect(await scalar("SELECT count(*) FROM public.budget_items")).toBe(2);
        expect(await scalar("SELECT count(*) FROM public.categories")).toBe(2);
        expect(await scalar("SELECT count(*) FROM public.financial_accounts")).toBe(1);
      },
      180_000,
    );
  });
} else if (EXEC_REQUIRED) {
  describe("Pluto 11 T0 — migração 0019 EXECUTADA (gate MIGRATION_EXECUTION_REQUIRED=1)", () => {
    it("falha alto: gate de execução exigido mas a infra está ausente", () => {
      throw new Error(
        "BLOCKED: Missing embedded-postgres/pg — MIGRATION_EXECUTION_REQUIRED=1 exige o " +
          "gate de execução da 0019 e os módulos não resolvem neste node_modules " +
          "(instale com: npm install --no-save embedded-postgres pg)",
      );
    });
  });
} else {
  console.warn(
    "[SKIPPED] migration-0019-execution: embedded-postgres/pg ausentes — a 0019 NÃO foi " +
      "executada aqui (skip, não é verde). Gate real no CI: job integration " +
      "(ci.yml:123-125, psql ON_ERROR_STOP=1). Para rodar local: " +
      "npm install --no-save embedded-postgres pg — ou exporte " +
      "MIGRATION_EXECUTION_REQUIRED=1 para transformar a ausência em falha.",
  );
  describe.skip("Pluto 11 T0 — migração 0019 EXECUTADA (infra ausente)", () => {
    it("skipped: embedded-postgres/pg indisponíveis", () => {
      /* nunca alcançado — describe.skip */
    });
  });
}
