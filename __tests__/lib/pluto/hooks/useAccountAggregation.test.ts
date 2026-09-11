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

  it("agrupamento é case-insensitive por nome da conta", () => {
    const { result } = renderHook(() =>
      useAccountAggregation(
        [makeTx({ id: "t1", account_name: "ITAÚ" })],
        [makeAccount({ id: "acc-1", name: "Itaú" })]
      )
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].txs).toHaveLength(1);
  });

  it("ordena transações do cartão por data e id", () => {
    const { result } = renderHook(() =>
      useAccountAggregation(
        [
          makeTx({ id: "t2", date: "2026-03-15" }),
          makeTx({ id: "t1", date: "2026-03-10" }),
        ],
        [makeAccount({ id: "acc-1", name: "Itaú" })]
      )
    );

    expect(result.current[0].txs.map((t) => t.id)).toEqual(["t1", "t2"]);
  });
});
