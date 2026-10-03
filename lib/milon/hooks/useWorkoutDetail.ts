"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { ErrorOrigin } from "@/lib/shared";
import {
  addEntryStandalone,
  applySeriesToAllStandalone,
  findWorkoutByIdStandalone,
  listEntriesByProgramStandalone,
  listSeriesByEntryStandalone,
  listWorkoutsByProgramStandalone,
  removeEntryStandalone,
  reorderEntriesStandalone,
  setEntryRestSecondsStandalone,
  setSeriesQuantityStandalone,
  updateSeriesFieldsStandalone,
} from "@/lib/milon/db/workouts";
import {
  createExerciseStandalone,
  listExercisesAllStandalone,
  setExerciseLoadUnitStandalone,
  updateExerciseStandalone,
} from "@/lib/milon/db/exercises";
import { findProgramByIdStandalone } from "@/lib/milon/db/programs";
import {
  MSG_EXERCICIO_JA_NO_TREINO,
  MSG_PROGRAMA_COM_TREINOS,
  MSG_TREINO_COM_EXERCICIOS,
} from "@/lib/milon/workout-utils";
import type { UpdateSeriesFieldsInput } from "@/lib/milon/repositories/interfaces";
import type {
  Exercise,
  LoadUnit,
  Program,
  Workout,
  WorkoutEntry,
  WorkoutEntryView,
  WorkoutSeries,
} from "@/lib/milon/types";

export type WorkoutSeriesField = "reps" | "durationSeconds" | "load";

export interface SaveWorkoutExerciseInput {
  name: string;
  muscle: string;
  videoLink: string | null;
}

export interface CreateWorkoutExerciseInput {
  name: string;
  muscle: string;
  videoLink?: string | null;
}

export interface UseWorkoutDetailReturn {
  workout: Workout | null;
  program: Program | null;
  entries: WorkoutEntryView[];
  exercises: Exercise[];
  workoutUsedExerciseIds: string[];
  loading: boolean;
  errorMsg: string | null;
  errorOrigin: ErrorOrigin | null;
  successNotice: string | null;
  retry: () => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
  removeEntry: (entry: WorkoutEntry) => Promise<void>;
  reorderEntries: (orderedIds: string[]) => Promise<void>;
  setQuantity: (entryId: string, quantity: number) => Promise<void>;
  setRest: (entryId: string, seconds: number | null) => Promise<void>;
  updateSeries: (
    seriesId: string,
    field: WorkoutSeriesField,
    value: number | null,
  ) => Promise<void>;
  applyToAll: (entryId: string, originSeriesId: string) => Promise<void>;
  saveExercise: (
    id: string,
    input: SaveWorkoutExerciseInput,
  ) => Promise<Exercise>;
  createExerciseAndAdd: (
    input: CreateWorkoutExerciseInput,
  ) => Promise<Exercise>;
  confirmLoadUnit: (
    exerciseId: string,
    unit: LoadUnit,
    seriesId: string,
    value: number,
  ) => Promise<void>;
}

const SUCCESS_NOTICE_MS = 3000;
const SUCCESS_SAVE_MESSAGE = "Alteração salva com sucesso.";
const ORDEM_GUARDA_MESSAGE =
  "A ordem informada não corresponde aos exercícios do treino.";

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function toErrorOrigin(message: string): ErrorOrigin {
  if (
    message === ORDEM_GUARDA_MESSAGE ||
    message === MSG_TREINO_COM_EXERCICIOS ||
    message === MSG_EXERCICIO_JA_NO_TREINO ||
    message === MSG_PROGRAMA_COM_TREINOS
  ) {
    return "bloqueio";
  }
  return "operacao";
}

interface LoadedDetail {
  workout: Workout | null;
  program: Program | null;
  views: WorkoutEntryView[];
  exercises: Exercise[];
  workoutUsedIds: string[];
}

async function carregarCadeia(workoutId: string): Promise<LoadedDetail> {
  const workout = await findWorkoutByIdStandalone(workoutId);
  if (!workout) {
    return { workout: null, program: null, views: [], exercises: [], workoutUsedIds: [] };
  }
  const program = await findProgramByIdStandalone(workout.programId);
  const allEntries =
    (await listEntriesByProgramStandalone(workout.programId)) ?? [];
  const mine = allEntries
    .filter((entry) => entry.workoutId === workoutId)
    .sort((a, b) => a.position - b.position);
  const seriesArrays = await Promise.all(
    mine.map((entry) => listSeriesByEntryStandalone(entry.id)),
  );
  const exercises = (await listExercisesAllStandalone()) ?? [];
  await listWorkoutsByProgramStandalone(workout.programId);

  const exerciseById = new Map<string, Exercise>();
  for (const exercise of exercises) {
    exerciseById.set(exercise.id, exercise);
  }
  const views: WorkoutEntryView[] = [];
  for (let i = 0; i < mine.length; i += 1) {
    const entry = mine[i];
    // Em produção `listExercisesAll` devolve todos os exercícios (inclusive o
    // recém-adicionado), mas a view nunca pode sumir por falta de cadastro:
    // sem correspondência, usa um substituto vazio preservando a entrada.
    const exercise = exerciseById.get(entry.exerciseId) ?? {
      id: entry.exerciseId,
      name: "",
      muscle: "",
      videoLink: null,
      loadUnit: null,
      deletedAt: null,
      createdAt: "",
      created_by: "",
    } satisfies Exercise;
    const series = [...(seriesArrays[i] ?? [])].sort(
      (a, b) => a.position - b.position,
    );
    views.push({ entry, exercise, series });
  }
  // workoutUsedIds: exercícios já presentes NESTE treino (para D14 por treino)
  const seen = new Set<string>();
  const workoutUsedIds: string[] = [];
  for (const entry of mine) {
    if (!seen.has(entry.exerciseId)) {
      seen.add(entry.exerciseId);
      workoutUsedIds.push(entry.exerciseId);
    }
  }
  return { workout, program: program ?? null, views, exercises, workoutUsedIds };
}

// Detalhe do treino (padrão do módulo: promise-chain + flag cancelled no
// mount; operações pelos barrels `db/*`). Operações de modal relançam o erro
// sem tocar em `errorMsg`; operações de lista alimentam o banner da página.
export function useWorkoutDetail(workoutId: string): UseWorkoutDetailReturn {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [entries, setEntries] = useState<WorkoutEntryView[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutUsedExerciseIds, setWorkoutUsedExerciseIds] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorOrigin, setErrorOrigin] = useState<ErrorOrigin | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSuccess = useCallback((message: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setSuccessNotice(message);
    noticeTimerRef.current = setTimeout(() => {
      setSuccessNotice(null);
    }, SUCCESS_NOTICE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const applyLoaded = useCallback((loaded: LoadedDetail) => {
    setWorkout(loaded.workout);
    setProgram(loaded.program);
    setEntries(loaded.views);
    setExercises(loaded.exercises);
    setWorkoutUsedExerciseIds(loaded.workoutUsedIds);
  }, []);

  useEffect(() => {
    let cancelled = false;
    carregarCadeia(workoutId).then(
      (loaded) => {
        if (cancelled) return;
        applyLoaded(loaded);
        setErrorMsg(null);
        setErrorOrigin(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setErrorMsg(toErrorMessage(err, "Erro ao carregar treino"));
        setErrorOrigin("carga");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [workoutId, applyLoaded]);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setErrorOrigin(null);
    try {
      const loaded = await carregarCadeia(workoutId);
      applyLoaded(loaded);
      setErrorMsg(null);
      setErrorOrigin(null);
    } catch (err: unknown) {
      setErrorMsg(toErrorMessage(err, "Erro ao carregar treino"));
      setErrorOrigin("carga");
    } finally {
      setLoading(false);
    }
  }, [workoutId, applyLoaded]);

  const refreshViews = useCallback(async () => {
    const loaded = await carregarCadeia(workoutId);
    applyLoaded(loaded);
    setErrorMsg(null);
    setErrorOrigin(null);
  }, [workoutId, applyLoaded]);

  const retry = useCallback(() => fetchDetail(), [fetchDetail]);

  const resolveEmail = useCallback(async (): Promise<string> => {
    const email = await db.getUserEmail();
    return email ?? "";
  }, [db]);

  const failAsPage = useCallback((err: unknown, fallback: string): Error => {
    const message = toErrorMessage(err, fallback);
    setErrorMsg(message);
    setErrorOrigin(toErrorOrigin(message));
    return err instanceof Error ? err : new Error(message);
  }, []);

  const addExercise = useCallback(
    async (exerciseId: string): Promise<void> => {
      const current = workout;
      if (!current) throw new Error("Treino não carregado.");
      try {
        await addEntryStandalone(
          current.id,
          current.programId,
          exerciseId,
          await resolveEmail(),
        );
      } catch (err: unknown) {
        throw err instanceof Error ? err : new Error("Erro ao adicionar exercício");
      }
      await refreshViews();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
    },
    [workout, resolveEmail, refreshViews, flashSuccess],
  );

  const createExerciseAndAdd = useCallback(
    async (input: CreateWorkoutExerciseInput): Promise<Exercise> => {
      const current = workout;
      if (!current) throw new Error("Treino não carregado.");
      let created: Exercise;
      try {
        const email = await resolveEmail();
        created = await createExerciseStandalone(
          {
            name: input.name,
            muscle: input.muscle,
            videoLink: input.videoLink ?? null,
          },
          email,
        );
        await addEntryStandalone(
          current.id,
          current.programId,
          created.id,
          email,
        );
      } catch (err: unknown) {
        throw err instanceof Error ? err : new Error("Erro ao cadastrar exercício");
      }
      await refreshViews();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
      return created;
    },
    [workout, resolveEmail, refreshViews, flashSuccess],
  );

  const saveExercise = useCallback(
    async (id: string, input: SaveWorkoutExerciseInput): Promise<Exercise> => {
      let saved: Exercise;
      try {
        saved = await updateExerciseStandalone(id, {
          name: input.name,
          muscle: input.muscle,
          videoLink: input.videoLink,
        });
      } catch (err: unknown) {
        throw err instanceof Error ? err : new Error("Erro ao salvar exercício");
      }
      await refreshViews();
      return saved;
    },
    [refreshViews],
  );

  const removeEntry = useCallback(
    async (entry: WorkoutEntry): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        await removeEntryStandalone(entry.id);
      } catch (err: unknown) {
        throw failAsPage(err, "Erro ao remover exercício");
      }
      await refreshViews();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
    },
    [refreshViews, flashSuccess, failAsPage],
  );

  const reorderEntries = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const current = workout;
      if (!current) throw new Error("Treino não carregado.");
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        await reorderEntriesStandalone(current.id, orderedIds);
      } catch (err: unknown) {
        throw failAsPage(err, "Erro ao reordenar exercícios");
      }
      await refreshViews();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
    },
    [workout, refreshViews, flashSuccess, failAsPage],
  );

  const setQuantity = useCallback(
    async (entryId: string, quantity: number): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        await setSeriesQuantityStandalone(
          entryId,
          quantity,
          await resolveEmail(),
        );
      } catch (err: unknown) {
        throw failAsPage(err, "Erro ao ajustar séries");
      }
      await refreshViews();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
    },
    [resolveEmail, refreshViews, flashSuccess, failAsPage],
  );

  const setRest = useCallback(
    async (entryId: string, seconds: number | null): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        await setEntryRestSecondsStandalone(entryId, seconds);
      } catch (err: unknown) {
        throw failAsPage(err, "Erro ao salvar descanso");
      }
      await refreshViews();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
    },
    [refreshViews, flashSuccess, failAsPage],
  );

  const updateSeries = useCallback(
    async (
      seriesId: string,
      field: WorkoutSeriesField,
      value: number | null,
    ): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      const payload: UpdateSeriesFieldsInput =
        field === "reps"
          ? { reps: value }
          : field === "durationSeconds"
            ? { durationSeconds: value }
            : { load: value };
      try {
        await updateSeriesFieldsStandalone(seriesId, payload);
      } catch (err: unknown) {
        throw failAsPage(err, "Erro ao salvar série");
      }
      await refreshViews();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
    },
    [refreshViews, flashSuccess, failAsPage],
  );

  const applyToAll = useCallback(
    async (entryId: string, originSeriesId: string): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        await applySeriesToAllStandalone(entryId, originSeriesId);
      } catch (err: unknown) {
        throw failAsPage(err, "Erro ao aplicar a todas");
      }
      await refreshViews();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
    },
    [refreshViews, flashSuccess, failAsPage],
  );

  const confirmLoadUnit = useCallback(
    async (
      exerciseId: string,
      unit: LoadUnit,
      seriesId: string,
      value: number,
    ): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        await updateSeriesFieldsStandalone(seriesId, { load: value });
        await setExerciseLoadUnitStandalone(exerciseId, unit);
      } catch (err: unknown) {
        throw failAsPage(err, "Erro ao salvar unidade da carga");
      }
      await refreshViews();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
    },
    [refreshViews, flashSuccess, failAsPage],
  );

  return {
    workout,
    program,
    entries,
    exercises,
    workoutUsedExerciseIds,
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
  };
}

// Re-export de tipos auxiliares sem duplicar a fonte única (`types.ts`).
export type { WorkoutSeries };
