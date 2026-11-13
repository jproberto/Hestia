import { describe, it, expect } from "vitest";
import { getOrCreateAccount } from "@/lib/pluto/repositories/accounts";
import type { IDatabaseClient } from "@/lib/shared/database";

// ---------------------------------------------------------------------------
// T2 RED — Pluto 11 (Categorias e Contas sem Distinção de Caixa e Acentos).
// Fontes: `tasks.json` T2 (acceptanceCriteria 6), `spec.md` §5 R1/R2/R4 +
// D14/D17 (contas no mesmo padrão) e `plan.md` §"Contratos Completos" +
// DT-2/DT-3/DT-5.
//
// Repositório REAL (lib/pluto/repositories/accounts.ts) com stub em memória
// de IDatabaseClient — padrão de `__tests__/lib/pluto/db/checklist-create
// .test.ts` (fakes-only, decisão 57; nenhum Supabase real). O builder aceita
// tanto a leitura single (`.maybeSingle()`, hoje) quanto a leitura em lista
// (await do builder, o caminho da varredura por tipo do DT-2) — para o GREEN
// da T3 não depender do shape exato da query.
//
// Mesmos quatro cenários de categories.test.ts para financial_accounts
// (T2 criterion 6), incluindo o filtro por conta/cartao que HOJE AUSENTE no
// repositório (premissa 8 da spec):
//  1. busca por nome NORMALIZADO filtrando por tipo — variante do mesmo
//     tipo reaproveita; homônima do outro tipo NÃO é reaproveitada;
//  2. corrida: insert falha (outra aba criou antes) → a re-leitura devolve a
//     linha já existente, sem lançar (R4/D12);
//  3. erro de leitura propaga (DT-5 — hoje accounts seguia para o insert);
//  4. insert falho e re-leitura SEM linha → propaga o erro original do
//     insert (DT-3: falha real não vira sucesso silencioso).
//
// RED esperado: cenários 1–3 falham pelo motivo certo (regra antiga —
// igualdade exata `.eq("name"`, sem filtro de tipo e sem retry de corrida),
// sem SyntaxError/TS2.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

interface StubOptions {
  seed?: Row[];
  readError?: Error;
  insertError?: Error;
  /** Linha que "outra aba" cria quando o insert perde a corrida. */
  plantOnInsert?: Row;
}

function createStubDb(expectedTable: string, options: StubOptions = {}) {
  const rows: Row[] = (options.seed ?? []).map((r) => ({ ...r }));
  const counters = { reads: 0, inserts: 0 };
  let idCounter = 0;

  const client = {
    from(table: string) {
      if (table !== expectedTable) {
        throw new Error(`stub: tabela inesperada "${table}" (esperado "${expectedTable}")`);
      }
      const filters: Array<[string, unknown]> = [];
      let pendingInsert: Row | null = null;

      const matched = (): Row[] =>
        rows.filter((row) => filters.every(([col, val]) => row[col] === val));

      const readList = (): { data: Row[] | null; error: Error | null } => {
        counters.reads += 1;
        return options.readError
          ? { data: null, error: options.readError }
          : { data: matched(), error: null };
      };

      const readSingle = (): { data: Row | null; error: Error | null } => {
        counters.reads += 1;
        if (options.readError) return { data: null, error: options.readError };
        const found = matched();
        return { data: found.length > 0 ? { ...found[0] } : null, error: null };
      };

      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return builder;
        },
        order: () => builder,
        insert: (data: Row | Row[]) => {
          pendingInsert = Array.isArray(data) ? (data[0] ?? {}) : data;
          return builder;
        },
        single: async () => {
          if (pendingInsert) {
            counters.inserts += 1;
            const data = pendingInsert;
            pendingInsert = null;
            if (options.insertError) {
              if (options.plantOnInsert) rows.push({ ...options.plantOnInsert });
              return { data: null, error: options.insertError };
            }
            const row = { ...data, id: `stub-${++idCounter}` };
            rows.push(row);
            return { data: { ...row }, error: null };
          }
          return readSingle();
        },
        maybeSingle: async () => readSingle(),
        // Leitura em lista (await do builder) — varredura por tipo do DT-2.
        then: (
          onfulfilled?: ((value: { data: Row[] | null; error: Error | null }) => unknown) | null,
          onrejected?: ((reason: unknown) => unknown) | null
        ) => Promise.resolve(readList()).then(onfulfilled, onrejected),
        // Fora do contrato do getOrCreate: falham alto para não esconder
        // qualquer uso inesperado deste stub.
        update: () => {
          throw new Error("stub: update não suportado");
        },
        delete: () => {
          throw new Error("stub: delete não suportado");
        },
        upsert: () => {
          throw new Error("stub: upsert não suportado");
        },
        gte: () => {
          throw new Error("stub: gte não suportado");
        },
        lte: () => {
          throw new Error("stub: lte não suportado");
        },
        is: () => {
          throw new Error("stub: is não suportado");
        },
      };
      return builder;
    },
    getUserEmail: async () => "stub@hestia.com",
  };

  return {
    db: client as unknown as IDatabaseClient,
    inserts: () => counters.inserts,
    reads: () => counters.reads,
    rows: () => rows.map((r) => ({ ...r })),
  };
}

const EMAIL = "repo@hestia.com";

const accountRow = (id: string, name: string, type: "conta" | "cartao"): Row => ({
  id,
  name,
  type,
  created_at: "2026-01-01T00:00:00Z",
  created_by: EMAIL,
});

describe("getOrCreateAccount (repositório real com stub de IDatabaseClient)", () => {
  it("reutiliza a linha do mesmo tipo na variante de caixa/acentos — busca normalizada (R1/R4)", async () => {
    const { db, inserts, rows } = createStubDb("financial_accounts", {
      seed: [accountRow("acc-itau", "Itaú", "conta")],
    });

    const id = await getOrCreateAccount(db, "itau", EMAIL, "conta");

    expect(id).toBe("acc-itau");
    expect(inserts()).toBe(0);
    expect(rows()).toHaveLength(1);
  });

  it("filtra por conta/cartao — homônima do outro tipo NÃO é reaproveitada, cria linha própria (R2/R4)", async () => {
    const { db, inserts, rows } = createStubDb("financial_accounts", {
      seed: [accountRow("acc-nubank-conta", "Nubank", "conta")],
    });

    const id = await getOrCreateAccount(db, "Nubank", EMAIL, "cartao");

    expect(id).not.toBe("acc-nubank-conta");
    expect(inserts()).toBe(1);
    const criada = rows().find((r) => r.id === id);
    expect(criada).toMatchObject({ name: "Nubank", type: "cartao", created_by: EMAIL });
  });

  it("corrida: insert falha e a re-leitura devolve a linha já criada, sem lançar (R4/D12)", async () => {
    const { db, rows } = createStubDb("financial_accounts", {
      insertError: new Error(
        'duplicate key value violates unique constraint "financial_accounts_nome_tipo_key"'
      ),
      plantOnInsert: accountRow("acc-outra-aba", "Itaú", "conta"),
    });

    const id = await getOrCreateAccount(db, "itau", EMAIL, "conta");

    expect(id).toBe("acc-outra-aba");
    expect(rows()).toHaveLength(1);
  });

  it("erro de leitura propaga e não segue para o insert às cegas (DT-5)", async () => {
    const { db, inserts } = createStubDb("financial_accounts", {
      readError: new Error("falha na leitura de contas"),
    });

    await expect(getOrCreateAccount(db, "Itaú", EMAIL, "conta")).rejects.toThrow(
      "falha na leitura de contas"
    );
    expect(inserts()).toBe(0);
  });

  it("insert falho sem linha na re-leitura propaga o erro original do insert (DT-3)", async () => {
    const insertError = new Error("falha real de insert");
    const { db } = createStubDb("financial_accounts", { insertError });

    await expect(getOrCreateAccount(db, "Nova Conta", EMAIL, "conta")).rejects.toThrow(
      "falha real de insert"
    );
  });
});
