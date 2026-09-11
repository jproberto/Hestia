"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { PlutoLayout } from "@/components/layout/PlutoLayout";
import MonthsGrid from "@/components/pluto/MonthsGrid";
import { useMonthsData } from "@/lib/pluto/hooks/useMonthsData";

export default function MonthsPage() {
  const [year, setYear] = useState<number>(2026);
  const {
    periods,
    actionLoading,
    errorMessage,
    setErrorMessage,
    totalOpen,
    totalClosed,
    totalNotStarted,
    handleOpenMonth,
    handleCloseMonth,
  } = useMonthsData(year);

  return (
    <PlutoLayout pageTitle="Meses e Períodos" pageSubtitle="Abra ou encerre meses operacionais para controle de lançamentos.">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="year-select">Ano:</Label>
        <select
          id="year-select"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="rounded border p-1 bg-card text-card-foreground text-sm"
        >
          <option value={2026}>2026</option>
          <option value={2027}>2027</option>
          <option value={2028}>2028</option>
        </select>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center justify-between">
            <p className="font-medium">{errorMessage}</p>
            <button
              type="button"
              className="h-auto p-1 text-rose-800 hover:bg-rose-100"
              onClick={() => setErrorMessage(null)}
            >
              Fechar ✕
            </button>
          </div>
        </div>
      )}

      <MonthsGrid
        year={year}
        periods={periods}
        totalOpen={totalOpen}
        totalClosed={totalClosed}
        totalNotStarted={totalNotStarted}
        actionLoading={actionLoading}
        onOpenMonth={(monthNum) => void handleOpenMonth(monthNum)}
        onCloseMonth={(monthNum) => void handleCloseMonth(monthNum)}
      />
    </PlutoLayout>
  );
}
