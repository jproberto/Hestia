"use client";

import { useCallback, useEffect, useState } from "react";
import { findProgramByIdStandalone } from "@/lib/milon/db/programs";
import type { Program } from "@/lib/milon/types";

export interface UseProgramDetailReturn {
  program: Program | null;
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// Fetch de um único programa por id (padrão do módulo: promise-chain + flag
// cancelled no mount; operações via barrel `db/programs`).
export function useProgramDetail(id: string): UseProgramDetailReturn {
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    findProgramByIdStandalone(id).then(
      (result) => {
        if (cancelled) return;
        setProgram(result ?? null);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setProgram(null);
        setError(toErrorMessage(err, "Erro ao carregar programa"));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await findProgramByIdStandalone(id);
      setProgram(result ?? null);
      setError(null);
    } catch (err: unknown) {
      setProgram(null);
      setError(toErrorMessage(err, "Erro ao carregar programa"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const retry = useCallback(() => fetchDetail(), [fetchDetail]);

  return { program, loading, error, retry };
}
