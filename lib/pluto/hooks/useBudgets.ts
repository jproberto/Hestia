"use client";

import { useCallback, useEffect, useState } from "react";
import { BudgetItem } from "@/lib/pluto/types";
import { getBudgetItemsWithCategories } from "@/lib/pluto/services/budget";

interface UseBudgetsOptions {
  year: number;
  month: number;
  enabled?: boolean;
}

interface UseBudgetsReturn {
  data: BudgetItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBudgets({ year, month, enabled = true }: UseBudgetsOptions): UseBudgetsReturn {
  const [data, setData] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const budgets = await getBudgetItemsWithCategories(year, month);
      setData(budgets);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar orçamentos";
      setError(message);
      console.error("Erro ao carregar orçamentos:", err);
    } finally {
      setLoading(false);
    }
  }, [year, month, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getBudgetItemsWithCategories(year, month).then(
      (budgets) => {
        if (cancelled) return;
        setData(budgets);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar orçamentos");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [year, month, enabled]);

  return { data, loading, error, refetch: fetchBudgets };
}