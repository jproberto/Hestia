"use client";

import { MONTH_NAMES } from "@/lib/pluto/types";
import type { MonthlyPeriod } from "@/lib/pluto/types";

export interface MonthsGridProps {
  year: number;
  periods: MonthlyPeriod[];
  totalOpen: number;
  totalClosed: number;
  totalNotStarted: number;
  actionLoading: Record<number, boolean>;
  onOpenMonth: (monthIndex: number) => void;
  onCloseMonth: (monthIndex: number) => void;
}

/**
 * Resumo anual + grid dos 12 meses com badge de status e ação
 * (abrir/encerrar/reabrir). Extraído de MonthsPage sem mudança visual.
 */
export default function MonthsGrid({
  year,
  periods,
  totalOpen,
  totalClosed,
  totalNotStarted,
  actionLoading,
  onOpenMonth,
  onCloseMonth,
}: MonthsGridProps) {
  return (
    <>
      {/* Resumo Anual */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border p-4 bg-muted/20">
        <div className="text-center">
          <p className="text-xs font-['CaesarDressing'] text-[#35472D] uppercase tracking-wider">Abertos</p>
          <p className="text-2xl font-bold text-emerald-600">{totalOpen}</p>
        </div>
        <div className="text-center border-x">
          <p className="text-xs font-['CaesarDressing'] text-[#35472D] uppercase tracking-wider">Encerrados</p>
          <p className="text-2xl font-bold text-rose-600">{totalClosed}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-['CaesarDressing'] text-[#35472D] uppercase tracking-wider">Não Iniciados</p>
          <p className="text-2xl font-bold text-zinc-500">{totalNotStarted}</p>
        </div>
      </div>

      {/* Grid de 12 meses */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MONTH_NAMES.map((name, index) => {
          const monthNum = index + 1;
          const period = periods.find((p) => p.month === monthNum);
          const isActLoading = actionLoading[monthNum] || false;

          let statusBadge = (
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
              Não Iniciado
            </span>
          );
          let actionButton = (
            <button
              type="button"
              className="w-full mt-2 rounded border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              disabled={isActLoading}
              onClick={() => onOpenMonth(monthNum)}
            >
              {isActLoading ? "Processando..." : "Abrir Mês"}
            </button>
          );

          if (period?.status === "aberto") {
            statusBadge = (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                Aberto
              </span>
            );
            actionButton = (
              <button
                type="button"
                className="w-full mt-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                disabled={isActLoading}
                onClick={() => onCloseMonth(monthNum)}
              >
                {isActLoading ? "Processando..." : "Encerrar Mês"}
              </button>
            );
          } else if (period?.status === "encerrado") {
            statusBadge = (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                Encerrado
              </span>
            );
            actionButton = (
              <button
                type="button"
                className="w-full mt-2"
                disabled={isActLoading}
                onClick={() => onOpenMonth(monthNum)}
              >
                {isActLoading ? "Processando..." : "Reabrir Mês"}
              </button>
            );
          }

          return (
            <div key={name} className="flex flex-col justify-between rounded-lg border p-4 hover:shadow-md transition-shadow bg-card">
              <div>
                <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2">
                  <h3 className="text-sm font-['CaesarDressing'] text-[#35472D] tracking-wider">{name}</h3>
                  {statusBadge}
                </div>
                <p className="text-xs text-muted-foreground">
                  Período operacional do ano {year}.
                </p>
              </div>
              {actionButton}
            </div>
          );
        })}
      </div>
    </>
  );
}
