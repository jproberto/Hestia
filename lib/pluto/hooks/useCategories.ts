"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import { Category } from "@/lib/pluto/types";
import { getCategories } from "@/lib/pluto/db/categories";

interface UseCategoriesOptions {
  type?: "receita" | "despesa";
  enabled?: boolean;
}

interface UseCategoriesReturn {
  data: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCategories({ type, enabled = true }: UseCategoriesOptions): UseCategoriesReturn {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const categories = await getCategories(db, type);
      setData(categories);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar categorias";
      setError(message);
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setLoading(false);
    }
  }, [db, type, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getCategories(db, type).then(
      (categories) => {
        if (cancelled) return;
        setData(categories);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar categorias");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [db, type, enabled]);

  return { data, loading, error, refetch: fetchCategories };
}