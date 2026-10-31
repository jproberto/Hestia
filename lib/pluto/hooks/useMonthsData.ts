"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod } from "@/lib/pluto/db/months";
import { parseErrorMessage } from "@/lib/utils";
import type { MonthlyPeriod } from "@/lib/pluto/types";

export interface MonthsData {
  periods: MonthlyPeriod[];
  userEmail: string;
  actionLoading: Record<number, boolean>;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  totalOpen: number;
  totalClosed: number;
  totalNotStarted: number;
  handleOpenMonth: (monthIndex: number) => Promise<void>;
  handleCloseMonth: (monthIndex: number) => Promise<void>;
}

function isMissingTableMessage(msg: string): boolean {
  return msg.includes("relation") && msg.includes("does not exist");
}

/**
 * Estado e operações da página de meses (extraído de MonthsPage sem
 * mudança de comportamento): carrega períodos do ano, abre/encerra meses
 * com loading por ação e mapeia o erro de tabela ausente para a dica de migração.
 */
export function useMonthsData(year: number): MonthsData {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [periods, setPeriods] = useState<MonthlyPeriod[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPeriods = useCallback(async (silent = false) => {
    setErrorMessage(null);
    try {
      const email = await db.getUserEmail();
      if (email) {
        setUserEmail(email);
      }

      const data = await getMonthlyPeriods(db, year);
      setPeriods(data);
    } catch (err: unknown) {
      console.error("Erro ao carregar períodos:", err);
      const msg = parseErrorMessage(err);
      if (isMissingTableMessage(msg)) {
        setErrorMessage("A tabela 'monthly_periods' não existe no Supabase. Execute o script utils/migrations/migration-feature-3.sql no console SQL do Supabase.");
      } else {
        setErrorMessage("Erro ao carregar períodos: " + msg);
      }
    }
  }, [db, year]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPeriods();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPeriods]);

  const getOrFetchUserEmail = async (): Promise<string | null> => {
    if (userEmail) return userEmail;
    try {
      const email = await db.getUserEmail();
      if (email) {
        setUserEmail(email);
        return email;
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

      await openMonthlyPeriod(db, year, monthIndex, email);
      await loadPeriods(true);
    } catch (err: unknown) {
      console.error("Erro ao abrir mês:", err);
      const msg = parseErrorMessage(err);
      if (isMissingTableMessage(msg)) {
        setErrorMessage("A tabela 'monthly_periods' não existe no banco de dados. Execute o script SQL utils/migrations/migration-feature-3.sql no Supabase.");
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

      await closeMonthlyPeriod(db, year, monthIndex, email);
      await loadPeriods(true);
    } catch (err: unknown) {
      console.error("Erro ao encerrar mês:", err);
      const msg = parseErrorMessage(err);
      if (isMissingTableMessage(msg)) {
        setErrorMessage("A tabela 'monthly_periods' não existe no banco de dados. Execute o script SQL utils/migrations/migration-feature-3.sql no Supabase.");
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

  return {
    periods,
    userEmail,
    actionLoading,
    errorMessage,
    setErrorMessage,
    totalOpen,
    totalClosed,
    totalNotStarted,
    handleOpenMonth,
    handleCloseMonth,
  };
}
