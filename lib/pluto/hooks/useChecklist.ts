"use client";

import { useCallback, useEffect, useState } from "react";
import { ChecklistItem } from "@/lib/pluto/types";
import { getMonthChecklistItems, getGlobalItems } from "@/lib/pluto/services/checklist";

interface UseChecklistOptions {
  monthId?: string | null;
  enabled?: boolean;
}

interface UseChecklistReturn {
  monthItems: ChecklistItem[];
  globalItems: ChecklistItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useChecklist({ monthId, enabled = true }: UseChecklistOptions): UseChecklistReturn {
  const [monthItems, setMonthItems] = useState<ChecklistItem[]>([]);
  const [globalItems, setGlobalItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklist = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [monthData, globalData] = await Promise.all([
        monthId ? getMonthChecklistItems(monthId) : Promise.resolve([]),
        getGlobalItems(),
      ]);
      setMonthItems(monthData);
      setGlobalItems(globalData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar checklist";
      setError(message);
      console.error("Erro ao carregar checklist:", err);
    } finally {
      setLoading(false);
    }
  }, [monthId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all([
      monthId ? getMonthChecklistItems(monthId) : Promise.resolve([]),
      getGlobalItems(),
    ]).then(
      ([monthData, globalData]) => {
        if (cancelled) return;
        setMonthItems(monthData);
        setGlobalItems(globalData);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar checklist");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [monthId, enabled]);

  return { monthItems, globalItems, loading, error, refetch: fetchChecklist };
}