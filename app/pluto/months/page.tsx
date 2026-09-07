"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod, MonthlyPeriod } from "@/lib/pluto/db/months";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseErrorMessage } from "@/lib/utils";
import Link from "next/link";
import { PlutoLayout } from "@/components/layout/PlutoLayout";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const supabase = createClient();

export default function MonthsPage() {
  const [year, setYear] = useState<number>(2026);
  const [periods, setPeriods] = useState<MonthlyPeriod[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPeriods = useCallback(async (silent = false) => {
    setErrorMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      const data = await getMonthlyPeriods(supabase, year);
      setPeriods(data);
    } catch (err: unknown) {
      console.error("Erro ao carregar períodos:", err);
      const msg = parseErrorMessage(err);
      if (msg.includes("relation") && msg.includes("does not exist")) {
        setErrorMessage("A tabela 'monthly_periods' não existe no Supabase. Execute o script utils/migrations/migration-feature-4.sql no console SQL do Supabase.");
      } else {
        setErrorMessage("Erro ao carregar períodos: " + msg);
      }
    }
  }, [year]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPeriods();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPeriods]);

  const getOrFetchUserEmail = async (): Promise<string | null> => {
    if (userEmail) return userEmail;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        return user.email;
      }
    } catch (e) {
      console.error("Erro ao obter usuário:", e);
    }
    return null;
  };

  const handleOpenMonth = async (monthIndex: number) => {
    setErrorMessage(null);
    setActionLoading((prev) => ({ ...prev, [monthIndex]: true }));
    try {
      const email = await getOrFetchUserEmail();
      if (!email) {
        setErrorMessage("Não foi possível identificar o usuário autenticado. Por favor, certifique-se de estar logado.");
        return;
      }

      await openMonthlyPeriod(supabase, year, monthIndex, email);
      await loadPeriods(true);
    } catch (err: unknown) {
      console.error("Erro ao abrir mês:", err);
      const msg = parseErrorMessage(err);
      if (msg.includes("relation") && msg.includes("does not exist")) {
        setErrorMessage("A tabela 'monthly_periods' não existe no banco de dados. Execute o script SQL utils/migrations/migration-feature-4.sql no Supabase.");
      } else {
        setErrorMessage(`Erro ao abrir o mês: ${msg}`);
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [monthIndex]: false }));
    }
  };

  const handleCloseMonth = async (monthIndex: number) => {
    setErrorMessage(null);
    setActionLoading((prev) => ({ ...prev, [monthIndex]: true }));
    try {
      const email = await getOrFetchUserEmail();
      if (!email) {
        setErrorMessage("Não foi possível identificar o usuário autenticado. Por favor, certifique-se de estar logado.");
        return;
      }

      await closeMonthlyPeriod(supabase, year, monthIndex, email);
      await loadPeriods(true);
    } catch (err: unknown) {
      console.error("Erro ao encerrar mês:", err);
      const msg = parseErrorMessage(err);
      if (msg.includes("relation") && msg.includes("does not exist")) {
        setErrorMessage("A tabela 'monthly_periods' não existe no banco de dados. Execute o script SQL utils/migrations/migration-feature-4.sql no Supabase.");
      } else {
        setErrorMessage(`Erro ao encerrar o mês: ${msg}`);
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [monthIndex]: false }));
    }
  };

  // Métricas do resumo
  const totalOpen = periods.filter((p) => p.status === "aberto").length;
  const totalClosed = periods.filter((p) => p.status === "encerrado").length;
  const totalNotStarted = 12 - (totalOpen + totalClosed);

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
              onClick={() => handleOpenMonth(monthNum)}
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
                onClick={() => handleCloseMonth(monthNum)}
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
                onClick={() => handleOpenMonth(monthNum)}
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
    </PlutoLayout>
  );
}