"use client";

import type { Workout } from "@/lib/milon/types";

export interface TodayWorkoutSwitcherProps {
  workouts: Workout[];
  selectedWorkoutId: string | null;
  onSelect: (workoutId: string) => void;
}

export function TodayWorkoutSwitcher({
  workouts,
  selectedWorkoutId,
  onSelect,
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
            {workout.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default TodayWorkoutSwitcher;
