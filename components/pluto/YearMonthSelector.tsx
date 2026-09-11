"use client";

import { Label } from "@/components/ui/label";
import { MONTH_NAMES } from "@/lib/pluto/types";
import type { MonthlyPeriod } from "@/lib/pluto/types";

export interface YearMonthSelectorProps {
  availableYears: number[];
  openMonths: MonthlyPeriod[];
  selectedYear: number;
  selectedMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

/**
 * Seletores de ano/mês da página de lançamentos.
 * Extraído da TransactionsPage sem mudança visual (Fase 3).
 */
export default function YearMonthSelector({
  availableYears,
  openMonths,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}: YearMonthSelectorProps) {
  return (
    <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        {availableYears.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Label htmlFor="year-select" className="text-xs font-semibold">
              Ano:
            </Label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="rounded border p-1.5 bg-card text-card-foreground text-sm font-medium"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {openMonths.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Label htmlFor="month-select" className="text-xs font-semibold">
              Mês:
            </Label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="rounded border p-1.5 bg-card text-card-foreground text-sm font-medium"
            >
              {openMonths.map((p) => (
                <option key={p.month} value={p.month}>
                  {MONTH_NAMES[p.month - 1]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
