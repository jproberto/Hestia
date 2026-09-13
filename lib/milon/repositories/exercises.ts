// Acesso a dados da biblioteca de exercícios via IDatabaseClient (nunca @supabase/*).
// Regras de persistência vivem aqui (pré-checagem anti-duplicata). UI consome via lib/milon/db/*.
import type { IDatabaseClient } from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import { isSameExercise } from "../utils";
import type {
  Exercise,
  ExerciseRow,
  CreateExerciseInput,
  UpdateExerciseInput,
} from "../types";

export const EXERCISE_DUPLICATE_MESSAGE =
  "Esse exercício já existe naquele músculo. Localize o item na lista para conferência ou edição.";

function toDomain(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscle: row.muscle,
    videoLink: row.video_link,
    createdAt: row.created_at,
    created_by: row.created_by,
  };
}

async function assertNoDuplicate(
  db: IDatabaseClient,
  name: string,
  muscle: string,
  ignoreId?: string,
): Promise<void> {
  const { data, error } = await db
    .from<ExerciseRow>("exercises")
    .select("id,name,muscle");
  if (error) throw error;
  const candidate = { name: name.trim(), muscle: muscle.trim() };
  const clash = (data || []).some(
    (row) =>
      row.id !== ignoreId &&
      isSameExercise(row, candidate),
  );
  if (clash) throw new Error(EXERCISE_DUPLICATE_MESSAGE);
}

export async function listExercises(db: IDatabaseClient): Promise<Exercise[]> {
  const { data, error } = await db
    .from<ExerciseRow>("exercises")
    .select("*")
    .order("muscle", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map(toDomain);
}

export async function createExercise(
  db: IDatabaseClient,
  input: CreateExerciseInput,
  email: string,
): Promise<Exercise> {
  await assertNoDuplicate(db, input.name, input.muscle);

  const { data, error } = await db
    .from<ExerciseRow>("exercises")
    .insert({
      name: input.name.trim(),
      muscle: input.muscle.trim(),
      video_link: input.videoLink ?? null,
      created_by: email,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Falha ao criar exercício: sem retorno do banco.");
  return toDomain(data);
}

export async function updateExercise(
  db: IDatabaseClient,
  id: string,
  input: UpdateExerciseInput,
): Promise<Exercise> {
  await assertNoDuplicate(db, input.name, input.muscle, id);

  const { data, error } = await db
    .from<ExerciseRow>("exercises")
    .update({
      name: input.name.trim(),
      muscle: input.muscle.trim(),
      video_link: input.videoLink,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Falha ao atualizar exercício: sem retorno do banco.");
  return toDomain(data);
}

export async function deleteExercise(
  db: IDatabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from<ExerciseRow>("exercises").delete().eq("id", id);
  if (error) throw error;
}

// Standalones p/ hooks (criam o próprio client, singleton por aba).
export async function listExercisesStandalone(): Promise<Exercise[]> {
  return listExercises(createBrowserDatabaseClient());
}

export async function createExerciseStandalone(
  input: CreateExerciseInput,
  email: string,
): Promise<Exercise> {
  return createExercise(createBrowserDatabaseClient(), input, email);
}

export async function updateExerciseStandalone(
  id: string,
  input: UpdateExerciseInput,
): Promise<Exercise> {
  return updateExercise(createBrowserDatabaseClient(), id, input);
}

export async function deleteExerciseStandalone(id: string): Promise<void> {
  return deleteExercise(createBrowserDatabaseClient(), id);
}
