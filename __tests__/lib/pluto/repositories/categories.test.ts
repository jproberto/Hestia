import { describe, it, expect } from "vitest";
import { getOrCreateCategory } from "@/lib/pluto/repositories/categories";
import type { IDatabaseClient } from "@/lib/shared/database";

// ---------------------------------------------------------------------------
// T2 RED — Pluto 11 (Categorias e Contas sem Distinção de Caixa e Acentos).
// Fontes: `tasks.json` T2 (acceptanceCriteria 5), `spec.md` §5 R1/R2/R4 e
// `plan.md` §"Contratos Completos" + DT-2/DT-3/DT-5.
//
// Repositório REAL (lib/pluto/repositories/categories.ts) com stub em
// memória de IDatabaseClient — padrão de
// `__tests__/lib/pluto/db/checklist-create.test.ts` (fakes-only, decisão 57;
// nenhum Supabase real). O builder aceita tanto a leitura single
// (`.maybeSingle()`, hoje) quanto a leitura em lista (await do builder, o
// caminho da varredura por tipo do DT-2) — para o GREEN da T3 não depender
// do shape exato da query.
//
// Cenários (T2 criterion 5):
//  1. busca por nome NORMALIZADO filtrando por tipo — variante do mesmo
//     tipo reaproveita; homônima do outro tipo NÃO é reaproveitada;
//  2. corrida: insert falha (outra aba criou antes) → a re-leitura devolve a
//     linha já existente, sem lançar (R4/D12);
//  3. erro de leitura propaga (DT-5) — não cai no insert às cegas;
//  4. insert falho e re-leitura SEM linha → propaga o erro original do
//     insert (DT-3: falha real não vira sucesso silencioso).
//
// RED esperado: cenários 1 e 2 falham pelo motivo certo (regra antiga do
// repositório — igualdade exata `.eq("name"` e sem retry de corrida), sem
// SyntaxError/TS2.
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

const categoryRow = (id: string, name: string, type: "receita" | "despesa"): Row => ({
  id,
  name,
  type,
  created_at: "2026-01-01T00:00:00Z",
  created_by: EMAIL,
});

describe("getOrCreateCategory (repositório real com stub de IDatabaseClient)", () => {
  it("reutiliza a linha do mesmo tipo na variante de acento — busca normalizada (R1/R4)", async () => {
    const { db, inserts, rows } = createStubDb("categories", {
      seed: [categoryRow("cat-alim", "Alimentação", "despesa")],
    });

    const id = await getOrCreateCategory(db, "alimentacao", "despesa", EMAIL);

    expect(id).toBe("cat-alim");
    expect(inserts()).toBe(0);
    expect(rows()).toHaveLength(1);
  });

  it("filtra por tipo — homônima do outro tipo NÃO é reaproveitada, cria linha própria (R2/R4)", async () => {
    const { db, inserts, rows } = createStubDb("categories", {
      seed: [categoryRow("cat-sal-receita", "Salário", "receita")],
    });

    const id = await getOrCreateCategory(db, "Salário", "despesa", EMAIL);

    expect(id).not.toBe("cat-sal-receita");
    expect(inserts()).toBe(1);
    const criada = rows().find((r) => r.id === id);
    expect(criada).toMatchObject({ name: "Salário", type: "despesa", created_by: EMAIL });
  });

  it("corrida: insert falha e a re-leitura devolve a linha já criada, sem lançar (R4/D12)", async () => {
    const { db, rows } = createStubDb("categories", {
      insertError: new Error('duplicate key value violates unique constraint "categories_nome_tipo_key"'),
      plantOnInsert: categoryRow("cat-outra-aba", "Alimentação", "despesa"),
    });

    const id = await getOrCreateCategory(db, "alimentacao", "despesa", EMAIL);

    expect(id).toBe("cat-outra-aba");
    expect(rows()).toHaveLength(1);
  });

  it("erro de leitura propaga e não cai no insert às cegas (DT-5)", async () => {
    const { db, inserts } = createStubDb("categories", {
      readError: new Error("falha na leitura de categorias"),
    });

    await expect(getOrCreateCategory(db, "Mercaria", "despesa", EMAIL)).rejects.toThrow(
      "falha na leitura de categorias"
    );
    expect(inserts()).toBe(0);
  });

  it("insert falho sem linha na re-leitura propaga o erro original do insert (DT-3)", async () => {
    const insertError = new Error("falha real de insert");
    const { db } = createStubDb("categories", { insertError });

    await expect(getOrCreateCategory(db, "Nova Categoria", "despesa", EMAIL)).rejects.toThrow(
      "falha real de insert"
    );
  });
});
