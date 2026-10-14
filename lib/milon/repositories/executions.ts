// Acesso a dados da execução série a série via IDatabaseClient (nunca @supabase/*).
// Regras de persistência vivem aqui (abertura idempotente D11-adaptado,
// unicidade de uma aberta por treino, marcação idempotente, selamento via
// UPDATE de finished_at filtrado por execução aberta — Mílon #7).
// UI consome via lib/milon/db/executions.
import type { IDatabaseClient } from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { MarkExecutionSeriesInput } from "./interfaces";
import type {
  WorkoutExecution,
  WorkoutExecutionRow,
  WorkoutExecutionSeries,
  WorkoutExecutionSeriesRow,
} from "../types";

function toExecutionDomain(row: WorkoutExecutionRow): WorkoutExecution {
  return {
    id: row.id,
    workoutId: row.workout_id,
    programId: row.program_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    created_by: row.created_by,
  };
}

function toDoneDomain(row: WorkoutExecutionSeriesRow): WorkoutExecutionSeries {
  return {
    id: row.id,
    executionId: row.execution_id,
    entryId: row.entry_id,
    seriesId: row.series_id,
    position: row.position,
    value: row.value,
    load: row.load,
    createdAt: row.created_at,
    created_by: row.created_by,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: unknown; message?: unknown; details?: unknown };
  if (err.code === "23505") return true;
  const haystack = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  return haystack.includes("duplicate") || haystack.includes("unique");
}

export async function findOpenExecutionByWorkout(
  db: IDatabaseClient,
  workoutId: string,
): Promise<WorkoutExecution | null> {
  const { data, error } = await db
    .from<WorkoutExecutionRow>("workout_executions")
    .select("*")
    .eq("workout_id", workoutId)
    .is("finished_at", null)
    .maybeSingle();

  if (error) throw error;
  return data ? toExecutionDomain(data) : null;
}

export async function startExecution(
  db: IDatabaseClient,
  workoutId: string,
  programId: string,
  email: string,
): Promise<WorkoutExecution> {
  const aberta = await findOpenExecutionByWorkout(db, workoutId);
  if (aberta) return aberta;

  try {
    const { data, error } = await db
      .from<WorkoutExecutionRow>("workout_executions")
      .insert({
        workout_id: workoutId,
        program_id: programId,
        created_by: email,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Falha ao abrir execução: sem retorno do banco.");
    return toExecutionDomain(data);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existente = await findOpenExecutionByWorkout(db, workoutId);
    if (existente) return existente;
    throw error;
  }
}

export async function finishExecution(
  db: IDatabaseClient,
  executionId: string,
): Promise<WorkoutExecution> {
  const { data, error } = await db
    .from<WorkoutExecutionRow>("workout_executions")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", executionId)
    .is("finished_at", null)
    .select()
    .single();

  if (error) throw error;
  if (!data)
    throw new Error(
      "Falha ao finalizar execução: execução não encontrada ou já finalizada.",
    );
  return toExecutionDomain(data);
}

export async function clearExecution(
  db: IDatabaseClient,
  executionId: string,
): Promise<void> {
  const { error } = await db
    .from<WorkoutExecutionRow>("workout_executions")
    .delete()
    .eq("id", executionId);
  if (error) throw error;
}

// Última selada do programa (Mílon 07b, D1/DSELT1, plan §3): finished_at
// não-nulo, por finished_at desc com desempate por created_at desc e id desc.
// A filtragem de não-nulo é em memória sobre a consulta por programa, pois a
// interface do cliente não expressa negação de nulo. Nulo sem selada.
export async function findLastSealedExecutionByProgram(
  db: IDatabaseClient,
  programId: string,
): Promise<WorkoutExecution | null> {
  const { data, error } = await db
    .from<WorkoutExecutionRow>("workout_executions")
    .select("*")
    .eq("program_id", programId)
    .order("finished_at", { ascending: false });

  if (error) throw error;
  const seladas = (data || []).filter((row) => row.finished_at !== null);
  seladas.sort((a, b) => {
    const fimA = a.finished_at as string;
    const fimB = b.finished_at as string;
    if (fimA !== fimB) return fimA < fimB ? 1 : -1;
    if (a.created_at !== b.created_at)
      return a.created_at < b.created_at ? 1 : -1;
    if (a.id !== b.id) return a.id < b.id ? 1 : -1;
    return 0;
  });
  const ultima = seladas[0];
  return ultima ? toExecutionDomain(ultima) : null;
}

// Aberta do programa (Mílon 07b, D10/DABT1, plan §3): finished_at nulo, mais
// recente por started_at desc com desempate por id desc. Havendo mais de uma
// aberta (possível até o invariante por dono do item 7c, fora desta feature),
// a mais recente prevalece. Nulo sem aberta.
export async function findOpenExecutionByProgram(
  db: IDatabaseClient,
  programId: string,
): Promise<WorkoutExecution | null> {
  const { data, error } = await db
    .from<WorkoutExecutionRow>("workout_executions")
    .select("*")
    .eq("program_id", programId)
    .is("finished_at", null)
    .order("started_at", { ascending: false });

  if (error) throw error;
  const abertas = (data || []).filter((row) => row.finished_at === null);
  abertas.sort((a, b) => {
    if (a.started_at !== b.started_at)
      return a.started_at < b.started_at ? 1 : -1;
    if (a.id !== b.id) return a.id < b.id ? 1 : -1;
    return 0;
  });
  const aberta = abertas[0];
  return aberta ? toExecutionDomain(aberta) : null;
}

export async function listDoneByExecution(
  db: IDatabaseClient,
  executionId: string,
): Promise<WorkoutExecutionSeries[]> {
  const { data, error } = await db
    .from<WorkoutExecutionSeriesRow>("workout_execution_series")
    .select("*")
    .eq("execution_id", executionId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data || []).map(toDoneDomain);
}

export async function markSeriesDone(
  db: IDatabaseClient,
  input: MarkExecutionSeriesInput,
  email: string,
): Promise<WorkoutExecutionSeries> {
  try {
    const { data, error } = await db
      .from<WorkoutExecutionSeriesRow>("workout_execution_series")
      .insert({
        execution_id: input.executionId,
        entry_id: input.entryId,
        series_id: input.seriesId,
        position: input.position,
        value: input.value,
        load: input.load,
        created_by: email,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Falha ao marcar série: sem retorno do banco.");
    return toDoneDomain(data);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const { data, error: readError } = await db
      .from<WorkoutExecutionSeriesRow>("workout_execution_series")
      .select("*")
      .eq("execution_id", input.executionId)
      .eq("series_id", input.seriesId)
      .maybeSingle();
    if (readError) throw readError;
    if (!data) throw error;
    return toDoneDomain(data);
  }
}

export async function unmarkSeries(
  db: IDatabaseClient,
  executionId: string,
  seriesId: string,
): Promise<void> {
  const { error } = await db
    .from<WorkoutExecutionSeriesRow>("workout_execution_series")
    .delete()
    .eq("execution_id", executionId)
    .eq("series_id", seriesId);
  if (error) throw error;
}

// Standalones p/ hooks (criam o próprio client, singleton por aba).
export async function findOpenExecutionByWorkoutStandalone(
  workoutId: string,
): Promise<WorkoutExecution | null> {
  return findOpenExecutionByWorkout(createBrowserDatabaseClient(), workoutId);
}

export async function startExecutionStandalone(
  workoutId: string,
  programId: string,
  email: string,
): Promise<WorkoutExecution> {
  return startExecution(createBrowserDatabaseClient(), workoutId, programId, email);
}

export async function finishExecutionStandalone(
  executionId: string,
): Promise<WorkoutExecution> {
  return finishExecution(createBrowserDatabaseClient(), executionId);
}

export async function clearExecutionStandalone(
  executionId: string,
): Promise<void> {
  return clearExecution(createBrowserDatabaseClient(), executionId);
}

export async function findLastSealedExecutionByProgramStandalone(
  programId: string,
): Promise<WorkoutExecution | null> {
  return findLastSealedExecutionByProgram(
    createBrowserDatabaseClient(),
    programId,
  );
}

export async function findOpenExecutionByProgramStandalone(
  programId: string,
): Promise<WorkoutExecution | null> {
  return findOpenExecutionByProgram(createBrowserDatabaseClient(), programId);
}

export async function listDoneByExecutionStandalone(
  executionId: string,
): Promise<WorkoutExecutionSeries[]> {
  return listDoneByExecution(createBrowserDatabaseClient(), executionId);
}

export async function markSeriesDoneStandalone(
  input: MarkExecutionSeriesInput,
  email: string,
): Promise<WorkoutExecutionSeries> {
  return markSeriesDone(createBrowserDatabaseClient(), input, email);
}

export async function unmarkSeriesStandalone(
  executionId: string,
  seriesId: string,
): Promise<void> {
  return unmarkSeries(createBrowserDatabaseClient(), executionId, seriesId);
}
