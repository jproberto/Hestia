// Acesso a dados do aggregate de treinos via IDatabaseClient (nunca @supabase/*).
// Regras de persistência vivem aqui (unicidade de nome D11, unicidade de
// exercício por Programa D14, guarda D6 de treino com exercícios). UI consome
// via lib/milon/db/workouts.
import type { IDatabaseClient } from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { UpdateSeriesFieldsInput } from "./interfaces";
import {
  MSG_EXERCICIO_JA_NO_PROGRAMA,
  MSG_TREINO_COM_EXERCICIOS,
  normalizarNomeTreino,
  validarNomeTreino,
  validarNomeUnicoNoPrograma,
} from "../workout-utils";
import type {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  Workout,
  WorkoutEntry,
  WorkoutEntryRow,
  WorkoutRow,
  WorkoutSeries,
  WorkoutSeriesRow,
} from "../types";

function toWorkoutDomain(row: WorkoutRow): Workout {
  return {
    id: row.id,
    programId: row.program_id,
    name: row.name,
    createdAt: row.created_at,
    created_by: row.created_by,
  };
}

function toEntryDomain(row: WorkoutEntryRow): WorkoutEntry {
  return {
    id: row.id,
    workoutId: row.workout_id,
    programId: row.program_id,
    exerciseId: row.exercise_id,
    position: row.position,
    restSeconds: row.rest_seconds,
    createdAt: row.created_at,
    created_by: row.created_by,
  };
}

function toSeriesDomain(row: WorkoutSeriesRow): WorkoutSeries {
  return {
    id: row.id,
    entryId: row.entry_id,
    position: row.position,
    reps: row.reps,
    durationSeconds: row.duration_seconds,
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

export async function listWorkoutsByProgram(
  db: IDatabaseClient,
  programId: string,
): Promise<Workout[]> {
  const { data, error } = await db
    .from<WorkoutRow>("workouts")
    .select("*")
    .eq("program_id", programId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return (data || []).map(toWorkoutDomain);
}

export async function findWorkoutById(
  db: IDatabaseClient,
  workoutId: string,
): Promise<Workout | null> {
  const { data, error } = await db
    .from<WorkoutRow>("workouts")
    .select("*")
    .eq("id", workoutId)
    .maybeSingle();

  if (error) throw error;
  return data ? toWorkoutDomain(data) : null;
}

export async function createWorkout(
  db: IDatabaseClient,
  programId: string,
  input: CreateWorkoutInput,
  email: string,
): Promise<Workout> {
  const nome = normalizarNomeTreino(input.name);
  const obrigatorio = validarNomeTreino(nome);
  if (obrigatorio) throw new Error(obrigatorio);

  const existentes = await listWorkoutsByProgram(db, programId);
  const colisao = validarNomeUnicoNoPrograma(
    nome,
    existentes.map((w) => w.name),
  );
  if (colisao) throw new Error(colisao);

  const { data, error } = await db
    .from<WorkoutRow>("workouts")
    .insert({ program_id: programId, name: nome, created_by: email })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Falha ao criar treino: sem retorno do banco.");
  return toWorkoutDomain(data);
}

export async function updateWorkoutName(
  db: IDatabaseClient,
  workoutId: string,
  input: UpdateWorkoutInput,
): Promise<Workout> {
  const nome = normalizarNomeTreino(input.name);
  const obrigatorio = validarNomeTreino(nome);
  if (obrigatorio) throw new Error(obrigatorio);

  const atual = await findWorkoutById(db, workoutId);
  if (!atual) throw new Error("Treino não encontrado.");

  const existentes = await listWorkoutsByProgram(db, atual.programId);
  const colisao = validarNomeUnicoNoPrograma(
    nome,
    existentes.filter((w) => w.id !== workoutId).map((w) => w.name),
  );
  if (colisao) throw new Error(colisao);

  const { data, error } = await db
    .from<WorkoutRow>("workouts")
    .update({ name: nome })
    .eq("id", workoutId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Falha ao renomear treino: sem retorno do banco.");
  return toWorkoutDomain(data);
}

export async function deleteWorkout(
  db: IDatabaseClient,
  workoutId: string,
): Promise<void> {
  const entradas = await listEntriesByWorkout(db, workoutId);
  if (entradas.length > 0) throw new Error(MSG_TREINO_COM_EXERCICIOS);

  const { error } = await db
    .from<WorkoutRow>("workouts")
    .delete()
    .eq("id", workoutId);
  if (error) throw error;
}

export async function hasWorkouts(
  db: IDatabaseClient,
  programId: string,
): Promise<boolean> {
  const { data, error } = await db
    .from<WorkoutRow>("workouts")
    .select("id")
    .eq("program_id", programId);

  if (error) throw error;
  return (data || []).length > 0;
}

export async function hasWorkoutWithExercise(
  db: IDatabaseClient,
  programId: string,
): Promise<boolean> {
  const entradas = await listEntriesByProgram(db, programId);
  return entradas.length > 0;
}

export async function listEntriesByWorkout(
  db: IDatabaseClient,
  workoutId: string,
): Promise<WorkoutEntry[]> {
  const { data, error } = await db
    .from<WorkoutEntryRow>("workout_entries")
    .select("*")
    .eq("workout_id", workoutId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data || []).map(toEntryDomain);
}

export async function listEntriesByProgram(
  db: IDatabaseClient,
  programId: string,
): Promise<WorkoutEntry[]> {
  const { data, error } = await db
    .from<WorkoutEntryRow>("workout_entries")
    .select("*")
    .eq("program_id", programId);

  if (error) throw error;
  return (data || []).map(toEntryDomain);
}

export async function addEntry(
  db: IDatabaseClient,
  workoutId: string,
  programId: string,
  exerciseId: string,
  email: string,
): Promise<WorkoutEntry> {
  const doPrograma = await listEntriesByProgram(db, programId);
  if (doPrograma.some((e) => e.exerciseId === exerciseId)) {
    throw new Error(MSG_EXERCICIO_JA_NO_PROGRAMA);
  }

  const doTreino = await listEntriesByWorkout(db, workoutId);
  const position =
    doTreino.reduce((max, e) => Math.max(max, e.position), 0) + 1;

  try {
    const { data, error } = await db
      .from<WorkoutEntryRow>("workout_entries")
      .insert({
        workout_id: workoutId,
        program_id: programId,
        exercise_id: exerciseId,
        position,
        rest_seconds: null,
        created_by: email,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data)
      throw new Error("Falha ao adicionar exercício: sem retorno do banco.");
    return toEntryDomain(data);
  } catch (error) {
    if (isUniqueViolation(error))
      throw new Error(MSG_EXERCICIO_JA_NO_PROGRAMA);
    throw error;
  }
}

export async function removeEntry(
  db: IDatabaseClient,
  entryId: string,
): Promise<void> {
  const { error: seriesError } = await db
    .from<WorkoutSeriesRow>("workout_series")
    .delete()
    .eq("entry_id", entryId);
  if (seriesError) throw seriesError;

  const { error: entryError } = await db
    .from<WorkoutEntryRow>("workout_entries")
    .delete()
    .eq("id", entryId);
  if (entryError) throw entryError;
}

export async function reorderEntries(
  db: IDatabaseClient,
  workoutId: string,
  orderedEntryIds: string[],
): Promise<void> {
  const atuais = await listEntriesByWorkout(db, workoutId);
  const atuaisIds = new Set(atuais.map((e) => e.id));
  const recebidosIds = new Set(orderedEntryIds);
  const conjuntoIgual =
    atuais.length === orderedEntryIds.length &&
    orderedEntryIds.every((id) => atuaisIds.has(id)) &&
    atuais.every((e) => recebidosIds.has(e.id));
  if (!conjuntoIgual) {
    throw new Error(
      "A ordem informada não corresponde aos exercícios do treino.",
    );
  }

  for (let i = 0; i < orderedEntryIds.length; i += 1) {
    const { error } = await db
      .from<WorkoutEntryRow>("workout_entries")
      .update({ position: i + 1 })
      .eq("id", orderedEntryIds[i]);
    if (error) throw error;
  }
}

export async function setEntryRestSeconds(
  db: IDatabaseClient,
  entryId: string,
  seconds: number | null,
): Promise<void> {
  const { error } = await db
    .from<WorkoutEntryRow>("workout_entries")
    .update({ rest_seconds: seconds })
    .eq("id", entryId);
  if (error) throw error;
}

export async function listSeriesByEntry(
  db: IDatabaseClient,
  entryId: string,
): Promise<WorkoutSeries[]> {
  const { data, error } = await db
    .from<WorkoutSeriesRow>("workout_series")
    .select("*")
    .eq("entry_id", entryId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data || []).map(toSeriesDomain);
}

export async function setSeriesQuantity(
  db: IDatabaseClient,
  entryId: string,
  quantity: number,
  email: string,
): Promise<WorkoutSeries[]> {
  const atuais = await listSeriesByEntry(db, entryId);

  if (quantity === atuais.length) return atuais;

  if (quantity < atuais.length) {
    const manter = new Set(
      [...atuais]
        .sort((a, b) => a.position - b.position)
        .slice(0, quantity)
        .map((s) => s.id),
    );
    const remover = atuais.filter((s) => !manter.has(s.id));
    for (const serie of remover) {
      const { error } = await db
        .from<WorkoutSeriesRow>("workout_series")
        .delete()
        .eq("id", serie.id);
      if (error) throw error;
    }
    return await listSeriesByEntry(db, entryId);
  }

  for (let position = atuais.length + 1; position <= quantity; position += 1) {
    const { error } = await db
      .from<WorkoutSeriesRow>("workout_series")
      .insert({
        entry_id: entryId,
        position,
        reps: null,
        duration_seconds: null,
        load: null,
        created_by: email,
      });
    if (error) throw error;
  }
  return await listSeriesByEntry(db, entryId);
}

export async function updateSeriesFields(
  db: IDatabaseClient,
  seriesId: string,
  fields: UpdateSeriesFieldsInput,
): Promise<WorkoutSeries> {
  const payload: Record<string, unknown> = {};
  if ("reps" in fields) payload.reps = fields.reps;
  if ("durationSeconds" in fields)
    payload.duration_seconds = fields.durationSeconds;
  if ("load" in fields) payload.load = fields.load;

  const { data, error } = await db
    .from<WorkoutSeriesRow>("workout_series")
    .update(payload)
    .eq("id", seriesId)
    .select()
    .single();

  if (error) throw error;
  if (!data)
    throw new Error("Falha ao atualizar série: sem retorno do banco.");
  return toSeriesDomain(data);
}

export async function applySeriesToAll(
  db: IDatabaseClient,
  entryId: string,
  originSeriesId: string,
): Promise<WorkoutSeries[]> {
  const series = await listSeriesByEntry(db, entryId);
  const origem = series.find((s) => s.id === originSeriesId);
  if (!origem) throw new Error("Série de origem não encontrada.");

  for (const serie of series) {
    if (serie.id === originSeriesId) continue;
    if (
      serie.reps === origem.reps &&
      serie.durationSeconds === origem.durationSeconds &&
      serie.load === origem.load
    ) {
      continue;
    }
    const { error } = await db
      .from<WorkoutSeriesRow>("workout_series")
      .update({
        reps: origem.reps,
        duration_seconds: origem.durationSeconds,
        load: origem.load,
      })
      .eq("id", serie.id);
    if (error) throw error;
  }
  return await listSeriesByEntry(db, entryId);
}

// Standalones p/ hooks (criam o próprio client, singleton por aba).
export async function listWorkoutsByProgramStandalone(
  programId: string,
): Promise<Workout[]> {
  return listWorkoutsByProgram(createBrowserDatabaseClient(), programId);
}

export async function findWorkoutByIdStandalone(
  workoutId: string,
): Promise<Workout | null> {
  return findWorkoutById(createBrowserDatabaseClient(), workoutId);
}

export async function createWorkoutStandalone(
  programId: string,
  input: CreateWorkoutInput,
  email: string,
): Promise<Workout> {
  return createWorkout(createBrowserDatabaseClient(), programId, input, email);
}

export async function updateWorkoutNameStandalone(
  workoutId: string,
  input: UpdateWorkoutInput,
): Promise<Workout> {
  return updateWorkoutName(createBrowserDatabaseClient(), workoutId, input);
}

export async function deleteWorkoutStandalone(
  workoutId: string,
): Promise<void> {
  return deleteWorkout(createBrowserDatabaseClient(), workoutId);
}

export async function hasWorkoutsStandalone(
  programId: string,
): Promise<boolean> {
  return hasWorkouts(createBrowserDatabaseClient(), programId);
}

export async function hasWorkoutWithExerciseStandalone(
  programId: string,
): Promise<boolean> {
  return hasWorkoutWithExercise(createBrowserDatabaseClient(), programId);
}

export async function listEntriesByWorkoutStandalone(
  workoutId: string,
): Promise<WorkoutEntry[]> {
  return listEntriesByWorkout(createBrowserDatabaseClient(), workoutId);
}

export async function listEntriesByProgramStandalone(
  programId: string,
): Promise<WorkoutEntry[]> {
  return listEntriesByProgram(createBrowserDatabaseClient(), programId);
}

export async function addEntryStandalone(
  workoutId: string,
  programId: string,
  exerciseId: string,
  email: string,
): Promise<WorkoutEntry> {
  return addEntry(
    createBrowserDatabaseClient(),
    workoutId,
    programId,
    exerciseId,
    email,
  );
}

export async function removeEntryStandalone(
  entryId: string,
): Promise<void> {
  return removeEntry(createBrowserDatabaseClient(), entryId);
}

export async function reorderEntriesStandalone(
  workoutId: string,
  orderedEntryIds: string[],
): Promise<void> {
  return reorderEntries(createBrowserDatabaseClient(), workoutId, orderedEntryIds);
}

export async function setEntryRestSecondsStandalone(
  entryId: string,
  seconds: number | null,
): Promise<void> {
  return setEntryRestSeconds(createBrowserDatabaseClient(), entryId, seconds);
}

export async function listSeriesByEntryStandalone(
  entryId: string,
): Promise<WorkoutSeries[]> {
  return listSeriesByEntry(createBrowserDatabaseClient(), entryId);
}

export async function setSeriesQuantityStandalone(
  entryId: string,
  quantity: number,
  email: string,
): Promise<WorkoutSeries[]> {
  return setSeriesQuantity(createBrowserDatabaseClient(), entryId, quantity, email);
}

export async function updateSeriesFieldsStandalone(
  seriesId: string,
  fields: UpdateSeriesFieldsInput,
): Promise<WorkoutSeries> {
  return updateSeriesFields(createBrowserDatabaseClient(), seriesId, fields);
}

export async function applySeriesToAllStandalone(
  entryId: string,
  originSeriesId: string,
): Promise<WorkoutSeries[]> {
  return applySeriesToAll(createBrowserDatabaseClient(), entryId, originSeriesId);
}
