"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { ErrorOrigin } from "@/lib/shared";
import {
  applySeriesToFollowingStandalone,
  findWorkoutByIdStandalone,
  updateSeriesFieldsStandalone,
} from "@/lib/milon/db/workouts";
import {
  clearExecutionStandalone,
  findOpenExecutionByWorkoutStandalone,
  listDoneByExecutionStandalone,
  markSeriesDoneStandalone,
  startExecutionStandalone,
  unmarkSeriesStandalone,
} from "@/lib/milon/db/executions";
import {
  contarMarcadasNaExecucao,
  ehUltimaMarcada,
} from "@/lib/milon/workout-utils";
import type { UpdateSeriesFieldsInput } from "@/lib/milon/repositories/interfaces";
import type {
  Workout,
  WorkoutEntry,
  WorkoutEntryView,
  WorkoutExecution,
  WorkoutExecutionSeries,
  WorkoutSeries,
} from "@/lib/milon/types";

export interface UseWorkoutExecutionReturn {
  execution: WorkoutExecution | null;
  doneSeriesIds: string[];
  markedCount: number;
  toggleSeries: (entry: WorkoutEntry, serie: WorkoutSeries) => Promise<void>;
  saveSeriesExecution: (
    entry: WorkoutEntry,
    serie: WorkoutSeries,
    campos: UpdateSeriesFieldsInput,
  ) => Promise<void>;
  clearConfirmOpen: boolean;
  confirmClearExecution: () => Promise<void>;
  cancelClearExecution: () => void;
  loading: boolean;
  errorMsg: string | null;
  errorOrigin: ErrorOrigin | null;
  successNotice: string | null;
  retry: () => Promise<void>;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

interface LoadedExecution {
  workout: Workout | null;
  execution: WorkoutExecution | null;
  dones: WorkoutExecutionSeries[];
}

async function carregarCadeia(workoutId: string): Promise<LoadedExecution> {
  const workout = await findWorkoutByIdStandalone(workoutId);
  const aberta = await findOpenExecutionByWorkoutStandalone(workoutId);
  if (!aberta) {
    return { workout, execution: null, dones: [] };
  }
  const dones = await listDoneByExecutionStandalone(aberta.id);
  return { workout, execution: aberta, dones };
}

// Execução série a série do Treino do Dia (Mílon #5): orquestra a execução
// aberta + realizadas sobre os barrels `db/*`, no padrão do módulo
// (promise-chain + flag cancelled no mount; erro de operação no banner com
// origem `operacao` + relançamento; modal nunca fecha no erro — o hook só
// expõe o estado, quem fecha é a seção). O fim nunca é escrito aqui
// (reservado à feature 7); o estado do editor mora na WorkoutDetailSection.
// O Treino do Dia exibe sempre o template ao vivo com marcadores de feito
// por série (sem foto; valores reais ficam para o encerrar #7).
export function useWorkoutExecution(
  workoutId: string,
  // Template atual (mantido na assinatura: a seção compõe o hook com
  // workoutId + template; o display ao vivo é o próprio template, sem foto).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  entries: WorkoutEntryView[] = [],
): UseWorkoutExecutionReturn {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [execution, setExecution] = useState<WorkoutExecution | null>(null);
  const [dones, setDones] = useState<WorkoutExecutionSeries[]>([]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorOrigin, setErrorOrigin] = useState<ErrorOrigin | null>(null);
  // Correção humana 2026-10-08: nesta tela (Treino do Dia em execução) NÃO
  // há banner de sucesso — o card já é o feedback. O campo segue no contrato
  // como nulo permanente; só o erro alimenta banner (origem operacao).
  const successNotice: string | null = null;

  const doneSeriesIds = useMemo(
    () => dones.map((done) => done.seriesId),
    [dones],
  );
  const markedCount = useMemo(() => contarMarcadasNaExecucao(dones), [dones]);

  useEffect(() => {
    let cancelled = false;
    carregarCadeia(workoutId).then(
      (loaded) => {
        if (cancelled) return;
        setWorkout(loaded.workout);
        setExecution(loaded.execution);
        setDones(loaded.dones);
        setErrorMsg(null);
        setErrorOrigin(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setErrorMsg(toErrorMessage(err, "Erro ao carregar execução"));
        setErrorOrigin("carga");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [workoutId]);

  const fetchExecution = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setErrorOrigin(null);
    try {
      const loaded = await carregarCadeia(workoutId);
      setWorkout(loaded.workout);
      setExecution(loaded.execution);
      setDones(loaded.dones);
      setErrorMsg(null);
      setErrorOrigin(null);
    } catch (err: unknown) {
      setErrorMsg(toErrorMessage(err, "Erro ao carregar execução"));
      setErrorOrigin("carga");
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  const retry = useCallback(() => fetchExecution(), [fetchExecution]);

  const resolveEmail = useCallback(async (): Promise<string> => {
    const email = await db.getUserEmail();
    return email ?? "";
  }, [db]);

  const recarregar = useCallback(async () => {
    const aberta = await findOpenExecutionByWorkoutStandalone(workoutId);
    setExecution(aberta);
    const feitas = aberta
      ? await listDoneByExecutionStandalone(aberta.id)
      : [];
    setDones(feitas);
    setErrorMsg(null);
    setErrorOrigin(null);
  }, [workoutId]);

  const toggleSeries = useCallback(
    async (entry: WorkoutEntry, serie: WorkoutSeries): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        const marcada = dones.some((done) => done.seriesId === serie.id);
        if (!marcada) {
          const email = await resolveEmail();
          const treino =
            workout ?? (await findWorkoutByIdStandalone(workoutId));
          if (treino) setWorkout(treino);
          const aberta = await startExecutionStandalone(
            workoutId,
            treino ? treino.programId : entry.programId,
            email,
          );
          // Publica a execução aberta (início) antes de marcar.
          await recarregar();
          await markSeriesDoneStandalone(
            {
              executionId: aberta.id,
              entryId: entry.id,
              seriesId: serie.id,
              position: serie.position,
              reps: serie.reps,
              durationSeconds: serie.durationSeconds,
              load: serie.load,
            },
            email,
          );
          await recarregar();
          return;
        }
        const alvo =
          execution ?? (await findOpenExecutionByWorkoutStandalone(workoutId));
        if (!alvo) throw new Error("Nenhuma execução aberta.");
        await unmarkSeriesStandalone(alvo.id, serie.id);
        await recarregar();
        if (ehUltimaMarcada(dones, serie.id)) {
          // A série clicada já aparece desmarcada; a pergunta decide só sobre
          // a linha de execução (confirmar exclui, cancelar mantém).
          setClearConfirmOpen(true);
          return;
        }
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao alternar série");
        setErrorMsg(message);
        setErrorOrigin("operacao");
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [dones, execution, workout, workoutId, resolveEmail, recarregar],
  );

  const saveSeriesExecution = useCallback(
    async (
      entry: WorkoutEntry,
      serie: WorkoutSeries,
      campos: UpdateSeriesFieldsInput,
    ): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        // Comportamento único (D4): sempre origem + seguintes, incluindo
        // marcadas — sem indicador de cópia; feito e execução nunca são
        // tocados.
        await updateSeriesFieldsStandalone(serie.id, campos);
        await applySeriesToFollowingStandalone(entry.id, serie.id);
        await recarregar();
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao salvar série");
        setErrorMsg(message);
        setErrorOrigin("operacao");
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [recarregar],
  );

  const confirmClearExecution = useCallback(async (): Promise<void> => {
    const alvo = execution;
    if (!alvo) {
      setClearConfirmOpen(false);
      return;
    }
    setErrorMsg(null);
    setErrorOrigin(null);
    try {
      await clearExecutionStandalone(alvo.id);
      await recarregar();
      setClearConfirmOpen(false);
    } catch (err: unknown) {
      const message = toErrorMessage(err, "Erro ao limpar execução");
      setErrorMsg(message);
      setErrorOrigin("operacao");
      throw err instanceof Error ? err : new Error(message);
    }
  }, [execution, recarregar]);

  const cancelClearExecution = useCallback(() => {
    // Só fecha a pergunta: execução aberta, início original e zero marcadas
    // seguem intactos (semântica corrigida — plan §3 D9).
    setClearConfirmOpen(false);
  }, []);

  return {
    execution,
    doneSeriesIds,
    markedCount,
    toggleSeries,
    saveSeriesExecution,
    clearConfirmOpen,
    confirmClearExecution,
    cancelClearExecution,
    loading,
    errorMsg,
    errorOrigin,
    successNotice,
    retry,
  };
}
