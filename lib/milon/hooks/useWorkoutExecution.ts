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
  findOpenExecutionByOwnerStandalone,
  findOpenExecutionByWorkoutStandalone,
  finishExecutionStandalone,
  listDoneByExecutionStandalone,
  markSeriesDoneStandalone,
  startExecutionStandalone,
  unmarkSeriesStandalone,
} from "@/lib/milon/db/executions";
import {
  contarMarcadasNaExecucao,
  decidirCasoFinalizacao,
  ehUltimaMarcada,
  type CasoFinalizacao,
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

export type FinishConfirmCase = "parcial" | "completa" | "vazio";

/**
 * Direção decidida internamente por `toggleSeries` (Mílon #06, plan §3 +
 * DA6): `marked` no caminho de marca (inclusive quando abre a pergunta de
 * completa) e `unmarked` no de desmarca (inclusive quando abre a de limpar).
 * O erro continua RELANÇANDO sem retorno. A informação já é decidida aqui —
 * a seção não a infere depois do `await` por causa do estado assíncrono de
 * `dones`.
 */
export type ToggleSeriesOutcome = "marked" | "unmarked";

export interface UseWorkoutExecutionReturn {
  execution: WorkoutExecution | null;
  doneSeriesIds: string[];
  markedCount: number;
  totalSeriesCount: number;
  finishCase: CasoFinalizacao | null;
  toggleSeries: (
    entry: WorkoutEntry,
    serie: WorkoutSeries,
  ) => Promise<ToggleSeriesOutcome>;
  saveSeriesExecution: (
    entry: WorkoutEntry,
    serie: WorkoutSeries,
    campos: UpdateSeriesFieldsInput,
  ) => Promise<void>;
  clearConfirmOpen: boolean;
  confirmClearExecution: () => Promise<void>;
  cancelClearExecution: () => void;
  finishConfirmOpen: boolean;
  finishConfirmCase: FinishConfirmCase | null;
  cancelConfirmOpen: boolean;
  finishProcessing: boolean;
  cancelProcessing: boolean;
  requestFinish: () => Promise<void>;
  confirmFinish: () => Promise<void>;
  cancelFinish: () => void;
  requestCancel: () => void;
  confirmCancelExecution: () => Promise<void>;
  cancelCancelExecution: () => void;
  loading: boolean;
  errorMsg: string | null;
  errorOrigin: ErrorOrigin | null;
  successNotice: string | null;
  retry: () => Promise<void>;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// Bloqueio de escrita com execução ativa em outro treino (Mílon 07c, R2,
// plan §3): fragmento congelado verificado pelo contrato via regex
// /Finalize o|execu.*ativa/i (contém "execução ativa"). Origem `bloqueio` +
// relançamento + ausência de escrita são estritos.
const ESCRITA_BLOQUEADA_MESSAGE = "Já existe execução ativa para este dono";

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

// Execução série a série do Treino do Dia (Mílon #5) com encerramento
// (Mílon #7): orquestra a execução aberta + realizadas sobre os barrels
// `db/*`, no padrão do módulo (promise-chain + flag cancelled no mount; erro
// de operação no banner com origem `operacao` + relançamento; modal nunca
// fecha no erro — o hook só expõe o estado, quem fecha é a seção). O selamento
// (Finalizar, via finishExecution) e o cancelamento com confirmação moram
// aqui; o estado do editor mora na WorkoutDetailSection.
// O Treino do Dia exibe sempre o template ao vivo com marcadores de feito
// por série (sem foto; o executado alimenta o selamento).
export function useWorkoutExecution(
  workoutId: string,
  // Template atual (contagem do total planejado + gatilho do Caso 4; o
  // display ao vivo é o próprio template, sem foto).
  entries: WorkoutEntryView[] = [],
): UseWorkoutExecutionReturn {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [execution, setExecution] = useState<WorkoutExecution | null>(null);
  const [dones, setDones] = useState<WorkoutExecutionSeries[]>([]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState<boolean>(false);
  const [finishConfirmCase, setFinishConfirmCase] =
    useState<FinishConfirmCase | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState<boolean>(false);
  const [finishProcessing, setFinishProcessing] = useState<boolean>(false);
  const [cancelProcessing, setCancelProcessing] = useState<boolean>(false);
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
  const totalSeriesCount = useMemo(
    () =>
      entries.reduce((acumulado, view) => acumulado + view.series.length, 0),
    [entries],
  );
  const finishCase: CasoFinalizacao | null = execution
    ? decidirCasoFinalizacao(markedCount, totalSeriesCount)
    : null;

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
    async (
      entry: WorkoutEntry,
      serie: WorkoutSeries,
    ): Promise<ToggleSeriesOutcome> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      // Pré-cheque por dono (Mílon 07c, R2, plan §3): aberta em treino
      // distinto bloqueia antes de qualquer escrita, sem tocar na máquina
      // de finalizar/cancelar.
      try {
        const email = await resolveEmail();
        const abertaPorDono =
          await findOpenExecutionByOwnerStandalone(email);
        if (abertaPorDono && abertaPorDono.workoutId !== workoutId) {
          setErrorMsg(ESCRITA_BLOQUEADA_MESSAGE);
          setErrorOrigin("bloqueio");
          throw new Error(ESCRITA_BLOQUEADA_MESSAGE);
        }
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao verificar execução ativa");
        if (message === ESCRITA_BLOQUEADA_MESSAGE) throw err;
        setErrorMsg(message);
        setErrorOrigin("operacao");
        throw err instanceof Error ? err : new Error(message);
      }
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
              value: serie.value,
              load: serie.load,
            },
            email,
          );
          await recarregar();
          // Caso 4 (Mílon #7, D5): a série clicada acabou de completar o
          // template — abre a pergunta de todas-executadas em vez de selar
          // direto (o gesto rápido do completo via botão segue em requestFinish).
          if (totalSeriesCount > 0 && dones.length + 1 >= totalSeriesCount) {
            setFinishConfirmCase("completa");
            setFinishConfirmOpen(true);
          }
          return "marked";
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
        }
        return "unmarked";
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao alternar série");
        setErrorMsg(message);
        setErrorOrigin("operacao");
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [dones, totalSeriesCount, execution, workout, workoutId, resolveEmail, recarregar],
  );

  const saveSeriesExecution = useCallback(
    async (
      entry: WorkoutEntry,
      serie: WorkoutSeries,
      campos: UpdateSeriesFieldsInput,
    ): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      // Pré-cheque por dono (Mílon 07c, R2, plan §3): mesmo bloqueio do
      // toggle antes de qualquer gravação no template.
      try {
        const email = await resolveEmail();
        const abertaPorDono =
          await findOpenExecutionByOwnerStandalone(email);
        if (abertaPorDono && abertaPorDono.workoutId !== workoutId) {
          setErrorMsg(ESCRITA_BLOQUEADA_MESSAGE);
          setErrorOrigin("bloqueio");
          throw new Error(ESCRITA_BLOQUEADA_MESSAGE);
        }
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao verificar execução ativa");
        if (message === ESCRITA_BLOQUEADA_MESSAGE) throw err;
        setErrorMsg(message);
        setErrorOrigin("operacao");
        throw err instanceof Error ? err : new Error(message);
      }
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
    [recarregar, resolveEmail, workoutId],
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

  // Encerramento do treino (Mílon #7, plan §3 + D4/D5/D8): Finalizar decide o
  // caso sobre marcadas × total — completo sela direto sem confirmação,
  // parcial e vazio abrem a pergunta correspondente sem selar. Cancelar abre
  // a pergunta de exclusão. Confirmar grava, recarrega e fecha; desistir só
  // fecha. Erro de operação alimenta o banner com origem `operacao` e
  // relança (modal nunca fecha no erro). `processing` bloqueia duplo clique
  // (segunda tentativa tardia encontra execução já selada e vira erro de
  // operação, sem selo duplicado).
  const requestFinish = useCallback(async (): Promise<void> => {
    const aberta = execution;
    if (!aberta) {
      return;
    }
    const caso = decidirCasoFinalizacao(markedCount, totalSeriesCount);
    if (caso === "completo") {
      if (finishProcessing) {
        return;
      }
      setFinishProcessing(true);
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        await finishExecutionStandalone(aberta.id);
        await recarregar();
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao finalizar treino");
        setErrorMsg(message);
        setErrorOrigin("operacao");
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setFinishProcessing(false);
      }
      return;
    }
    setFinishConfirmCase(caso === "parcial" ? "parcial" : "vazio");
    setFinishConfirmOpen(true);
  }, [execution, markedCount, totalSeriesCount, finishProcessing, recarregar]);

  const confirmFinish = useCallback(async (): Promise<void> => {
    if (finishProcessing) {
      return;
    }
    const alvo = execution;
    if (!alvo) {
      setFinishConfirmOpen(false);
      setFinishConfirmCase(null);
      return;
    }
    setFinishProcessing(true);
    setErrorMsg(null);
    setErrorOrigin(null);
    try {
      if (finishConfirmCase === "vazio") {
        // Vazio conduz ao cancelamento (D4): confirmar exclui a execução,
        // sem criar registro selado vazio.
        await clearExecutionStandalone(alvo.id);
      } else {
        await finishExecutionStandalone(alvo.id);
      }
      await recarregar();
      setFinishConfirmOpen(false);
      setFinishConfirmCase(null);
    } catch (err: unknown) {
      const message = toErrorMessage(err, "Erro ao finalizar treino");
      setErrorMsg(message);
      setErrorOrigin("operacao");
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setFinishProcessing(false);
    }
  }, [execution, finishConfirmCase, finishProcessing, recarregar]);

  const cancelFinish = useCallback(() => {
    // Só fecha a pergunta: execução segue aberta, sem nada selado.
    setFinishConfirmOpen(false);
    setFinishConfirmCase(null);
  }, []);

  const requestCancel = useCallback(() => {
    setCancelConfirmOpen(true);
  }, []);

  const confirmCancelExecution = useCallback(async (): Promise<void> => {
    if (cancelProcessing) {
      return;
    }
    const alvo = execution;
    if (!alvo) {
      setCancelConfirmOpen(false);
      return;
    }
    setCancelProcessing(true);
    setErrorMsg(null);
    setErrorOrigin(null);
    try {
      await clearExecutionStandalone(alvo.id);
      await recarregar();
      setCancelConfirmOpen(false);
    } catch (err: unknown) {
      const message = toErrorMessage(err, "Erro ao cancelar execução");
      setErrorMsg(message);
      setErrorOrigin("operacao");
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setCancelProcessing(false);
    }
  }, [execution, cancelProcessing, recarregar]);

  const cancelCancelExecution = useCallback(() => {
    // Só fecha a pergunta: execução segue aberta, início segue registrado.
    setCancelConfirmOpen(false);
  }, []);

  return {
    execution,
    doneSeriesIds,
    markedCount,
    totalSeriesCount,
    finishCase,
    toggleSeries,
    saveSeriesExecution,
    clearConfirmOpen,
    confirmClearExecution,
    cancelClearExecution,
    finishConfirmOpen,
    finishConfirmCase,
    cancelConfirmOpen,
    finishProcessing,
    cancelProcessing,
    requestFinish,
    confirmFinish,
    cancelFinish,
    requestCancel,
    confirmCancelExecution,
    cancelCancelExecution,
    loading,
    errorMsg,
    errorOrigin,
    successNotice,
    retry,
  };
}
