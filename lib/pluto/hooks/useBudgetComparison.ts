"use client";

import { useMemo } from "react";
import type {
  BudgetComparisonRow,
  BudgetItem,
  TransactionWithDetails,
} from "@/lib/pluto/types";

export interface BudgetComparison {
  receitaRows: BudgetComparisonRow[];
  despesaRows: BudgetComparisonRow[];
  totalReceitaPrevisto: number;
  totalReceitaReal: number;
  totalDespesaPrevisto: number;
  totalDespesaReal: number;
  saldoMes: number;
}

/**
 * Agrega orçamento (previsto) vs lançamentos (real) por categoria,
 * incluindo categorias com transações mas sem orçamento.
 * Reembolsos (is_refund) abatem o realizado de despesas.
 */
export function useBudgetComparison(
  transactions: TransactionWithDetails[],
  budgetItems: BudgetItem[]
): BudgetComparison {
  return useMemo(() => {
    const receitasBudgetCats = budgetItems.filter((b) => b.category_type === "receita");
    const despesasBudgetCats = budgetItems.filter((b) => b.category_type === "despesa");

    const receitaCatMap = new Map<string, BudgetComparisonRow>();
    receitasBudgetCats.forEach((b) => {
      receitaCatMap.set(b.category_name.toLowerCase(), {
        category_name: b.category_name,
        previsto: Number(b.amount),
        real: 0,
      });
    });

    const despesaCatMap = new Map<string, BudgetComparisonRow>();
    despesasBudgetCats.forEach((b) => {
      despesaCatMap.set(b.category_name.toLowerCase(), {
        category_name: b.category_name,
        previsto: Number(b.amount),
        real: 0,
      });
    });

    transactions.forEach((tx) => {
      const catName = tx.category_name || "Sem categoria";
      const key = catName.toLowerCase();
      if (tx.type === "receita") {
        const existing = receitaCatMap.get(key) || {
          category_name: catName,
          previsto: 0,
          real: 0,
        };
        existing.real += Number(tx.amount);
        receitaCatMap.set(key, existing);
      } else {
        const existing = despesaCatMap.get(key) || {
          category_name: catName,
          previsto: 0,
          real: 0,
        };
        if (tx.is_refund) {
          existing.real -= Number(tx.amount);
        } else {
          existing.real += Number(tx.amount);
        }
        despesaCatMap.set(key, existing);
      }
    });

    const receitaRows = Array.from(receitaCatMap.values());
    const despesaRows = Array.from(despesaCatMap.values());

    const totalReceitaPrevisto = receitaRows.reduce((acc, r) => acc + r.previsto, 0);
    const totalReceitaReal = receitaRows.reduce((acc, r) => acc + r.real, 0);

    const totalDespesaPrevisto = despesaRows.reduce((acc, r) => acc + r.previsto, 0);
    const totalDespesaReal = despesaRows.reduce((acc, r) => acc + r.real, 0);

    const saldoMes = totalReceitaReal - totalDespesaReal;

    return {
      receitaRows,
      despesaRows,
      totalReceitaPrevisto,
      totalReceitaReal,
      totalDespesaPrevisto,
      totalDespesaReal,
      saldoMes,
    };
  }, [transactions, budgetItems]);
}
