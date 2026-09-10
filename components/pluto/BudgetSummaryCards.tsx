"use client";

import { formatCurrency } from "@/lib/pluto/types";

export interface BudgetSummaryCardsProps {
  totalRevenues: number;
  totalExpenses: number;
  netBudget: number;
}

/**
 * Cards de totais (receitas/despesas/saldo planejado).
 * Extraído de BudgetPage sem mudança visual.
 */
export default function BudgetSummaryCards({ totalRevenues, totalExpenses, netBudget }: BudgetSummaryCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border p-4 bg-muted/40">
        <span className="text-xs font-['CaesarDressing'] text-[#35472D] uppercase tracking-wider">Receitas Previstas</span>
        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenues)}</p>
      </div>
      <div className="rounded-lg border p-4 bg-muted/40">
        <span className="text-xs font-['CaesarDressing'] text-[#35472D] uppercase tracking-wider">Despesas Previstas</span>
        <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalExpenses)}</p>
      </div>
      <div className="rounded-lg border p-4 bg-muted/40">
        <span className="text-xs font-['CaesarDressing'] text-[#35472D] uppercase tracking-wider">Saldo Planejado</span>
        <p className={`text-2xl font-bold ${netBudget >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {formatCurrency(netBudget)}
        </p>
      </div>
    </div>
  );
}
