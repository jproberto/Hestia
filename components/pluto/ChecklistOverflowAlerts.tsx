"use client";

import { BudgetOverflowResult, formatCurrency } from "@/lib/pluto/types";

interface ChecklistOverflowAlertsProps {
  overflowCategories: BudgetOverflowResult[];
}

export default function ChecklistOverflowAlerts({ overflowCategories }: ChecklistOverflowAlertsProps) {
  if (overflowCategories.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {overflowCategories.map((overflow) => (
        <div
          key={overflow.categoryId}
          className="font-semibold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 rounded-lg p-3 text-sm"
          role="alert"
        >
          Atenção: O total previsto para &apos;{overflow.categoryName}&apos; neste mês (
          <strong>{formatCurrency(overflow.totalChecklist)}</strong>
          ) excede o orçamento planejado (
          <strong>{formatCurrency(overflow.budgetAmount)}</strong>
          ).
        </div>
      ))}
    </div>
  );
}