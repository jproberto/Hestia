"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import {
  listExercisesStandalone,
  createExerciseStandalone,
  updateExerciseStandalone,
  deleteExerciseStandalone,
} from "@/lib/milon/db/exercises";
import {
  EXERCISE_PAGE_SIZE,
  compareExercisesByMuscleThenName,
  matchesExerciseQuery,
  normalizeExerciseText,
} from "@/lib/milon/utils";
import type { CreateExerciseInput, Exercise } from "@/lib/milon/types";

export interface SaveExerciseInput {
  name: string;
  muscle: string;
  videoLink?: string | null;
}

export interface UseExercisesReturn {
  exercises: Exercise[];
  filteredExercises: Exercise[];
  visibleExercises: Exercise[];
  remainingCount: number;
  muscleOptions: string[];
  muscleFilter: string;
  searchText: string;
  visibleCount: number;
  loading: boolean;
  error: string | null;
  successNotice: string | null;
  setMuscleFilter: (value: string) => void;
  setSearchText: (value: string) => void;
  showMore: () => void;
  clearFilters: () => void;
  reload: () => Promise<void>;
  retry: () => Promise<void>;
  refetch: () => Promise<void>;
  save: (input: SaveExerciseInput, id?: string | null) => Promise<Exercise>;
  saveAndNew: (input: SaveExerciseInput) => Promise<Exercise>;
  remove: (id: string) => Promise<void>;
}

const SUCCESS_SAVE_MESSAGE = "Exercício salvo com sucesso.";
const SUCCESS_REMOVE_MESSAGE = "Exercício excluído com sucesso.";
const SUCCESS_NOTICE_MS = 3000;

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function sortExercises(items: Exercise[]): Exercise[] {
  return [...items].sort(compareExercisesByMuscleThenName);
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

// Fetch+estado no padrão do projeto (promise-chain + flag cancelled no mount;
// operações via barrels `db/exercises` + puras de `utils.ts`).
export function useExercises(): UseExercisesReturn {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleFilter, setMuscleFilterState] = useState<string>("");
  const [searchText, setSearchTextState] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(EXERCISE_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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

  const applyList = useCallback((items: Exercise[]) => {
    setExercises(sortExercises(items));
    setError(null);
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listExercisesStandalone();
      applyList(items ?? []);
    } catch (err: unknown) {
      setError(toErrorMessage(err, "Erro ao carregar exercícios"));
    } finally {
      setLoading(false);
    }
  }, [applyList]);

  useEffect(() => {
    let cancelled = false;
    listExercisesStandalone().then(
      (items) => {
        if (cancelled) return;
        setExercises(sortExercises(items ?? []));
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(toErrorMessage(err, "Erro ao carregar exercícios"));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const setMuscleFilter = useCallback((value: string) => {
    setMuscleFilterState(value);
    setVisibleCount(EXERCISE_PAGE_SIZE);
  }, []);

  const setSearchText = useCallback((value: string) => {
    setSearchTextState(value);
    setVisibleCount(EXERCISE_PAGE_SIZE);
  }, []);

  const showMore = useCallback(() => {
    setVisibleCount((current) => current + EXERCISE_PAGE_SIZE);
  }, []);

  const clearFilters = useCallback(() => {
    setMuscleFilterState("");
    setSearchTextState("");
    setVisibleCount(EXERCISE_PAGE_SIZE);
  }, []);

  const filteredExercises = useMemo(() => {
    const normalizedMuscle = normalizeExerciseText(muscleFilter);
    return exercises.filter((exercise) => {
      const muscleOk =
        normalizedMuscle === "" ||
        normalizeExerciseText(exercise.muscle) === normalizedMuscle;
      if (!muscleOk) return false;
      return matchesExerciseQuery(exercise, searchText);
    });
  }, [exercises, muscleFilter, searchText]);

  const visibleExercises = useMemo(
    () => filteredExercises.slice(0, visibleCount),
    [filteredExercises, visibleCount],
  );

  const remainingCount = Math.max(0, filteredExercises.length - visibleExercises.length);

  const muscleOptions = useMemo(() => deriveMuscleOptions(exercises), [exercises]);

  const reload = useCallback(() => fetchList(), [fetchList]);

  const resolveEmail = useCallback(async (): Promise<string> => {
    const email = await db.getUserEmail();
    return email ?? "";
  }, [db]);

  const save = useCallback(
    async (input: SaveExerciseInput, id?: string | null): Promise<Exercise> => {
      setError(null);
      try {
        const payload: CreateExerciseInput = {
          name: input.name,
          muscle: input.muscle,
          videoLink: input.videoLink ?? null,
        };
        let saved: Exercise;
        if (id) {
          saved = await updateExerciseStandalone(id, {
            name: payload.name,
            muscle: payload.muscle,
            videoLink: payload.videoLink ?? null,
          });
        } else {
          saved = await createExerciseStandalone(payload, await resolveEmail());
        }
        const items = await listExercisesStandalone();
        applyList(items ?? []);
        flashSuccess(SUCCESS_SAVE_MESSAGE);
        return saved;
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao salvar exercício");
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [applyList, flashSuccess, resolveEmail],
  );

  const saveAndNew = useCallback(
    async (input: SaveExerciseInput): Promise<Exercise> => {
      const saved = await save(input);
      flashSuccess(SUCCESS_SAVE_MESSAGE);
      return saved;
    },
    [save, flashSuccess],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await deleteExerciseStandalone(id);
        const items = await listExercisesStandalone();
        applyList(items ?? []);
        flashSuccess(SUCCESS_REMOVE_MESSAGE);
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao excluir exercício");
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [applyList, flashSuccess],
  );

  return {
    exercises,
    filteredExercises,
    visibleExercises,
    remainingCount,
    muscleOptions,
    muscleFilter,
    searchText,
    visibleCount,
    loading,
    error,
    successNotice,
    setMuscleFilter,
    setSearchText,
    showMore,
    clearFilters,
    reload,
    retry: reload,
    refetch: reload,
    save,
    saveAndNew,
    remove,
  };
}
