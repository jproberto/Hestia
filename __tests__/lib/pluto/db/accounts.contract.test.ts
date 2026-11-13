import { describe, it, expect } from "vitest";
import { getOrCreateAccount } from "@/lib/pluto/db/accounts";
import type { IDatabaseClient } from "@/lib/shared/database";

/**
 * T0 RED — pluto/11-categorias-sem-distincao-caixa.
 *
 * Contrato da busca do getOrCreateAccount pelo caminho oficial da UI
 * (barrel lib/pluto/db/accounts → repositório real em
 * lib/pluto/repositories/accounts.ts), o mesmo padrão de categorias:
 *  - R1/R4 (spec): nome existente com caixa/acentos/forma Unicode diferentes
 *    do digitado é reutilizado — nenhuma linha nova é criada;
 *  - R2/R4 (spec): a busca filtra por tipo (conta x cartao) — homônima do
 *    outro tipo NÃO é devolvida;
 *  - DT-5 (plan): erro de leitura propaga (lança) — remove o retry silencioso
 *    legado, que hoje seguia para o insert em caso de erro de leitura
 *    (lib/pluto/repositories/accounts.ts: `if (!error && data)`).
 *
 * Stub em memória de IDatabaseClient no padrão de
 * __tests__/lib/pluto/db/checklist-create.test.ts (fakes-only, decisão 57 —
 * nenhum Supabase real). O builder também aceita leitura em lista (await),
 * que é o caminho da varredura por tipo do DT-2, para o GREEN não depender
 * do shape exato da query.
 */

type Row = Record<string, unknown>;

interface StubOptions {
  seed?: Record<string, Row[]>;
  readError?: Error;
}

function createStubDb(options: StubOptions = {}) {
  const tables = new Map<string, Row[]>();
  for (const [table, seedRows] of Object.entries(options.seed ?? {})) {
    tables.set(
      table,
      seedRows.map((r) => ({ ...r }))
    );
  }
  const counters = { inserts: 0 };

  const list = (table: string): Row[] => {
    if (!tables.has(table)) tables.set(table, []);
    return tables.get(table) as Row[];
  };

  const client = {
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      let pendingInsert: Row | null = null;
      let order: { column: string; ascending: boolean } | null = null;

      const matched = (): Row[] => {
        let out = list(table).filter((row) =>
          filters.every(([col, val]) => row[col] === val)
        );
        if (order) {
          const { column, ascending } = order;
          out = [...out].sort((a, b) => {
            const cmp = String(a[column] ?? "").localeCompare(String(b[column] ?? ""));
            return ascending ? cmp : -cmp;
          });
        }
        return out;
      };

      const readList = (): { data: Row[] | null; error: Error | null } =>
        options.readError
          ? { data: null, error: options.readError }
          : { data: matched(), error: null };

      const readSingle = (): { data: Row | null; error: Error | null } => {
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
        order: (column: string, opts?: { ascending?: boolean }) => {
          order = { column, ascending: opts?.ascending ?? true };
          return builder;
        },
        insert: (data: Row | Row[]) => {
          pendingInsert = Array.isArray(data) ? (data[0] ?? {}) : data;
          return builder;
        },
        single: async () => {
          if (pendingInsert) {
            counters.inserts += 1;
            const row = { id: `stub-${counters.inserts}`, ...pendingInsert };
            list(table).push(row);
            pendingInsert = null;
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
    rows: (table: string) => list(table).map((r) => ({ ...r })),
  };
}

const EMAIL = "contrato@hestia.com";

const accountRow = (id: string, name: string, type: "conta" | "cartao"): Row => ({
  id,
  name,
  type,
  created_at: "2026-01-01T00:00:00Z",
  created_by: EMAIL,
});

describe("getOrCreateAccount — contrato da busca (repositório real)", () => {
  it("reutiliza a conta existente quando só a caixa do nome difere (R1/R4)", async () => {
    const { db, inserts, rows } = createStubDb({
      seed: { financial_accounts: [accountRow("acc-itau", "Itaú", "conta")] },
    });

    const id = await getOrCreateAccount(db, "itaú", EMAIL, "conta");

    expect(id).toBe("acc-itau");
    expect(inserts()).toBe(0);
    expect(rows("financial_accounts")).toHaveLength(1);
  });

  it("reutiliza a conta existente quando o nome difere em acentos e caixa (R1/R4)", async () => {
    const { db, inserts, rows } = createStubDb({
      seed: { financial_accounts: [accountRow("acc-itau", "Itaú", "conta")] },
    });

    const idSemAcento = await getOrCreateAccount(db, "itau", EMAIL, "conta");
    const idMaiusculo = await getOrCreateAccount(db, "ITAÚ", EMAIL, "conta");

    expect(idSemAcento).toBe("acc-itau");
    expect(idMaiusculo).toBe("acc-itau");
    expect(inserts()).toBe(0);
    expect(rows("financial_accounts")).toHaveLength(1);
  });

  it("trata o mesmo nome colado em forma Unicode decomposta como a mesma conta (R1)", async () => {
    const composto = "Itaú"; // u em forma composta (NFC)
    const decomposto = composto.normalize("NFD");
    // fixture sanity: as duas formas precisam realmente ser diferentes no disco
    expect(decomposto).not.toBe(composto);

    const { db, inserts } = createStubDb({
      seed: { financial_accounts: [accountRow("acc-itau", composto, "conta")] },
    });

    const id = await getOrCreateAccount(db, decomposto, EMAIL, "conta");

    expect(id).toBe("acc-itau");
    expect(inserts()).toBe(0);
  });

  it("nome igual com tipo diferente cria linha própria — não devolve a homônima do outro tipo (R2/R4)", async () => {
    const { db, inserts, rows } = createStubDb({
      seed: { financial_accounts: [accountRow("acc-nubank", "Nubank", "conta")] },
    });

    const id = await getOrCreateAccount(db, "Nubank", EMAIL, "cartao");

    expect(id).not.toBe("acc-nubank");
    expect(inserts()).toBe(1);
    const criada = rows("financial_accounts").find((r) => r.id === id);
    expect(criada).toMatchObject({
      name: "Nubank",
      type: "cartao",
      created_by: EMAIL,
    });
  });

  it("propaga o erro de leitura em vez do retry silencioso legado (DT-5)", async () => {
    const { db, inserts } = createStubDb({
      seed: { financial_accounts: [accountRow("acc-itau", "Itaú", "conta")] },
      readError: new Error("falha na leitura de contas"),
    });

    await expect(getOrCreateAccount(db, "Itaú", EMAIL, "conta")).rejects.toThrow(
      "falha na leitura de contas"
    );
    expect(inserts()).toBe(0);
  });
});
