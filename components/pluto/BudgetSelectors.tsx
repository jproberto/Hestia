"use client";

import { Label } from "@/components/ui/label";
import type { BudgetAdjustment } from "@/lib/pluto/types";

export interface BudgetSelectorsProps {
  adjustments: BudgetAdjustment[];
  selectedAdjustmentId: string | null;
  onSelectAdjustment: (id: string) => void;
  year: number;
  onSelectYear: (year: number) => void;
}

/**
 * Seletores de ajuste e ano da página de orçamento.
 * Extraído de BudgetPage sem mudança visual.
 */
export default function BudgetSelectors({
  adjustments,
  selectedAdjustmentId,
  onSelectAdjustment,
  year,
  onSelectYear,
}: BudgetSelectorsProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor="adjustment-select">Ajuste:</Label>
      <select
        id="adjustment-select"
        value={selectedAdjustmentId || ""}
        onChange={(e) => onSelectAdjustment(e.target.value)}
        className="rounded border p-1 bg-card text-card-foreground text-sm"
      >
        {adjustments.map((adj) => {
          const label = adj.start_month === 1
            ? `Orçamento Inicial ${adj.year}`
            : adj.description;
          return (
            <option key={adj.id} value={adj.id}>
              {label}
            </option>
          );
        })}
      </select>

      <Label htmlFor="year-select" className="ml-2">Ano:</Label>
      <select
        id="year-select"
        value={year}
        onChange={(e) => onSelectYear(parseInt(e.target.value))}
        className="rounded border p-1 bg-card text-card-foreground text-sm"
      >
        <option value={2026}>2026</option>
        <option value={2027}>2027</option>
        <option value={2028}>2028</option>
      </select>
    </div>
  );
}
