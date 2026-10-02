"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Exercise } from "@/lib/milon/types";
import {
  matchesExerciseQuery,
  normalizeExerciseText,
} from "@/lib/milon/utils";

export interface ExercisePickerModalProps {
  open: boolean;
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  searchText: string;
  muscleFilter: string;
  muscleOptions: string[];
  onSearch: (text: string) => void;
  onFilterMuscle: (muscle: string) => void;
  onSelect: (exercise: Exercise) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

/**
 * Seletor da biblioteca para adicionar exercício ao treino (Mílon #3).
 * Busca por nome via matchesExerciseQuery (controlada por searchText) e
 * filtro por músculo via normalizeExerciseText (controlado por muscleFilter).
 * Erro (D14/bloqueio ou operação) fica visível sem retry e sem fechar o modal.
 */
export default function ExercisePickerModal({
  open,
  exercises,
  loading,
  error,
  saving,
  searchText,
  muscleFilter,
  muscleOptions,
  onSearch,
  onFilterMuscle,
  onSelect,
  onCreateNew,
  onClose,
}: ExercisePickerModalProps) {
  if (!open) return null;

  const visiveis = exercises.filter(
    (exercise) =>
      matchesExerciseQuery(exercise, searchText) &&
      (muscleFilter === "" ||
        normalizeExerciseText(exercise.muscle) ===
          normalizeExerciseText(muscleFilter)),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-display tracking-wider text-[#B7602B]">
          Escolher exercício
        </h2>

        {error ? (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exercise-picker-search" className="text-xs font-semibold">
            Buscar
          </Label>
          <Input
            id="exercise-picker-search"
            type="search"
            placeholder="Buscar por nome…"
            value={searchText}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exercise-picker-muscle" className="text-xs font-semibold">
            Músculo
          </Label>
          <select
            id="exercise-picker-muscle"
            aria-label="Filtrar por músculo"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
            value={muscleFilter}
            onChange={(event) => onFilterMuscle(event.target.value)}
          >
            <option value="">Todos</option>
            {muscleOptions.map((muscle) => (
              <option key={muscle} value={muscle}>
                {muscle}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Carregando exercícios…
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {visiveis.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border px-3 py-2 text-left hover:bg-muted transition-colors"
                  onClick={() => onSelect(exercise)}
                >
                  <span className="block text-sm font-medium">
                    {exercise.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {exercise.muscle}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onCreateNew}
          >
            Cadastrar novo
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
