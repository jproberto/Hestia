"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import { initBudget, createBudgetAdjustment, getBudgetAdjustment, getBudgetAdjustments } from "@/lib/pluto/db/budget";
import { useSearchParams } from "next/navigation";
import { useBudgets } from "@/lib/pluto/hooks/useBudgets";
import { useCategories } from "@/lib/pluto/hooks/useCategories";
import type { BudgetAdjustment, BudgetItem, Category } from "@/lib/pluto/types";
import type { IDatabaseClient } from "@/lib/shared/database";

export interface BudgetOverview {
  db: IDatabaseClient;
  year: number;
  handleSelectYear: (year: number) => void;
  selectedAdjustmentId: string | null;
  setSelectedAdjustmentId: (id: string | null) => void;
  openMonth: number;
  userEmail: string;
  revision: BudgetAdjustment | null;
  adjustments: BudgetAdjustment[];
  activeAdjustment: BudgetAdjustment | null;
  budgets: BudgetItem[];
  categories: Category[];
  revenues: BudgetItem[];
  expenses: BudgetItem[];
  totalRevenues: number;
  totalExpenses: number;
  netBudget: number;
  isMostRecent: boolean;
  isEditable: boolean;
  hasCurrentMonthAdjustment: boolean;
  loadData: (silent?: boolean) => Promise<void>;
  handleStartBudget: () => Promise<void>;
  handleCreateAdjustment: () => Promise<void>;
}

/**
 * Seleciona o ajuste vigente para o mês de referência: o de maior
 * `start_month` dentre os que já iniciaram (`start_month <= mês`).
 * Mesma regra aplicada em `getBudgets` (ajuste mais recente por categoria).
 * Fallback: o ajuste mais recente quando nenhum iniciou ainda.
 */
export function pickDefaultAdjustment(
  adjs: BudgetAdjustment[],
  month: number
): BudgetAdjustment | null {
  if (adjs.length === 0) return null;
  const eligible = adjs.filter((a) => a.start_month <= month);
  const pool = eligible.length > 0 ? eligible : adjs;
  return pool.reduce((best, a) => (a.start_month > best.start_month ? a : best));
}

/**
 * Dados e ciclo de vida da página de orçamento (extraído de BudgetPage sem
 * mudança de comportamento): ano, ajustes/revisão, budgets e categorias via
 * hooks, seleção do ajuste ativo e ações de iniciar/criar ajuste.
 */
export function useBudgetOverview(): BudgetOverview {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [adjustments, setAdjustments] = useState<BudgetAdjustment[]>([]);
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);
  const [activeAdjustment, setActiveAdjustment] = useState<BudgetAdjustment | null>(null);
  const [revision, setRevision] = useState<BudgetAdjustment | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const searchParams = useSearchParams();

  // Mês aberto (ou ?mockMonth= para testes/homologação)
  const openMonth = useMemo(() => {
    const mockMonthParam = searchParams.get("mockMonth");
    if (mockMonthParam) {
      const parsed = parseInt(mockMonthParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        return parsed;
      }
    }
    return new Date().getMonth() + 1;
  }, [searchParams]);

  const { data: budgets, refetch: refetchBudgets } = useBudgets({
    year,
    month: activeAdjustment?.start_month ?? openMonth,
    enabled: !!activeAdjustment,
  });

  const { data: categories } = useCategories({
    enabled: !!activeAdjustment,
  });

  const isMostRecent = activeAdjustment
    ? !adjustments.some((a) => a.start_month > activeAdjustment.start_month)
    : false;
  const isEditable = activeAdjustment
    ? (activeAdjustment.start_month === openMonth && isMostRecent)
    : false;

  const loadData = useCallback(async (silent = false) => {
    try {
      const email = await db.getUserEmail();
      if (email) {
        setUserEmail(email);
      }

      const activeRevision = await getBudgetAdjustment(db, year);
      setRevision(activeRevision);

      if (activeRevision) {
        const adjs = await getBudgetAdjustments(db, year);
        setAdjustments(adjs);

        let currentAdj: BudgetAdjustment | null = null;
        if (selectedAdjustmentId) {
          currentAdj = adjs.find((a) => a.id === selectedAdjustmentId) || null;
        } else {
          // Sem seleção (carga inicial ou troca de ano): usa o ajuste
          // vigente para o mês corrente em vez de deixar vazio.
          currentAdj = pickDefaultAdjustment(adjs, openMonth);
          if (currentAdj) {
            setSelectedAdjustmentId(currentAdj.id);
          }
        }

        setActiveAdjustment(currentAdj);
      } else {
        setAdjustments([]);
        setActiveAdjustment(null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [year, selectedAdjustmentId, openMonth, db]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Refetch budgets when activeAdjustment changes
  useEffect(() => {
    if (activeAdjustment) {
      void refetchBudgets();
    }
  }, [activeAdjustment, refetchBudgets]);

  async function handleStartBudget() {
    if (!userEmail) return;
    try {
      await initBudget(db, year, userEmail);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateAdjustment() {
    if (!userEmail) return;
    try {
      const newId = await createBudgetAdjustment(db, year, openMonth, userEmail);
      setSelectedAdjustmentId(newId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  function handleSelectYear(nextYear: number) {
    setYear(nextYear);
    setSelectedAdjustmentId(null);
  }

  // Derived state
  const revenues = budgets.filter((b) => b.category_type === "receita" && b.amount > 0);
  const expenses = budgets.filter((b) => b.category_type === "despesa" && b.amount > 0);

  const totalRevenues = revenues.reduce((acc, cur) => acc + cur.amount, 0);
  const totalExpenses = expenses.reduce((acc, cur) => acc + cur.amount, 0);
  const netBudget = totalRevenues - totalExpenses;

  const hasCurrentMonthAdjustment = adjustments.some((a) => a.start_month === openMonth);

  return {
    db,
    year,
    handleSelectYear,
    selectedAdjustmentId,
    setSelectedAdjustmentId,
    openMonth,
    userEmail,
    revision,
    adjustments,
    activeAdjustment,
    budgets,
    categories,
    revenues,
    expenses,
    totalRevenues,
    totalExpenses,
    netBudget,
    isMostRecent,
    isEditable,
    hasCurrentMonthAdjustment,
    loadData,
    handleStartBudget,
    handleCreateAdjustment,
  };
}
