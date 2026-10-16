"use client";

import { useState } from "react";
import { MilonLayout } from "@/components/milon/MilonLayout";
import { TodayWorkoutSwitcher } from "@/components/milon/TodayWorkoutSwitcher";
import {
  WorkoutDetailSection,
  type ExecutionSettledOutcome,
} from "@/components/milon/WorkoutDetailSection";
import { AsyncState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/button";
import { useActiveExecution } from "@/lib/milon/hooks/useActiveExecution";
import { useTodayWorkout } from "@/lib/milon/hooks/useTodayWorkout";

export default function TodayPage() {
  const {
    program,
    workouts,
    selectedWorkoutId,
    selectWorkout,
    loading,
    errorMsg,
    errorOrigin,
    retry,
  } = useTodayWorkout();
  const {
    activeWorkoutId: activeWorkoutIdBruto,
    retry: retryActiveExecution,
  } =
    (useActiveExecution() as
      | { activeWorkoutId?: string | null; retry?: () => Promise<void> }
      | undefined) ?? {};
  const activeWorkoutId = activeWorkoutIdBruto ?? null;
  // Foco pós-ação (Mílon 07b-1, DA5): sinal numérico incrementado a cada
  // desfecho emitido (sealed ou cancelled) e enviado à seção, que foca o
  // cabeçalho do treino exibido ao montar/com sinal novo.
  const [focusHeaderSignal, setFocusHeaderSignal] = useState<number | null>(
    null,
  );
  // Avançar para o próximo treino (Mílon 07b-1, DA4/DA2): após desfecho da
  // seção, invalida a fonte única de execução ativa; com `sealed` recarrega
  // também a seleção (aguardada a fonte), que recalcula o próximo da
  // rotação 7b — a seleção nova vem exclusivamente do recálculo do hook,
  // nunca de `selectWorkout` manual. `cancelled` e chamada sem argumento
  // (retrocompat 7c AC6, DA3) invalidam somente a fonte única.
  const handleExecutionSettled = async (
    desfecho?: ExecutionSettledOutcome,
  ): Promise<void> => {
    await retryActiveExecution?.();
    if (desfecho === "sealed") {
      await retry();
    }
    setFocusHeaderSignal((sinal) => (sinal ?? 0) + 1);
  };

  const hasSelection = selectedWorkoutId !== null;
  const empty = !loading && !errorMsg && !hasSelection;
  const emptyText =
    program === null
      ? "Ativar ou criar um programa para ver o treino do dia."
      : "Adicionar o primeiro treino ao programa para começar.";
  // Encerrar treino (Mílon #7, D6): Cancelar no topo (headerActions) e
  // Finalizar no rodapé (footer) via slots existentes da seção. A seção
  // exibe e aciona somente com execução aberta (branch de execução); aqui
  // só se oculta no somente-leitura (programa inativo). A manutenção segue
  // sem slots por construção (wrapper fino).
  const somenteLeitura = program?.status === "inativo";
  // Troca de execução ativa (Mílon 07c, plan §3): bloqueado quando há
  // aberta em treino distinto do selecionado; o nome do tooltip vem
  // exclusivamente da lista carregada do hook de seleção (R7 garante
  // presença no programa ativo).
  const treinoAtivo = activeWorkoutId
    ? (workouts.find((w) => w.id === activeWorkoutId) ?? null)
    : null;
  const nomeAtivo = treinoAtivo?.name ?? null;
  const bloqueado =
    activeWorkoutId !== null &&
    selectedWorkoutId !== null &&
    activeWorkoutId !== selectedWorkoutId;
  const tooltipBloqueio =
    bloqueado && nomeAtivo
      ? `Finalize o ${nomeAtivo} para marcar séries aqui`
      : null;

  return (
    <MilonLayout pageTitle="Treino do Dia">
      <AsyncState
        loading={loading}
        error={errorMsg}
        errorOrigin={errorOrigin}
        empty={empty}
        noResults={false}
        onRetry={() => void retry()}
        loadingText="Carregando treino do dia…"
        emptyTitle="Sem treino ativo"
        emptyText={emptyText}
      >
        {hasSelection && !errorMsg && selectedWorkoutId !== null ? (
          <div className="flex flex-col gap-4">
            {workouts.length >= 2 ? (
              <TodayWorkoutSwitcher
                workouts={workouts}
                selectedWorkoutId={selectedWorkoutId}
                onSelect={selectWorkout}
                activeWorkoutId={activeWorkoutId}
              />
            ) : null}
            <WorkoutDetailSection
              workoutId={selectedWorkoutId}
              backTarget={{ kind: "none" }}
              executionEnabled
              activeExecutionWorkoutId={activeWorkoutId}
              writeBlocked={bloqueado}
              blockedTooltip={tooltipBloqueio}
              onExecutionSettled={handleExecutionSettled}
              focusHeaderSignal={focusHeaderSignal}
              headerActions={
                somenteLeitura ? null : (
                  <Button type="button" variant="outline" size="sm">
                    Cancelar
                  </Button>
                )
              }
              footer={
                somenteLeitura ? null : (
                  <Button type="button" size="sm">
                    Finalizar
                  </Button>
                )
              }
            />
          </div>
        ) : null}
      </AsyncState>
    </MilonLayout>
  );
}
