"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { ErrorOrigin } from "@/lib/shared";
import {
  listExercisesStandalone,
  createExerciseStandalone,
  updateExerciseStandalone,
  deleteExerciseStandalone,
} from "@/lib/milon/db/exercises";
import {
  EXERCISE_PAGE_SIZE,
  compareExercisesByMuscleThenName,
  compareExercisesByName,
  matchesExerciseQuery,
  normalizeExerciseText,
  type ExerciseSortOrder,
} from "@/lib/milon/utils";
import type { CreateExerciseInput, Exercise, ExerciseMode, LoadUnit, UpdateExerciseInput } from "@/lib/milon/types";

export interface SaveExerciseInput {
  name: string;
  muscle: string;
  videoLink?: string | null;
  mode?: ExerciseMode | null;
  loadUnit?: LoadUnit | null;
}

export interface UseExercisesReturn {
  exercises: Exercise[];
  filteredExercises: Exercise[];
  visibleExercises: Exercise[];
  remainingCount: number;
  muscleOptions: string[];
  muscleFilter: string;
  searchText: string;
  sortOrder: ExerciseSortOrder;
  visibleCount: number;
  loading: boolean;
  error: string | null;
  errorOrigin: ErrorOrigin | null;
  successNotice: string | null;
  setMuscleFilter: (value: string) => void;
  setSearchText: (value: string) => void;
  setSortOrder: (order: ExerciseSortOrder) => void;
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

function sortExercises(items: Exercise[], order: ExerciseSortOrder): Exercise[] {
  return [...items].sort(
    order === "name" ? compareExercisesByName : compareExercisesByMuscleThenName,
  );
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
  const [sortOrder, setSortOrderState] = useState<ExerciseSortOrder>("muscle");
  // Espelho mutável da ordem para os callbacks estáveis (applyList/fetchList
  // e efeito de mount): a troca de ordem reordena via setSortOrder abaixo.
  const sortOrderRef = useRef<ExerciseSortOrder>("muscle");
  const [visibleCount, setVisibleCount] = useState<number>(EXERCISE_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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

  const applyList = useCallback((items: Exercise[]) => {
    setExercises(sortExercises(items, sortOrderRef.current));
    setError(null);
    setErrorOrigin(null);
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorOrigin(null);
    try {
      const items = await listExercisesStandalone();
      applyList(items ?? []);
    } catch (err: unknown) {
      setError(toErrorMessage(err, "Erro ao carregar exercícios"));
      setErrorOrigin("carga");
    } finally {
      setLoading(false);
    }
  }, [applyList]);

  useEffect(() => {
    let cancelled = false;
    listExercisesStandalone().then(
      (items) => {
        if (cancelled) return;
        setExercises(sortExercises(items ?? [], sortOrderRef.current));
        setError(null);
        setErrorOrigin(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(toErrorMessage(err, "Erro ao carregar exercícios"));
        setErrorOrigin("carga");
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

  const setSortOrder = useCallback((order: ExerciseSortOrder) => {
    sortOrderRef.current = order;
    setSortOrderState(order);
    setExercises((prev) => sortExercises(prev, order));
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
      // Canal error/errorOrigin (D23/R27): save NÃO toca em nenhum dos dois —
      // nem em falha, nem em sucesso. O erro de save é relançado para o modal
      // exibir via `modalError` (page.tsx), como em usePrograms (R27).
      // A lista é atualizada sem passar por applyList: recarrega do banco e
      // garante o item salvo visível (upsert idempotente — sem efeito quando
      // a recarga já contém o salvo).
      try {
        // Modo/unidade pertencem ao exercício (aditamento 2026-10-09): repassa
        // quando o chamador informa; quando ausentes, preserva o payload exato
        // antigo (compat com chamadores ainda sem modo/unidade).
        const payload: CreateExerciseInput = {
          name: input.name,
          muscle: input.muscle,
          videoLink: input.videoLink ?? null,
        };
        if (input.mode !== undefined) payload.mode = input.mode ?? null;
        if (input.loadUnit !== undefined) payload.loadUnit = input.loadUnit ?? null;
        let saved: Exercise;
        if (id) {
          const updatePayload: UpdateExerciseInput = {
            name: payload.name,
            muscle: payload.muscle,
            videoLink: payload.videoLink ?? null,
          };
          if (input.mode !== undefined) updatePayload.mode = input.mode ?? null;
          if (input.loadUnit !== undefined)
            updatePayload.loadUnit = input.loadUnit ?? null;
          saved = await updateExerciseStandalone(id, updatePayload);
        } else {
          saved = await createExerciseStandalone(payload, await resolveEmail());
        }
        const items = await listExercisesStandalone();
        const base = items ?? [];
        const upserted = base.some((item) => item.id === saved.id)
          ? base.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...base];
        setExercises(sortExercises(upserted, sortOrderRef.current));
        flashSuccess(SUCCESS_SAVE_MESSAGE);
        return saved;
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao salvar exercício");
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [flashSuccess, resolveEmail],
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
      setErrorOrigin(null);
      try {
        await deleteExerciseStandalone(id);
        const items = await listExercisesStandalone();
        applyList(items ?? []);
        flashSuccess(SUCCESS_REMOVE_MESSAGE);
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao excluir exercício");
        setError(message);
        setErrorOrigin("operacao");
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
    sortOrder,
    visibleCount,
    loading,
    error,
    errorOrigin,
    successNotice,
    setMuscleFilter,
    setSearchText,
    setSortOrder,
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
