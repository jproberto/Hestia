"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { IDatabaseClient } from "@/lib/shared/database";
import { getTransactionsByMonth } from "@/lib/pluto/db/transactions";
import { getAccounts } from "@/lib/pluto/db/accounts";
import { getCategories } from "@/lib/pluto/db/categories";
import { getAllOpenMonthlyPeriods } from "@/lib/pluto/db/months";
import { getBudgets } from "@/lib/pluto/db/budget";
import {
  getChecklistItemsByMonth,
  getGlobalChecklistItems,
} from "@/lib/pluto/db/checklist";
import type {
  Account,
  BudgetItem,
  Category,
  ChecklistItem,
  MonthlyPeriod,
  TransactionWithDetails,
} from "@/lib/pluto/types";
import { getMonthRange } from "@/lib/pluto/types";
import { parseErrorMessage } from "@/lib/utils";

export interface PlutoData {
  db: IDatabaseClient;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  userEmail: string;
  availableYears: number[];
  openMonths: MonthlyPeriod[];
  transactions: TransactionWithDetails[];
  budgetItems: BudgetItem[];
  accounts: Account[];
  categories: Category[];
  checklistItems: ChecklistItem[];
  globalChecklistItems: ChecklistItem[];
  setChecklistItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>;
  loading: boolean;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  fetchData: () => Promise<void>;
  minDateStr: string;
  maxDateStr: string;
}

/**
 * Orquestra o carregamento de todas as entidades da página de
 * lançamentos (períodos, transações, orçamento, contas, categorias,
 * checklist) e a seleção de ano/mês. Extraído da TransactionsPage
 * sem mudança de comportamento (Fase 1 da decomposição).
 *
 * Single-flight (task 45): a seleção ano/mês é resolvida em memória a
 * partir de `allOpen` dentro de um único ciclo — o mount faz 1 fetch
 * mesmo quando a seleção inicial precisa de ajuste. Requisições
 * superadas (troca rápida de seleção) são descartadas por request id
 * (last-writer-wins) em vez da flag `cancelled`, que não cancelava a rede.
 */
export function usePlutoData(): PlutoData {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const today = new Date();
  const [selectedYear, setSelectedYearState] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonthState] = useState<number>(today.getMonth() + 1);

  const [userEmail, setUserEmail] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [openMonths, setOpenMonths] = useState<MonthlyPeriod[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [globalChecklistItems, setGlobalChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  // Espelho mutável da seleção: permite carga estável (identidade fixa)
  // com os valores correntes, sem recriar a função a cada render.
  const selectionRef = useRef({ year: today.getFullYear(), month: today.getMonth() + 1 });

  const loadForSelection = useCallback(async (year: number, month: number) => {
    const requestId = ++requestIdRef.current;
    const isCurrentRequest = () => requestIdRef.current === requestId;
    setLoading(true);
    try {
      const email = await db.getUserEmail();
      if (!isCurrentRequest()) return;
      setErrorMsg(null);
      if (email) {
        setUserEmail(email);
      }

      // Buscar todos os períodos abertos no banco
      const allOpen = await getAllOpenMonthlyPeriods(db);
      if (!isCurrentRequest()) return;
      const years = Array.from(new Set(allOpen.map((p) => p.year))).sort((a, b) => a - b);
      setAvailableYears(years);

      if (years.length === 0) {
        setOpenMonths([]);
        setTransactions([]);
        setBudgetItems([]);
        setLoading(false);
        return;
      }

      // Resolução em memória, no mesmo ciclo: ajusta estado + ref sem
      // disparar nova carga (o effect do mount roda uma única vez).
      const yearToUse = years.includes(year) ? year : years[0];
      if (yearToUse !== year) {
        selectionRef.current.year = yearToUse;
        setSelectedYearState(yearToUse);
      }

      const openMonthsForYear = allOpen.filter((p) => p.year === yearToUse);
      setOpenMonths(openMonthsForYear);

      const monthToFetch =
        openMonthsForYear.length > 0 && openMonthsForYear.some((p) => p.month === month)
          ? month
          : openMonthsForYear[0]?.month ?? month;
      if (monthToFetch !== month) {
        selectionRef.current.month = monthToFetch;
        setSelectedMonthState(monthToFetch);
      }

      const activeMonthPeriod = openMonthsForYear.find((p) => p.month === monthToFetch);

      const [txsData, accsData, catsData, budgetData, chkData, globalChkData] = await Promise.all([
        getTransactionsByMonth(db, yearToUse, monthToFetch),
        getAccounts(db),
        getCategories(db),
        getBudgets(db, yearToUse, monthToFetch).catch(() => []),
        activeMonthPeriod?.id
          ? getChecklistItemsByMonth(db, activeMonthPeriod.id).catch(() => [])
          : Promise.resolve([]),
        getGlobalChecklistItems(db).catch(() => []),
      ]);
      if (!isCurrentRequest()) return;

      setTransactions(txsData || []);
      setAccounts(accsData || []);
      setCategories(catsData || []);
      setBudgetItems(budgetData || []);
      setChecklistItems(chkData || []);
      setGlobalChecklistItems(globalChkData || []);
    } catch (err: unknown) {
      if (!isCurrentRequest()) return;
      console.error("Erro ao carregar lançamentos:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [db, setLoading, setErrorMsg, setUserEmail, setAvailableYears, setOpenMonths, setTransactions, setBudgetItems, setAccounts, setCategories, setChecklistItems, setGlobalChecklistItems, setSelectedYearState, setSelectedMonthState]);

  // Mount em passe único: `loadForSelection` só depende de `db` (estável),
  // então os setStates da resolução não disparam nova carga.
  useEffect(() => {
    void loadForSelection(selectionRef.current.year, selectionRef.current.month);
  }, [loadForSelection]);

  const setSelectedYear = useCallback((year: number) => {
    selectionRef.current.year = year;
    setSelectedYearState(year);
    void loadForSelection(selectionRef.current.year, selectionRef.current.month);
  }, [loadForSelection, setSelectedYearState]);

  const setSelectedMonth = useCallback((month: number) => {
    selectionRef.current.month = month;
    setSelectedMonthState(month);
    void loadForSelection(selectionRef.current.year, selectionRef.current.month);
  }, [loadForSelection, setSelectedMonthState]);

  const fetchData = useCallback(() => {
    return loadForSelection(selectionRef.current.year, selectionRef.current.month);
  }, [loadForSelection]);

  // Delimitadores do Date Input para travar dentro do Mês e Ano selecionados
  const { startDate: minDateStr, endDate: maxDateStr } = getMonthRange(selectedYear, selectedMonth);

  return {
    db,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    userEmail,
    availableYears,
    openMonths,
    transactions,
    budgetItems,
    accounts,
    categories,
    checklistItems,
    globalChecklistItems,
    setChecklistItems,
    loading,
    errorMsg,
    setErrorMsg,
    fetchData,
    minDateStr,
    maxDateStr,
  };
}
