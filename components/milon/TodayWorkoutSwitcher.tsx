"use client";

import type { Workout } from "@/lib/milon/types";

export interface TodayWorkoutSwitcherProps {
  workouts: Workout[];
  selectedWorkoutId: string | null;
  onSelect: (workoutId: string) => void;
  /**
   * Treino com execução aberta (Mílon 07c): a opção correspondente recebe
   * o sufixo textual " (em execução)". Default nulo (sem aberta).
   * Leitura segue livre (R3) — só marcador visual.
   */
  activeWorkoutId?: string | null;
}

export function TodayWorkoutSwitcher({
  workouts,
  selectedWorkoutId,
  onSelect,
  activeWorkoutId = null,
}: TodayWorkoutSwitcherProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      Treino
      <select
        aria-label="Treino"
        value={selectedWorkoutId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded-md border bg-background px-2 py-1.5 text-sm"
      >
        {workouts.map((workout) => (
          <option key={workout.id} value={workout.id}>
            {workout.id === activeWorkoutId
              ? `${workout.name} (em execução)`
              : workout.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default TodayWorkoutSwitcher;
