"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { MilonLayout } from "@/components/milon/MilonLayout";
import { AsyncState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/button";
import WorkoutEntriesList from "@/components/milon/WorkoutEntriesList";
import ExercisePickerModal from "@/components/milon/ExercisePickerModal";
import ExerciseModal, {
  type ExerciseModalAction,
  type ExerciseModalFields,
} from "@/components/milon/ExerciseModal";
import WorkoutConfirmModal, {
  type WorkoutConfirmVariant,
} from "@/components/milon/WorkoutConfirmModal";
import { useWorkoutDetail } from "@/lib/milon/hooks/useWorkoutDetail";
import {
  compareExercisesByMuscleThenName,
  normalizeExerciseText,
} from "@/lib/milon/utils";
import type {
  Exercise,
  LoadUnit,
  WorkoutEntry,
} from "@/lib/milon/types";
import type { SerieField } from "@/components/milon/SeriesCard";

function resolveParam(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function deriveMuscleOptions(items: Exercise[]): string[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const key = normalizeExerciseText(item.muscle);
    if (!seen.has(key)) seen.set(key, item.muscle);
  }
  return [...seen.values()].sort((a, b) =>
    normalizeExerciseText(a).localeCompare(normalizeExerciseText(b), "pt-BR"),
  );
}

interface ConfirmState {
  variant: WorkoutConfirmVariant;
  entry: WorkoutEntry;
  exerciseName: string;
  seriesCount: number;
  currentQuantity: number;
  newQuantity: number;
}

export default function WorkoutDetailPage() {
  const params = useParams();
  const id = resolveParam(params?.id as string | string[] | undefined);
  const workoutId = resolveParam(
    params?.workoutId as string | string[] | undefined,
  );

  const {
    workout,
    program,
    entries,
    exercises,
    loading,
    errorMsg,
    errorOrigin,
    successNotice,
    retry,
    addExercise,
    removeEntry,
    reorderEntries,
    setQuantity,
    setRest,
    updateSeries,
    applyToAll,
    saveExercise,
    createExerciseAndAdd,
    confirmLoadUnit,
  } = useWorkoutDetail(workoutId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerSaving, setPickerSaving] = useState(false);

  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseModalError, setExerciseModalError] = useState<string | null>(
    null,
  );
  const [exerciseSaving, setExerciseSaving] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  const pendingUnitRef = useRef<
    Record<string, { seriesId: string; value: number }>
  >({});

  const readOnly = program?.status === "inativo";
  const programId = program?.id ?? id;

  const muscleOptions = useMemo(
    () => deriveMuscleOptions(exercises),
    [exercises],
  );

  const pickerExercises = useMemo(
    () =>
      [...exercises]
        .filter((exercise) => exercise.deletedAt === null)
        .sort(compareExercisesByMuscleThenName),
    [exercises],
  );

  const findView = useCallback(
    (entryId: string) => entries.find((view) => view.entry.id === entryId),
    [entries],
  );

  const openPicker = useCallback(() => {
    setPickerError(null);
    setPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    if (!pickerSaving) {
      setPickerOpen(false);
      setPickerError(null);
    }
  }, [pickerSaving]);

  const handleSelect = useCallback(
    (exercise: Exercise) => {
      setPickerSaving(true);
      setPickerError(null);
      void addExercise(exercise.id).then(
        () => {
          setPickerSaving(false);
          setPickerOpen(false);
          setPickerError(null);
        },
        (err: unknown) => {
          // D14: bloqueio mantém o modal aberto com mensagem visível.
          setPickerSaving(false);
          setPickerError(toMessage(err, "Erro ao adicionar exercício"));
        },
      );
    },
    [addExercise],
  );

  const handleCreateNew = useCallback(() => {
    setEditingExercise(null);
    setExerciseModalError(null);
    setExerciseModalOpen(true);
  }, []);

  const closeExerciseModal = useCallback(() => {
    if (!exerciseSaving) {
      setExerciseModalOpen(false);
      setEditingExercise(null);
      setExerciseModalError(null);
    }
  }, [exerciseSaving]);

  const handleExerciseModalSave = useCallback(
    async (
      fields: ExerciseModalFields,
      action: ExerciseModalAction,
    ): Promise<void> => {
      void action;
      setExerciseSaving(true);
      setExerciseModalError(null);
      try {
        if (editingExercise) {
          await saveExercise(editingExercise.id, {
            name: fields.name,
            muscle: fields.muscle,
            videoLink: fields.videoLink,
          });
        } else {
          await createExerciseAndAdd({
            name: fields.name,
            muscle: fields.muscle,
            videoLink: fields.videoLink,
          });
          setPickerOpen(false);
          setPickerError(null);
        }
        setExerciseModalOpen(false);
        setEditingExercise(null);
      } catch (err: unknown) {
        // Anti-duplicata da #1: mensagem visível, modal permanece aberto.
        const message = toMessage(err, "Erro ao salvar exercício");
        setExerciseModalError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setExerciseSaving(false);
      }
    },
    [editingExercise, saveExercise, createExerciseAndAdd],
  );

  const handleEditExercise = useCallback(
    (entryId: string) => {
      const view = findView(entryId);
      if (!view) return;
      setEditingExercise(view.exercise);
      setExerciseModalError(null);
      setExerciseModalOpen(true);
    },
    [findView],
  );

  const handleRemoveEntry = useCallback(
    (entryId: string) => {
      const view = findView(entryId);
      if (!view) return;
      if (view.series.length === 0) {
        // D6: sem séries, ação direta.
        void removeEntry(view.entry).catch(() => {
          // O erro fica visível na página via hook (banner).
        });
        return;
      }
      setConfirm({
        variant: "remover-exercicio",
        entry: view.entry,
        exerciseName: view.exercise.name,
        seriesCount: view.series.length,
        currentQuantity: view.series.length,
        newQuantity: view.series.length,
      });
    },
    [findView, removeEntry],
  );

  const handleQuantityCommit = useCallback(
    (entryId: string, quantity: number) => {
      void setQuantity(entryId, quantity).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [setQuantity],
  );

  const handleRequestReduce = useCallback(
    (entryId: string, newQuantity: number) => {
      const view = findView(entryId);
      if (!view) return;
      setConfirm({
        variant: "reduzir-series",
        entry: view.entry,
        exerciseName: view.exercise.name,
        seriesCount: view.series.length,
        currentQuantity: view.series.length,
        newQuantity,
      });
    },
    [findView],
  );

  const handleRestCommit = useCallback(
    (entryId: string, seconds: number | null) => {
      void setRest(entryId, seconds).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [setRest],
  );

  const handleSeriesCommit = useCallback(
    (entryId: string, seriesId: string, field: SerieField, value: number | null) => {
      const view = findView(entryId);
      if (field === "load" && value !== null && view?.exercise.loadUnit === null) {
        pendingUnitRef.current[entryId] = { seriesId, value };
      }
      void updateSeries(seriesId, field, value).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [findView, updateSeries],
  );

  const handleApplyAll = useCallback(
    (entryId: string, seriesId: string) => {
      void applyToAll(entryId, seriesId).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [applyToAll],
  );

  const handleConfirmUnit = useCallback(
    (entryId: string, unit: LoadUnit) => {
      const view = findView(entryId);
      if (!view) return;
      const pending = pendingUnitRef.current[entryId];
      const seriesId = pending?.seriesId ?? view.series[0]?.id;
      const value = pending?.value ?? view.series[0]?.load ?? 0;
      if (!seriesId) return;
      void confirmLoadUnit(view.exercise.id, unit, seriesId, value)
        .then(() => {
          delete pendingUnitRef.current[entryId];
        })
        .catch(() => {
          // O erro fica visível na página via hook (banner).
        });
    },
    [findView, confirmLoadUnit],
  );

  const handleReorder = useCallback(
    (orderedIds: string[]) => {
      void reorderEntries(orderedIds).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [reorderEntries],
  );

  const handleConfirm = useCallback(() => {
    const target = confirm;
    if (!target) return;
    setConfirmProcessing(true);
    const done = () => {
      setConfirmProcessing(false);
      setConfirm(null);
    };
    if (target.variant === "remover-exercicio") {
      void removeEntry(target.entry).then(done, () => done());
    } else {
      void setQuantity(target.entry.id, target.newQuantity).then(done, () =>
        done(),
      );
    }
  }, [confirm, removeEntry, setQuantity]);

  const handleConfirmCancel = useCallback(() => {
    if (!confirmProcessing) setConfirm(null);
  }, [confirmProcessing]);

  return (
    <MilonLayout pageTitle="Treino">
      <AsyncState
        loading={loading}
        error={errorMsg}
        errorOrigin={errorOrigin}
        empty={workout === null}
        noResults={false}
        onRetry={() => void retry()}
        loadingText="Carregando treino…"
        emptyTitle="Treino não encontrado."
        emptyText="Este treino não existe ou foi removido. Volte e escolha outro treino."
      >
        {workout ? (
          <div className="flex flex-col gap-4">
            <section
              aria-label="Cabeçalho do treino"
              className="rounded-lg border bg-card p-6 shadow-sm flex flex-col gap-2"
            >
              <h2 className="font-display text-2xl leading-snug text-[#B7602B] tracking-wider">
                {workout.name}
              </h2>
            </section>

            {successNotice ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {successNotice}
              </div>
            ) : null}

            {readOnly ? null : (
              <div className="flex justify-end">
                <Button type="button" onClick={openPicker}>
                  Adicionar exercício
                </Button>
              </div>
            )}

            <WorkoutEntriesList
              entries={entries}
              programId={programId}
              readOnly={readOnly ?? false}
              empty={entries.length === 0}
              errorMsg={errorMsg}
              errorOrigin={errorOrigin}
              onAdd={openPicker}
              onRetry={() => void retry()}
              onReorder={handleReorder}
              onQuantityCommit={handleQuantityCommit}
              onRequestReduce={handleRequestReduce}
              onRestCommit={handleRestCommit}
              onSeriesCommit={handleSeriesCommit}
              onApplyAll={handleApplyAll}
              onEditExercise={handleEditExercise}
              onRemoveEntry={handleRemoveEntry}
              onConfirmUnit={handleConfirmUnit}
            />

            <ExercisePickerModal
              open={pickerOpen}
              exercises={pickerExercises}
              loading={false}
              error={pickerError}
              saving={pickerSaving}
              searchText={searchText}
              muscleFilter={muscleFilter}
              muscleOptions={muscleOptions}
              onSearch={setSearchText}
              onFilterMuscle={setMuscleFilter}
              onSelect={handleSelect}
              onCreateNew={handleCreateNew}
              onClose={closePicker}
            />

            <ExerciseModal
              open={exerciseModalOpen}
              editingExercise={editingExercise}
              muscleOptions={muscleOptions}
              saving={exerciseSaving}
              error={exerciseModalError}
              successNotice={null}
              onClose={closeExerciseModal}
              onSave={handleExerciseModalSave}
            />

            <WorkoutConfirmModal
              open={confirm !== null}
              variant={confirm?.variant ?? "remover-exercicio"}
              exerciseName={confirm?.exerciseName ?? ""}
              seriesCount={confirm?.seriesCount ?? 0}
              currentQuantity={confirm?.currentQuantity ?? 0}
              newQuantity={confirm?.newQuantity ?? 0}
              processing={confirmProcessing}
              onConfirm={handleConfirm}
              onCancel={handleConfirmCancel}
            />
          </div>
        ) : null}
      </AsyncState>
    </MilonLayout>
  );
}
