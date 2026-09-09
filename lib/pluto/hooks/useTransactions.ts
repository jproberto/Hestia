"use client";

import { useCallback, useEffect, useState } from "react";
import { TransactionWithDetails } from "@/lib/pluto/types";
import { getTransactionsForMonth } from "@/lib/pluto/services/transactions";

interface UseTransactionsOptions {
  year: number;
  month: number;
  enabled?: boolean;
}

interface UseTransactionsReturn {
  data: TransactionWithDetails[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTransactions({ year, month, enabled = true }: UseTransactionsOptions): UseTransactionsReturn {
  const [data, setData] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const transactions = await getTransactionsForMonth(year, month);
      setData(transactions);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar transações";
      setError(message);
      console.error("Erro ao carregar transações:", err);
    } finally {
      setLoading(false);
    }
  }, [year, month, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getTransactionsForMonth(year, month).then(
      (transactions) => {
        if (cancelled) return;
        setData(transactions);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar transações");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [year, month, enabled]);

  return { data, loading, error, refetch: fetchTransactions };
}