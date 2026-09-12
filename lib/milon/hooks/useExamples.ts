"use client";

import { useCallback, useEffect, useState } from "react";
import type { IDatabaseClient } from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { MilonItem, MilonItemRow } from "@/lib/milon/types";

export interface UseExamplesReturn {
  data: MilonItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Autocontido na TASK-004: `lib/milon/db/example.ts` foi removido e este era
// seu único consumidor. A função abaixo preserva o comportamento exato até a
// TASK-005 deletar este hook junto ao scaffold restante.
async function listExamplesStandalone(): Promise<MilonItem[]> {
  const db: IDatabaseClient = createBrowserDatabaseClient();
  const { data, error } = await db
    .from<MilonItemRow>("milon_items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({ id: row.id, name: row.name, created_at: row.created_at }));
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
