"use client";

import { MilonLayout } from "@/components/milon/MilonLayout";
import { TodayWorkoutSwitcher } from "@/components/milon/TodayWorkoutSwitcher";
import { WorkoutDetailSection } from "@/components/milon/WorkoutDetailSection";
import { AsyncState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/button";
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
              />
            ) : null}
            <WorkoutDetailSection
              workoutId={selectedWorkoutId}
              backTarget={{ kind: "none" }}
              executionEnabled
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
