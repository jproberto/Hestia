"use client";

import { useCallback, useEffect, useState } from "react";
import { listExamplesStandalone } from "@/lib/milon/db/example";
import type { MilonItem } from "@/lib/milon/types";

export interface UseExamplesReturn {
  data: MilonItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Fetch+estado no padrão do projeto (promise-chain + flag cancelled).
export function useExamples(): UseExamplesReturn {
  const [data, setData] = useState<MilonItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamples = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listExamplesStandalone());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar itens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listExamplesStandalone().then(
      (items) => {
        if (cancelled) return;
        setData(items);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar itens");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error, refetch: fetchExamples };
}
