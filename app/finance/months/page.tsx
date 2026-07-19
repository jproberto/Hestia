"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod, MonthlyPeriod } from "@/lib/db/months";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const supabase = createClient();

export default function MonthsPage() {
  const [year, setYear] = useState<number>(2026);
  const [periods, setPeriods] = useState<MonthlyPeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  const loadPeriods = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      const data = await getMonthlyPeriods(supabase, year);
      setPeriods(data);
    } catch (err) {
      console.error("Erro ao carregar períodos:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPeriods();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPeriods]);

  const handleOpenMonth = async (monthIndex: number) => {
    if (!userEmail) return;
    setActionLoading((prev) => ({ ...prev, [monthIndex]: true }));
    try {
      await openMonthlyPeriod(supabase, year, monthIndex, userEmail);
      await loadPeriods(true);
    } catch (err) {
      console.error("Erro ao abrir mês:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [monthIndex]: false }));
    }
  };

  const handleCloseMonth = async (monthIndex: number) => {
    if (!userEmail) return;
    setActionLoading((prev) => ({ ...prev, [monthIndex]: true }));
    try {
      await closeMonthlyPeriod(supabase, year, monthIndex, userEmail);
      await loadPeriods(true);
    } catch (err) {
      console.error("Erro ao encerrar mês:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [monthIndex]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando períodos...</p>
      </div>
    );
  }

  // Métricas do resumo
  const totalOpen = periods.filter((p) => p.status === "aberto").length;
  const totalClosed = periods.filter((p) => p.status === "encerrado").length;
  const totalNotStarted = 12 - (totalOpen + totalClosed);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      {/* Menu Superior Financeiro */}
      <div className="flex border-b pb-1 gap-6">
        <Link href="/finance/budget" className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          Orçamento Anual
        </Link>
        <Link href="/finance/months" className="pb-2 text-sm font-semibold border-b-2 border-primary text-foreground">
          Meses e Períodos
        </Link>
      </div>

      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meses e Períodos</h1>
          <p className="text-sm text-muted-foreground">Abra ou encerre meses operacionais para controle de lançamentos.</p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Resumo Anual */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border p-4 bg-muted/20">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Abertos</p>
          <p className="text-2xl font-bold text-emerald-600">{totalOpen}</p>
        </div>
        <div className="text-center border-x">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Encerrados</p>
          <p className="text-2xl font-bold text-rose-600">{totalClosed}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Não Iniciados</p>
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
            <Button
              size="sm"
              className="w-full mt-2"
              disabled={isActLoading}
              onClick={() => handleOpenMonth(monthNum)}
            >
              {isActLoading ? "Processando..." : "Abrir Mês"}
            </Button>
          );

          if (period?.status === "aberto") {
            statusBadge = (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                Aberto
              </span>
            );
            actionButton = (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                disabled={isActLoading}
                onClick={() => handleCloseMonth(monthNum)}
              >
                {isActLoading ? "Processando..." : "Encerrar Mês"}
              </Button>
            );
          } else if (period?.status === "encerrado") {
            statusBadge = (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                Encerrado
              </span>
            );
            actionButton = (
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                disabled={isActLoading}
                onClick={() => handleOpenMonth(monthNum)}
              >
                {isActLoading ? "Processando..." : "Reabrir Mês"}
              </Button>
            );
          }

          return (
            <div key={name} className="flex flex-col justify-between rounded-lg border p-4 hover:shadow-md transition-shadow bg-card">
              <div>
                <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2">
                  <h3 className="font-bold text-sm">{name}</h3>
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
    </div>
  );
}
