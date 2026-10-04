"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import { findActiveProgramByOwnerStandalone } from "@/lib/milon/db/programs";
import { listWorkoutsByProgramStandalone } from "@/lib/milon/db/workouts";
import type {
  Program,
  ProgramErrorOrigin,
  Workout,
} from "@/lib/milon/types";

export interface UseTodayWorkoutReturn {
  program: Program | null;
  workouts: Workout[];
  selectedWorkoutId: string | null;
  selectWorkout: (workoutId: string) => void;
  loading: boolean;
  errorMsg: string | null;
  errorOrigin: ProgramErrorOrigin | null;
  successNotice: null;
  retry: () => Promise<void>;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// Seleção do treino do dia (padrão do módulo: promise-chain + flag
// cancelled no mount; operações só via barrels `db/*`).
export function useTodayWorkout(): UseTodayWorkoutReturn {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorOrigin, setErrorOrigin] =
    useState<ProgramErrorOrigin | null>(null);

  useEffect(() => {
    let cancelled = false;
    db.getUserEmail().then(
      (email) => {
        if (cancelled) return;
        if (!email) {
          setProgram(null);
          setWorkouts([]);
          setSelectedWorkoutId(null);
          setErrorMsg(null);
          setErrorOrigin(null);
          setLoading(false);
          return;
        }
        findActiveProgramByOwnerStandalone(email).then(
          (active) => {
            if (cancelled) return;
            if (active == null) {
              setProgram(null);
              setWorkouts([]);
              setSelectedWorkoutId(null);
              setErrorMsg(null);
              setErrorOrigin(null);
              setLoading(false);
              return;
            }
            setProgram(active);
            listWorkoutsByProgramStandalone(active.id).then(
              (items) => {
                if (cancelled) return;
                const list = items ?? [];
                setWorkouts(list);
                setSelectedWorkoutId(
                  list.length > 0 ? list[0].id : null,
                );
                setErrorMsg(null);
                setErrorOrigin(null);
                setLoading(false);
              },
              (err: unknown) => {
                if (cancelled) return;
                setWorkouts([]);
                setSelectedWorkoutId(null);
                setErrorMsg(
                  toErrorMessage(err, "Erro ao carregar treino do dia"),
                );
                setErrorOrigin("carga");
                setLoading(false);
              },
            );
          },
          (err: unknown) => {
            if (cancelled) return;
            setProgram(null);
            setWorkouts([]);
            setSelectedWorkoutId(null);
            setErrorMsg(toErrorMessage(err, "Erro ao carregar treino do dia"));
            setErrorOrigin("carga");
            setLoading(false);
          },
        );
      },
      (err: unknown) => {
        if (cancelled) return;
        setProgram(null);
        setWorkouts([]);
        setSelectedWorkoutId(null);
        setErrorMsg(toErrorMessage(err, "Erro ao carregar treino do dia"));
        setErrorOrigin("carga");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  const fetchSelection = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setErrorOrigin(null);
    let resolvedProgram: Program | null = null;
    try {
      const email = await db.getUserEmail();
      if (!email) {
        setProgram(null);
        setWorkouts([]);
        setSelectedWorkoutId(null);
        setErrorMsg(null);
        setErrorOrigin(null);
        return;
      }
      const active = await findActiveProgramByOwnerStandalone(email);
      if (active == null) {
        setProgram(null);
        setWorkouts([]);
        setSelectedWorkoutId(null);
        setErrorMsg(null);
        setErrorOrigin(null);
        return;
      }
      resolvedProgram = active;
      setProgram(active);
      let items: Workout[];
      try {
        items = await listWorkoutsByProgramStandalone(active.id);
      } catch (err: unknown) {
        setWorkouts([]);
        setSelectedWorkoutId(null);
        throw err;
      }
      const list = items ?? [];
      setWorkouts(list);
      setSelectedWorkoutId(list.length > 0 ? list[0].id : null);
      setErrorMsg(null);
      setErrorOrigin(null);
    } catch (err: unknown) {
      if (resolvedProgram == null) {
        setProgram(null);
        setWorkouts([]);
        setSelectedWorkoutId(null);
      }
      setErrorMsg(toErrorMessage(err, "Erro ao carregar treino do dia"));
      setErrorOrigin("carga");
    } finally {
      setLoading(false);
    }
  }, [db]);

  const retry = useCallback(() => fetchSelection(), [fetchSelection]);

  const selectWorkout = useCallback(
    (workoutId: string) => {
      if (!workouts.some((w) => w.id === workoutId)) return;
      setSelectedWorkoutId(workoutId);
    },
    [workouts],
  );

  return {
    program,
    workouts,
    selectedWorkoutId,
    selectWorkout,
    loading,
    errorMsg,
    errorOrigin,
    successNotice: null,
    retry,
  };
}
