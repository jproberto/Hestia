"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
 */
export function usePlutoData(): PlutoData {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const email = await db.getUserEmail();
      setErrorMsg(null);
      if (email) {
        setUserEmail(email);
      }

      // Buscar todos os períodos abertos no banco
      const allOpen = await getAllOpenMonthlyPeriods(db);
      const years = Array.from(new Set(allOpen.map((p) => p.year))).sort((a, b) => a - b);
      setAvailableYears(years);

      if (years.length === 0) {
        setOpenMonths([]);
        setTransactions([]);
        setBudgetItems([]);
        setLoading(false);
        return;
      }

      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[0]);
      }

      const yearToUse = years.includes(selectedYear) ? selectedYear : years[0];
      const openMonthsForYear = allOpen.filter((p) => p.year === yearToUse);
      setOpenMonths(openMonthsForYear);

      if (openMonthsForYear.length > 0 && !openMonthsForYear.some((p) => p.month === selectedMonth)) {
        setSelectedMonth(openMonthsForYear[0].month);
      }

      const monthToFetch =
        openMonthsForYear.length > 0 && openMonthsForYear.some((p) => p.month === selectedMonth)
          ? selectedMonth
          : openMonthsForYear[0]?.month ?? selectedMonth;

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

      setTransactions(txsData || []);
      setAccounts(accsData || []);
      setCategories(catsData || []);
      setBudgetItems(budgetData || []);
      setChecklistItems(chkData || []);
      setGlobalChecklistItems(globalChkData || []);
    } catch (err: unknown) {
      console.error("Erro ao carregar lançamentos:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [db, selectedYear, selectedMonth, setSelectedYear, setSelectedMonth]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [fetchData]);

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
