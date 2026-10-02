"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import {
  createWorkoutStandalone,
  deleteWorkoutStandalone,
  listEntriesByProgramStandalone,
  listWorkoutsByProgramStandalone,
  updateWorkoutNameStandalone,
} from "@/lib/milon/db/workouts";
import { listExercisesAllStandalone } from "@/lib/milon/db/exercises";
import {
  MSG_TREINO_COM_EXERCICIOS,
  gerarSubtituloMusculares,
  normalizarNomeTreino,
  validarNomeTreino,
  validarNomeUnicoNoPrograma,
} from "@/lib/milon/workout-utils";
import type {
  CreateWorkoutInput,
  Exercise,
  ProgramErrorOrigin,
  UpdateWorkoutInput,
  Workout,
  WorkoutEntry,
} from "@/lib/milon/types";

export interface UseProgramWorkoutsReturn {
  workouts: Workout[];
  subtitles: Record<string, string>;
  loading: boolean;
  errorMsg: string | null;
  errorOrigin: ProgramErrorOrigin | null;
  successNotice: string | null;
  retry: () => Promise<void>;
  create: (input: CreateWorkoutInput) => Promise<Workout>;
  rename: (id: string, input: UpdateWorkoutInput) => Promise<void>;
  remove: (workout: Workout) => Promise<void>;
}

const SUCCESS_SAVE_MESSAGE = "Treino salvo com sucesso.";
const SUCCESS_REMOVE_MESSAGE = "Treino excluído com sucesso.";
const SUCCESS_NOTICE_MS = 3000;

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function buildSubtitles(
  workouts: Workout[],
  entries: WorkoutEntry[],
  exercises: Exercise[],
): Record<string, string> {
  const muscleByExercise = new Map<string, string>();
  for (const exercise of exercises) {
    muscleByExercise.set(exercise.id, exercise.muscle);
  }
  const musclesByWorkout = new Map<string, string[]>();
  for (const workout of workouts) {
    musclesByWorkout.set(workout.id, []);
  }
  for (const entry of entries) {
    const muscle = muscleByExercise.get(entry.exerciseId);
    if (muscle == null) continue;
    const list = musclesByWorkout.get(entry.workoutId);
    if (list) list.push(muscle);
  }
  const subtitles: Record<string, string> = {};
  for (const workout of workouts) {
    subtitles[workout.id] = gerarSubtituloMusculares(
      musclesByWorkout.get(workout.id) ?? [],
    );
  }
  return subtitles;
}

// Lista de treinos do Programa com subtítulos derivados (padrão do módulo:
// promise-chain + flag cancelled no mount; operações pelos barrels `db/*`).
export function useProgramWorkouts(programId: string): UseProgramWorkoutsReturn {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [subtitles, setSubtitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorOrigin, setErrorOrigin] = useState<ProgramErrorOrigin | null>(
    null,
  );
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

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listWorkoutsByProgramStandalone(programId),
      listEntriesByProgramStandalone(programId),
      listExercisesAllStandalone(),
    ]).then(
      ([items, entries, exercises]) => {
        if (cancelled) return;
        const list = items ?? [];
        setWorkouts(list);
        setSubtitles(buildSubtitles(list, entries ?? [], exercises ?? []));
        setErrorMsg(null);
        setErrorOrigin(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setErrorMsg(toErrorMessage(err, "Erro ao carregar treinos"));
        setErrorOrigin("carga");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setErrorOrigin(null);
    try {
      const [items, entries, exercises] = await Promise.all([
        listWorkoutsByProgramStandalone(programId),
        listEntriesByProgramStandalone(programId),
        listExercisesAllStandalone(),
      ]);
      const list = items ?? [];
      setWorkouts(list);
      setSubtitles(buildSubtitles(list, entries ?? [], exercises ?? []));
      setErrorMsg(null);
      setErrorOrigin(null);
    } catch (err: unknown) {
      setErrorMsg(toErrorMessage(err, "Erro ao carregar treinos"));
      setErrorOrigin("carga");
    } finally {
      setLoading(false);
    }
  }, [programId]);

  const refreshList = useCallback(async () => {
    const [items, entries, exercises] = await Promise.all([
      listWorkoutsByProgramStandalone(programId),
      listEntriesByProgramStandalone(programId),
      listExercisesAllStandalone(),
    ]);
    const list = items ?? [];
    setWorkouts(list);
    setSubtitles(buildSubtitles(list, entries ?? [], exercises ?? []));
    setErrorMsg(null);
    setErrorOrigin(null);
  }, [programId]);

  const retry = useCallback(() => fetchList(), [fetchList]);

  const resolveEmail = useCallback(async (): Promise<string> => {
    const email = await db.getUserEmail();
    return email ?? "";
  }, [db]);

  const create = useCallback(
    async (input: CreateWorkoutInput): Promise<Workout> => {
      // Erro de create NÃO alimenta `errorMsg`/`errorOrigin`: relançado para
      // o modal exibir (padrão `save` de `usePrograms`).
      const normalized = normalizarNomeTreino(input.name);
      const obrigatorio = validarNomeTreino(normalized);
      if (obrigatorio) throw new Error(obrigatorio);
      const colisao = validarNomeUnicoNoPrograma(
        normalized,
        workouts.map((w) => w.name),
      );
      if (colisao) throw new Error(colisao);
      let saved: Workout;
      try {
        saved = await createWorkoutStandalone(
          programId,
          { name: normalized },
          await resolveEmail(),
        );
      } catch (err: unknown) {
        throw err instanceof Error ? err : new Error("Erro ao criar treino");
      }
      await refreshList();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
      return saved;
    },
    [workouts, programId, resolveEmail, refreshList, flashSuccess],
  );

  const rename = useCallback(
    async (id: string, input: UpdateWorkoutInput): Promise<void> => {
      // Mesmo canal do create: erro relançado ao modal, sem tocar na lista.
      const normalized = normalizarNomeTreino(input.name);
      const obrigatorio = validarNomeTreino(normalized);
      if (obrigatorio) throw new Error(obrigatorio);
      const colisao = validarNomeUnicoNoPrograma(
        normalized,
        workouts.filter((w) => w.id !== id).map((w) => w.name),
      );
      if (colisao) throw new Error(colisao);
      try {
        await updateWorkoutNameStandalone(id, { name: normalized });
      } catch (err: unknown) {
        throw err instanceof Error ? err : new Error("Erro ao renomear treino");
      }
      await refreshList();
      flashSuccess(SUCCESS_SAVE_MESSAGE);
    },
    [workouts, refreshList, flashSuccess],
  );

  const remove = useCallback(
    async (workout: Workout): Promise<void> => {
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        await deleteWorkoutStandalone(workout.id);
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao excluir treino");
        setErrorMsg(message);
        setErrorOrigin(
          message === MSG_TREINO_COM_EXERCICIOS ? "bloqueio" : "operacao",
        );
        throw err instanceof Error ? err : new Error(message);
      }
      await refreshList();
      flashSuccess(SUCCESS_REMOVE_MESSAGE);
    },
    [refreshList, flashSuccess],
  );

  return {
    workouts,
    subtitles,
    loading,
    errorMsg,
    errorOrigin,
    successNotice,
    retry,
    create,
    rename,
    remove,
  };
}
