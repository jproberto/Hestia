"use client";

import { useCallback, useEffect, useState } from "react";
import { Account } from "@/lib/pluto/types";
import { getAllAccounts } from "@/lib/pluto/services/accounts";

interface UseAccountsOptions {
  enabled?: boolean;
}

interface UseAccountsReturn {
  data: Account[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAccounts({ enabled = true }: UseAccountsOptions): UseAccountsReturn {
  const [data, setData] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const accounts = await getAllAccounts();
      setData(accounts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar contas";
      setError(message);
      console.error("Erro ao carregar contas:", err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getAllAccounts().then(
      (accounts) => {
        if (cancelled) return;
        setData(accounts);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar contas");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data, loading, error, refetch: fetchAccounts };
}