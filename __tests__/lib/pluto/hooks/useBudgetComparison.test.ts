import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBudgetComparison } from "@/lib/pluto/hooks/useBudgetComparison";
import type { BudgetItem, TransactionWithDetails } from "@/lib/pluto/types";

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

function makeBudget(overrides: Partial<BudgetItem> & { category_id: string }): BudgetItem {
  return {
    category_name: "Categoria",
    category_type: "despesa",
    amount: 0,
    start_month: 1,
    ...overrides,
  };
}

describe("useBudgetComparison", () => {
  it("agrega previsto do orçamento e real dos lançamentos por categoria", () => {
    const { result } = renderHook(() =>
      useBudgetComparison(
        [makeTx({ id: "t1", amount: 150 })],
        [makeBudget({ category_id: "cat-1", category_name: "Alimentação", amount: 1000 })]
      )
    );

    expect(result.current.despesaRows).toHaveLength(1);
    expect(result.current.despesaRows[0]).toMatchObject({
      category_name: "Alimentação",
      previsto: 1000,
      real: 150,
    });
    expect(result.current.totalDespesaPrevisto).toBe(1000);
    expect(result.current.totalDespesaReal).toBe(150);
  });

  it("reembolso abate o realizado de despesas", () => {
    const { result } = renderHook(() =>
      useBudgetComparison(
        [
          makeTx({ id: "t1", amount: 200 }),
          makeTx({ id: "t2", amount: 50, is_refund: true }),
        ],
        []
      )
    );

    expect(result.current.totalDespesaReal).toBe(150);
  });

  it("inclui categorias com transações mas sem orçamento (previsto 0)", () => {
    const { result } = renderHook(() =>
      useBudgetComparison([makeTx({ id: "t1", category_name: "Lazer" })], [])
    );

    expect(result.current.despesaRows).toHaveLength(1);
    expect(result.current.despesaRows[0]).toMatchObject({ category_name: "Lazer", previsto: 0, real: 100 });
  });

  it("separa receitas de despesas e calcula o saldo do mês", () => {
    const { result } = renderHook(() =>
      useBudgetComparison(
        [
          makeTx({ id: "t1", type: "receita", amount: 5000, category_name: "Salário", category_id: "cat-r" }),
          makeTx({ id: "t2", type: "despesa", amount: 200 }),
        ],
        []
      )
    );

    expect(result.current.receitaRows).toHaveLength(1);
    expect(result.current.totalReceitaReal).toBe(5000);
    expect(result.current.totalDespesaReal).toBe(200);
    expect(result.current.saldoMes).toBe(4800);
  });

  it("agrupamento é case-insensitive por nome da categoria", () => {
    const { result } = renderHook(() =>
      useBudgetComparison(
        [makeTx({ id: "t1", category_name: "ALIMENTAÇÃO" })],
        [makeBudget({ category_id: "cat-1", category_name: "Alimentação", amount: 1000 })]
      )
    );

    expect(result.current.despesaRows).toHaveLength(1);
    expect(result.current.despesaRows[0].real).toBe(100);
  });
});
