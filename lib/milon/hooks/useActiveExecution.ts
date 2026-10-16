"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { ErrorOrigin } from "@/lib/shared";
import { findOpenExecutionByOwnerStandalone } from "@/lib/milon/db/executions";
import type { WorkoutExecution } from "@/lib/milon/types";

export interface UseActiveExecutionReturn {
  activeExecution: WorkoutExecution | null;
  activeWorkoutId: string | null;
  loading: boolean;
  errorMsg: string | null;
  errorOrigin: ErrorOrigin | null;
  retry: () => Promise<void>;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

async function carregarAtiva(
  getEmail: () => Promise<string | null>,
): Promise<WorkoutExecution | null> {
  let email: string | null = null;
  try {
    email = await getEmail();
  } catch {
    return null;
  }
  if (!email) return null;
  return findOpenExecutionByOwnerStandalone(email);
}

// Fonte única da execução aberta do dono (Mílon 07c, plan §3): busca o e-mail
// da sessão e lê a aberta por dono via barrel de execuções, no padrão do
// módulo (promise-chain + flag cancelled; falha de leitura com origem carga).
export function useActiveExecution(): UseActiveExecutionReturn {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [activeExecution, setActiveExecution] =
    useState<WorkoutExecution | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorOrigin, setErrorOrigin] = useState<ErrorOrigin | null>(null);

  const activeWorkoutId = activeExecution ? activeExecution.workoutId : null;

  const fetchActive = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setErrorOrigin(null);
    try {
      const aberta = await carregarAtiva(() => db.getUserEmail());
      setActiveExecution(aberta);
      setErrorMsg(null);
      setErrorOrigin(null);
    } catch (err: unknown) {
      setActiveExecution(null);
      setErrorMsg(toErrorMessage(err, "Erro ao carregar execução ativa"));
      setErrorOrigin("carga");
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    carregarAtiva(() => db.getUserEmail()).then(
      (aberta) => {
        if (cancelled) return;
        setActiveExecution(aberta);
        setErrorMsg(null);
        setErrorOrigin(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setActiveExecution(null);
        setErrorMsg(toErrorMessage(err, "Erro ao carregar execução ativa"));
        setErrorOrigin("carga");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  const retry = useCallback(() => fetchActive(), [fetchActive]);

  return {
    activeExecution,
    activeWorkoutId,
    loading,
    errorMsg,
    errorOrigin,
    retry,
  };
}
