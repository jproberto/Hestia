"use client";

// Timer de descanso do Treino do Dia (Mílon #06, TASK-006 + Emenda
// 2026-10-23, Alavanca 1/DA16): contagem regressiva em memória da página +
// orquestração fire-and-forget do push de fim de descanso
// (agendamento/cancelamento via rota /api/milon/rest-push). O push é
// ancorado ao clique: `t0` capturado no início do caminho válido do `start`
// e `elapsed = Date.now() − t0` enviado no corpo de `schedule` (o servidor
// usa só a diferença — imune a clock-skew). A duração é SEMPRE a capturada
// no argumento de `start` (edição posterior do restSeconds não reescreve);
// falha de push nunca propaga nem impede a contagem (spec critério 10 — a
// camada visual é a garantia). A troca de treino não desmonta a página: o
// estado sobrevive em memória da sessão.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelRestPush,
  ensureDeviceSubscription,
  scheduleRestPush,
} from "@/lib/milon/rest-push-client";

export interface StartRestTimerInput {
  workoutId: string;
  entryId: string;
  exerciseName: string;
  restSeconds: number | null;
}

export interface UseRestTimerReturn {
  active: boolean;
  remainingSeconds: number | null;
  originWorkoutId: string | null;
  exerciseName: string | null;
  finished: boolean;
  start: (input: StartRestTimerInput) => void;
  cancel: () => void;
  dismiss: () => void;
}

export function useRestTimer(): UseRestTimerReturn {
  const [active, setActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [originWorkoutId, setOriginWorkoutId] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // scheduleId da sessão de cliente (DA3): gerado no cliente para que o
  // cancelamento tenha alvo durante a espera da rota.
  const scheduleIdRef = useRef<string | null>(null);
  // Espelho síncrono da contagem para o tick do intervalo sem updater impuro.
  const remainingRef = useRef<number | null>(null);

  const limparIntervalo = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (input: StartRestTimerInput): void => {
      // Duração capturada exclusivamente do argumento (spec critério 5):
      // edição posterior do restSeconds não reescreve este timer.
      const duracao = input.restSeconds;
      // Sem descanso (nulo ou zero): no-op — nada muda (spec critério 3).
      if (duracao === null || duracao <= 0) return;

      // Âncora do push no clique (DA16): t0 é a primeira instrução do
      // caminho válido — antes de limpar/cancelar o agendamento anterior e
      // de ensureDeviceSubscription — para que elapsed meça até o disparo
      // real do POST (latência da assinatura inclusa).
      const t0 = Date.now();

      // Substituição (spec critério 4): o agendamento anterior é cancelado
      // antes do novo; o intervalo anterior é limpo.
      limparIntervalo();
      const scheduleIdAnterior = scheduleIdRef.current;
      if (scheduleIdAnterior) {
        cancelRestPush(scheduleIdAnterior).catch(() => {});
      }

      const scheduleId = crypto.randomUUID();
      scheduleIdRef.current = scheduleId;

      remainingRef.current = duracao;
      setActive(true);
      setFinished(false);
      setRemainingSeconds(duracao);
      setOriginWorkoutId(input.workoutId);
      setExerciseName(input.exerciseName);

      intervalRef.current = setInterval(() => {
        const atual = remainingRef.current;
        if (atual === null) return;
        const proximo = atual - 1;
        remainingRef.current = proximo > 0 ? proximo : 0;
        setRemainingSeconds(remainingRef.current);
        if (proximo <= 0) {
          // Fim atingido: para a contagem e mantém origem/exercício para o
          // alerta visual.
          limparIntervalo();
          setActive(false);
          setFinished(true);
        }
      }, 1000);

      // Agendamento do push fire-and-forget: falha de rede ou não-2xx é
      // engolida; a contagem visual segue independente. O elapsed é medido
      // imediatamente antes do fetch (a latência da assinatura conta).
      ensureDeviceSubscription()
        .then((subscription) => {
          if (!subscription) return;
          return scheduleRestPush({
            scheduleId,
            subscription,
            durationSeconds: duracao,
            exerciseName: input.exerciseName,
            elapsed: Date.now() - t0,
          });
        })
        .catch(() => {});
    },
    [limparIntervalo],
  );

  const cancel = useCallback((): void => {
    // Encerramento silencioso (finalizar/cancelar/limpar): para a contagem,
    // cancela o agendamento corrente no servidor e zera todo o estado.
    limparIntervalo();
    const scheduleId = scheduleIdRef.current;
    scheduleIdRef.current = null;
    remainingRef.current = null;
    if (scheduleId) {
      cancelRestPush(scheduleId).catch(() => {});
    }
    setActive(false);
    setRemainingSeconds(null);
    setOriginWorkoutId(null);
    setExerciseName(null);
    setFinished(false);
  }, [limparIntervalo]);

  const dismiss = useCallback((): void => {
    // Descarta somente o alerta de fim; a contagem já zerou e a origem
    // permanece para a tela (spec critério 9).
    setFinished(false);
  }, []);

  // Limpeza no unmount do hook (ciclo de vida do cliente; a página não
  // desmonta na troca de treino).
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    active,
    remainingSeconds,
    originWorkoutId,
    exerciseName,
    finished,
    start,
    cancel,
    dismiss,
  };
}
