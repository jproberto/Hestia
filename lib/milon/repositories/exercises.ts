// Acesso a dados da biblioteca de exercícios via IDatabaseClient (nunca @supabase/*).
// Regras de persistência vivem aqui (pré-checagem anti-duplicata). UI consome via lib/milon/db/*.
import type { IDatabaseClient } from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import { isSameExercise } from "../utils";
import type {
  Exercise,
  ExerciseRow,
  CreateExerciseInput,
  ExerciseMode,
  LoadUnit,
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
    loadUnit: (row.load_unit as LoadUnit | null) ?? null,
    // Linha antiga sem a coluna (pré-0013) ou valor nulo: modo ausente com
    // fallback de leitura para repetição nos cards/modais (D27).
    mode: (row.mode as ExerciseMode | null) ?? null,
    deletedAt: row.deleted_at,
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
    .select("id,name,muscle,deleted_at");
  if (error) throw error;
  const candidate = { name: name.trim(), muscle: muscle.trim() };
  const clash = (data || []).some(
    (row) =>
      row.id !== ignoreId &&
      row.deleted_at == null &&
      isSameExercise(row, candidate),
  );
  if (clash) throw new Error(EXERCISE_DUPLICATE_MESSAGE);
}

export async function listExercises(db: IDatabaseClient): Promise<Exercise[]> {
  const { data, error } = await db
    .from<ExerciseRow>("exercises")
    .select("*")
    .is("deleted_at", null)
    .order("muscle", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map(toDomain);
}

export async function listExercisesAll(db: IDatabaseClient): Promise<Exercise[]> {
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
      // Modo/unidade só entram no payload quando informados: sem eles, vale o
      // nulo do banco (linhas antigas) e o payload segue sem as chaves.
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.loadUnit !== undefined ? { load_unit: input.loadUnit } : {}),
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
      // Edição sem modo/unidade preserva os valores atuais (não redefine para
      // nulo nem ressuscita excluído).
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.loadUnit !== undefined ? { load_unit: input.loadUnit } : {}),
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
  const { error } = await db
    .from<ExerciseRow>("exercises")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function setExerciseLoadUnit(
  db: IDatabaseClient,
  id: string,
  unit: LoadUnit,
): Promise<void> {
  const { error } = await db
    .from<ExerciseRow>("exercises")
    .update({ load_unit: unit })
    .eq("id", id);
  if (error) throw error;
}

// Ajuste de modo do exercício (Mílon #5, aditamento 2026-10-09): persiste o
// modo sem mexer em nome/músculo/unidade (mesmo padrão do setExerciseLoadUnit).
export async function setExerciseMode(
  db: IDatabaseClient,
  id: string,
  mode: ExerciseMode,
): Promise<void> {
  const { error } = await db
    .from<ExerciseRow>("exercises")
    .update({ mode })
    .eq("id", id);
  if (error) throw error;
}

// Standalones p/ hooks (criam o próprio client, singleton por aba).
export async function listExercisesStandalone(): Promise<Exercise[]> {
  return listExercises(createBrowserDatabaseClient());
}

export async function listExercisesAllStandalone(): Promise<Exercise[]> {
  return listExercisesAll(createBrowserDatabaseClient());
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

export async function setExerciseLoadUnitStandalone(
  id: string,
  unit: LoadUnit,
): Promise<void> {
  return setExerciseLoadUnit(createBrowserDatabaseClient(), id, unit);
}

export async function setExerciseModeStandalone(
  id: string,
  mode: ExerciseMode,
): Promise<void> {
  return setExerciseMode(createBrowserDatabaseClient(), id, mode);
}
