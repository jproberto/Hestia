"use client";

import { formatCurrency } from "@/lib/pluto/types";
import type { BudgetComparisonRow } from "@/lib/pluto/types";

export interface BudgetComparisonSectionProps {
  receitaRows: BudgetComparisonRow[];
  despesaRows: BudgetComparisonRow[];
  totalReceitaPrevisto: number;
  totalReceitaReal: number;
  totalDespesaPrevisto: number;
  totalDespesaReal: number;
}

/**
 * Comparativo orçado vs real (receitas e despesas lado a lado).
 * Extraído da TransactionsPage sem mudança visual (Fase 2).
 */
export default function BudgetComparisonSection({
  receitaRows,
  despesaRows,
  totalReceitaPrevisto,
  totalReceitaReal,
  totalDespesaPrevisto,
  totalDespesaReal,
}: BudgetComparisonSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tabela de Receitas (Esquerda) */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
          <div className="bg-success-soft p-3 border-b border-success-border flex items-center justify-between">
<h3 className="font-bold text-sm text-[#35472D] font-display tracking-wider">
                📈 Receitas
              </h3>
            <div className="text-xs text-success font-bold">
              Real: {formatCurrency(totalReceitaReal)}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-[#35472D] text-xs font-display tracking-wider">
                  <th className="p-2.5">Categoria</th>
                  <th className="p-2.5 text-right">Previsto</th>
                  <th className="p-2.5 text-right">Real</th>
                </tr>
              </thead>
              <tbody>
                {receitaRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-xs text-muted-foreground">
                      Nenhuma categoria de receita cadastrada.
                    </td>
                  </tr>
                ) : (
                  receitaRows.map((r, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/20 text-xs">
                      <td className="p-2.5 font-medium">{r.category_name}</td>
                      <td className="p-2.5 text-right text-muted-foreground">
                        {formatCurrency(r.previsto)}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(r.real)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/50 font-bold text-xs">
                  <td className="p-2.5">Total Receitas</td>
                  <td className="p-2.5 text-right text-muted-foreground">
                    {formatCurrency(totalReceitaPrevisto)}
                  </td>
                  <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(totalReceitaReal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Tabela de Despesas (Direita) */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
          <div className="bg-danger-soft p-3 border-b border-danger-border flex items-center justify-between">
<h3 className="font-bold text-sm text-[#35472D] font-display tracking-wider">
                📉 Despesas
              </h3>
            <div className="text-xs text-danger font-bold">
              Real: {formatCurrency(totalDespesaReal)}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-[#35472D] text-xs font-display tracking-wider">
                  <th className="p-2.5">Categoria</th>
                  <th className="p-2.5 text-right">Previsto</th>
                  <th className="p-2.5 text-right">Real</th>
                </tr>
              </thead>
              <tbody>
                {despesaRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-xs text-muted-foreground">
                      Nenhuma categoria de despesa cadastrada.
                    </td>
                  </tr>
                ) : (
                  despesaRows.map((d, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/20 text-xs">
                      <td className="p-2.5 font-medium">{d.category_name}</td>
                      <td className="p-2.5 text-right text-muted-foreground">
                        {formatCurrency(d.previsto)}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-rose-700 dark:text-rose-300">
                        {formatCurrency(d.real)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/50 font-bold text-xs">
                  <td className="p-2.5">Total Despesas</td>
                  <td className="p-2.5 text-right text-muted-foreground">
                    {formatCurrency(totalDespesaPrevisto)}
                  </td>
                  <td className="p-2.5 text-right text-rose-700 dark:text-rose-300">
                    {formatCurrency(totalDespesaReal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
