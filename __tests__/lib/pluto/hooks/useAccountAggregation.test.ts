import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAccountAggregation } from "@/lib/pluto/hooks/useAccountAggregation";
import type { Account, TransactionWithDetails } from "@/lib/pluto/types";

function makeTx(overrides: Partial<TransactionWithDetails> & { id: string }): TransactionWithDetails {
  return {
    description: "Tx",
    amount: 100,
    type: "despesa",
    is_refund: false,
    date: "2026-03-15",
    category_id: "cat-1",
    account_id: "acc-1",
    period_year: 2026,
    period_month: 3,
    created_at: "2026-03-15T00:00:00Z",
    created_by: "test@example.com",
    category_name: "Alimentação",
    account_name: "Itaú",
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> & { id: string; name: string }): Account {
  return {
    type: "conta",
    created_at: null,
    created_by: null,
    ...overrides,
  };
}

describe("useAccountAggregation", () => {
  it("agrupa transações por conta existente", () => {
    const { result } = renderHook(() =>
      useAccountAggregation(
        [
          makeTx({ id: "t1", description: "A" }),
          makeTx({ id: "t2", description: "B" }),
        ],
        [makeAccount({ id: "acc-1", name: "Itaú" })]
      )
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].account.name).toBe("Itaú");
    expect(result.current[0].txs).toHaveLength(2);
  });

  it("cria cartão placeholder para conta só presente nos lançamentos", () => {
    const { result } = renderHook(() =>
      useAccountAggregation(
        [makeTx({ id: "t1", account_id: "acc-x", account_name: "Neon" })],
        []
      )
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].account).toMatchObject({ id: "acc-x", name: "Neon", type: "conta" });
  });

  it("mantém contas sem lançamentos com lista vazia", () => {
    const { result } = renderHook(() =>
      useAccountAggregation([], [makeAccount({ id: "acc-1", name: "Itaú" })])
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].txs).toHaveLength(0);
  });

  // Caso antigo com account_id casando: permanece verde, mas sob o roteamento por id o nome
  // não é consultado — deixa de ser o caso principal do case-insensitive (spec §9).
  it("casamento por id resolve o bloco mesmo com o nome em caixa diferente", () => {
    const { result } = renderHook(() =>
      useAccountAggregation(
        [makeTx({ id: "t1", account_name: "ITAÚ" })],
        [makeAccount({ id: "acc-1", name: "Itaú" })]
      )
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].txs).toHaveLength(1);
  });

  // Contrato principal do case-insensitive: sob roteamento por id o nome só é consultado
  // no fallback — nomes em caixas diferentes SEM account_id equivalente caem no mesmo
  // bloco placeholder no map de contas (D17c).
  it("agrupamento é case-insensitive por nome no fallback sem account_id equivalente", () => {
    const { result } = renderHook(() =>
      useAccountAggregation(
        [makeTx({ id: "t1", account_id: undefined, account_name: "ITAÚ" })],
        [makeAccount({ id: "acc-1", name: "Itaú" })]
      )
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].account.name).toBe("Itaú");
    expect(result.current[0].txs).toHaveLength(1);
  });

  it("ordena por data e, em empate, por inclusão (created_at) — nunca por id", () => {
    // R2 (guarda do 05e): a data continua sendo o critério principal — 10/03 incluída
    // depois aparece antes da 15/03 incluída antes (falharia se created_at virasse
    // critério principal).
    const guard = renderHook(() =>
      useAccountAggregation(
        [
          makeTx({ id: "t-10", date: "2026-03-10", created_at: "2026-03-20T09:00:00Z" }),
          makeTx({ id: "t-15", date: "2026-03-15", created_at: "2026-03-01T09:00:00Z" }),
        ],
        [makeAccount({ id: "acc-1", name: "Itaú" })]
      )
    );

    expect(guard.result.current[0].txs.map((t) => t.id)).toEqual(["t-10", "t-15"]);

    // R3: mesma date, created_at distintos e id invertido em relação à ordem esperada —
    // o incluído primeiro aparece primeiro (id não participa da ordenação visível).
    const red = renderHook(() =>
      useAccountAggregation(
        [
          makeTx({ id: "t9", date: "2026-03-15", created_at: "2026-03-10T09:00:00Z" }),
          makeTx({ id: "t1", date: "2026-03-15", created_at: "2026-03-12T09:00:00Z" }),
        ],
        [makeAccount({ id: "acc-1", name: "Itaú" })]
      )
    );

    expect(red.result.current[0].txs.map((t) => t.id)).toEqual(["t9", "t1"]);
  });

  it("tolera created_at ausente e preserva a ordem de entrada no empate total", () => {
    // R4/D16b: fixture sem created_at (undefined) + id invertido vs ordem de entrada —
    // nenhum erro de execução e ordem de entrada preservada (empate total = sort estável).
    const txs = [
      makeTx({ id: "t9", date: "2026-03-15", created_at: undefined }),
      makeTx({ id: "t1", date: "2026-03-15", created_at: undefined }),
    ];
    const accounts = [makeAccount({ id: "acc-1", name: "Itaú" })];
    const render = () => renderHook(() => useAccountAggregation(txs, accounts));

    expect(render).not.toThrow();

    const { result } = render();
    expect(result.current[0].txs.map((t) => t.id)).toEqual(["t9", "t1"]);
  });

  it("partição estrutural: contas antes de cartões mesmo alfabeticamente intercalados", () => {
    // Cenário 10 (R5): Itaú conta, Nubank cartão, Sicredi conta, Uber cartão →
    // ordem exibida Itaú, Sicredi, Nubank, Uber (a ordem nasce da concatenação dos
    // dois maps, sem filtro de partição).
    const { result } = renderHook(() =>
      useAccountAggregation(
        [],
        [
          makeAccount({ id: "acc-1", name: "Itaú", type: "conta" }),
          makeAccount({ id: "acc-2", name: "Nubank", type: "cartao" }),
          makeAccount({ id: "acc-3", name: "Sicredi", type: "conta" }),
          makeAccount({ id: "acc-4", name: "Uber", type: "cartao" }),
        ]
      )
    );

    expect(result.current.map((c) => c.account.name)).toEqual([
      "Itaú",
      "Sicredi",
      "Nubank",
      "Uber",
    ]);
  });

  it("placeholder 'Sem Conta' (tipo conta) aparece antes do cartão cadastrado", () => {
    // Cenário 14 (R6/D17b): bloco criado só de lançamento é conta e nasce no map de
    // contas — antes de qualquer cartão.
    const { result } = renderHook(() =>
      useAccountAggregation(
        [makeTx({ id: "t1", account_id: "acc-x", account_name: undefined })],
        [makeAccount({ id: "c1", name: "Nubank", type: "cartao" })]
      )
    );

    expect(result.current).toHaveLength(2);
    expect(result.current[0].account).toMatchObject({ name: "Sem Conta", type: "conta" });
    expect(result.current[1].account).toMatchObject({ id: "c1", name: "Nubank", type: "cartao" });
    expect(result.current[0].txs).toHaveLength(1);
    expect(result.current[1].txs).toHaveLength(0);
  });

  it("cenário 13: DOIS blocos distintos ambos intitulados 'Itaú', conta antes do cartão", () => {
    // 'Itaú' conta (a-conta) e 'Itaú' cartão (a-cartao) — identidade (nome normalizado,
    // tipo) da Pluto 11 — devem virar dois blocos, não um bloco único colapsado.
    const { result } = renderHook(() =>
      useAccountAggregation(
        [],
        [
          makeAccount({ id: "a-conta", name: "Itaú", type: "conta" }),
          makeAccount({ id: "a-cartao", name: "Itaú", type: "cartao" }),
        ]
      )
    );

    expect(result.current).toHaveLength(2);
    expect(result.current[0].account).toMatchObject({ id: "a-conta", name: "Itaú", type: "conta" });
    expect(result.current[1].account).toMatchObject({ id: "a-cartao", name: "Itaú", type: "cartao" });
  });

  it("cenário 26: L1 só no bloco da conta Itaú e L2 só no bloco do cartão Itaú", () => {
    // Roteamento por account_id (R11/D17c): mesmo account_name nos dois lançamentos,
    // cada um cai no bloco do seu id — nunca no homônimo errado.
    const { result } = renderHook(() =>
      useAccountAggregation(
        [
          makeTx({ id: "l1", account_id: "a-conta", account_name: "Itaú" }),
          makeTx({ id: "l2", account_id: "a-cartao", account_name: "Itaú" }),
        ],
        [
          makeAccount({ id: "a-conta", name: "Itaú", type: "conta" }),
          makeAccount({ id: "a-cartao", name: "Itaú", type: "cartao" }),
        ]
      )
    );

    expect(result.current).toHaveLength(2);

    const conta = result.current.find((c) => c.account.type === "conta");
    const cartao = result.current.find((c) => c.account.type === "cartao");

    expect(conta?.account.name).toBe("Itaú");
    expect(cartao?.account.name).toBe("Itaú");
    expect(conta?.txs.map((t) => t.id)).toEqual(["l1"]);
    expect(cartao?.txs.map((t) => t.id)).toEqual(["l2"]);
  });

  it("fallback por nome: lançamento sem account_id acumula no bloco de mesmo nome (guarda verde)", () => {
    // Espelha as 5 fixtures SEM account_id de transactions-page.test.tsx (premissa 24):
    // sem correspondência por id, o lançamento cai no bloco de mesmo nome no map de contas.
    const { result } = renderHook(() =>
      useAccountAggregation(
        [
          makeTx({ id: "t1", account_id: undefined, created_at: undefined, account_name: "Itaú Corrente" }),
          makeTx({ id: "t2", account_id: undefined, created_at: undefined, account_name: "Itaú Corrente" }),
        ],
        [makeAccount({ id: "a1", name: "Itaú Corrente", type: "conta" })]
      )
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].account.name).toBe("Itaú Corrente");
    expect(result.current[0].txs.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("fallback por nome: nome que só existe entre os cartões nasce placeholder à parte no map de contas", () => {
    // R9/R11/D17c: sem match por id, o lançamento jamais é injetado no bloco de cartão
    // homônimo — nasce bloco placeholder tipo 'conta' à parte.
    const { result } = renderHook(() =>
      useAccountAggregation(
        [makeTx({ id: "t1", account_id: "acc-x", account_name: "Nubank" })],
        [makeAccount({ id: "c1", name: "Nubank", type: "cartao" })]
      )
    );

    expect(result.current).toHaveLength(2);
    expect(result.current[0].account).toMatchObject({ id: "acc-x", name: "Nubank", type: "conta" });
    expect(result.current[0].txs).toHaveLength(1);
    expect(result.current[1].account).toMatchObject({ id: "c1", name: "Nubank", type: "cartao" });
    expect(result.current[1].txs).toHaveLength(0);
  });

  it("conta sem type é particionada para o map de contas mesmo vindo depois de um cartão", () => {
    // Espelha a fixture de transactions-checklist.test.tsx:89 (premissa 25) — o que não
    // é cartão (type === 'cartao') vai para o map de contas.
    const accSemType = {
      id: "acc1",
      name: "Itaú",
      created_at: "",
      created_by: "",
    } as unknown as Account;

    const { result } = renderHook(() =>
      useAccountAggregation(
        [],
        [makeAccount({ id: "c1", name: "Nubank", type: "cartao" }), accSemType]
      )
    );

    expect(result.current.map((c) => c.account.name)).toEqual(["Itaú", "Nubank"]);
  });

  it("guarda só-cartões: preserva a ordem atual", () => {
    // Cenário 12: só cartões → nenhuma mudança perceptível de ordem.
    const { result } = renderHook(() =>
      useAccountAggregation(
        [],
        [
          makeAccount({ id: "c1", name: "Nubank", type: "cartao" }),
          makeAccount({ id: "c2", name: "Uber", type: "cartao" }),
          makeAccount({ id: "c3", name: "Alelo", type: "cartao" }),
        ]
      )
    );

    expect(result.current.map((c) => c.account.name)).toEqual(["Nubank", "Uber", "Alelo"]);
    expect(result.current.every((c) => c.account.type === "cartao")).toBe(true);
  });

  it("guarda só-contas: preserva a ordem atual", () => {
    // Cenário 11: só contas → nenhuma mudança perceptível de ordem.
    const { result } = renderHook(() =>
      useAccountAggregation(
        [makeTx({ id: "t1", account_id: "acc-1" }), makeTx({ id: "t2", account_id: "acc-2" })],
        [
          makeAccount({ id: "acc-1", name: "Sicredi", type: "conta" }),
          makeAccount({ id: "acc-2", name: "Itaú", type: "conta" }),
        ]
      )
    );

    expect(result.current.map((c) => c.account.name)).toEqual(["Sicredi", "Itaú"]);
    expect(result.current.every((c) => c.account.type === "conta")).toBe(true);
  });
});
