"use client";

import { useCallback, useEffect, useState } from "react";
import { MonthlyPeriod } from "@/lib/pluto/types";
import { getMonthlyPeriodsStandalone as getMonthlyPeriods, getAllOpenMonthlyPeriodsStandalone as getAllOpenMonthlyPeriods } from "@/lib/pluto/repositories/months";

interface UseMonthlyPeriodsOptions {
  year?: number;
  enabled?: boolean;
}

interface UseMonthlyPeriodsReturn {
  periods: MonthlyPeriod[];
  allOpenPeriods: MonthlyPeriod[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMonthlyPeriods({ year, enabled = true }: UseMonthlyPeriodsOptions): UseMonthlyPeriodsReturn {
  const [periods, setPeriods] = useState<MonthlyPeriod[]>([]);
  const [allOpenPeriods, setAllOpenPeriods] = useState<MonthlyPeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriods = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [periodsData, openPeriodsData] = await Promise.all([
        year ? getMonthlyPeriods(year) : Promise.resolve([]),
        getAllOpenMonthlyPeriods(),
      ]);
      setPeriods(periodsData);
      setAllOpenPeriods(openPeriodsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar períodos";
      setError(message);
      console.error("Erro ao carregar períodos:", err);
    } finally {
      setLoading(false);
    }
  }, [year, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all([
      year ? getMonthlyPeriods(year) : Promise.resolve([]),
      getAllOpenMonthlyPeriods(),
    ]).then(
      ([periodsData, openPeriodsData]) => {
        if (cancelled) return;
        setPeriods(periodsData);
        setAllOpenPeriods(openPeriodsData);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar períodos");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [year, enabled]);

  return { periods, allOpenPeriods, loading, error, refetch: fetchPeriods };
}