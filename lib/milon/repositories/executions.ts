// Acesso a dados da execução série a série via IDatabaseClient (nunca @supabase/*).
// Regras de persistência vivem aqui (abertura idempotente D11-adaptado,
// unicidade de uma aberta por treino, marcação idempotente). O fim
// (finished_at) nunca é escrito nesta feature (reservado à feature 7).
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

export async function clearExecutionStandalone(
  executionId: string,
): Promise<void> {
  return clearExecution(createBrowserDatabaseClient(), executionId);
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
