// Acesso a dados de Programas via IDatabaseClient (nunca @supabase/*).
// Regras de persistência vivem aqui (unicidade do ativo por dono). UI consome via lib/milon/db/*.
import type { IDatabaseClient } from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type {
  Program,
  ProgramRow,
  CreateProgramInput,
  UpdateProgramInput,
} from "../types";

export const PROGRAM_ACTIVE_UNICITY_MESSAGE =
  "já existe um programa ativo para este dono — ative outro para substituir";

function toDomain(row: ProgramRow): Program {
  return {
    id: row.id,
    title: row.title,
    owner: row.owner,
    status: row.status,
    createdAt: row.created_at,
    created_by: row.created_by,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  if (err.code === "23505") return true;
  const haystack = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  return (
    haystack.includes("duplicate") ||
    haystack.includes("unique") ||
    haystack.includes("idx_programs_one_active_per_owner")
  );
}

function throwMapped(error: unknown): never {
  if (isUniqueViolation(error)) throw new Error(PROGRAM_ACTIVE_UNICITY_MESSAGE);
  throw error;
}

export async function listPrograms(db: IDatabaseClient): Promise<Program[]> {
  const { data, error } = await db
    .from<ProgramRow>("programs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(toDomain);
}

export async function findProgramById(
  db: IDatabaseClient,
  id: string,
): Promise<Program | null> {
  const { data, error } = await db
    .from<ProgramRow>("programs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toDomain(data) : null;
}

export async function findActiveProgramByOwner(
  db: IDatabaseClient,
  owner: string,
): Promise<Program | null> {
  const { data, error } = await db
    .from<ProgramRow>("programs")
    .select("*")
    .eq("owner", owner)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) throw error;
  return data ? toDomain(data) : null;
}

export async function createProgram(
  db: IDatabaseClient,
  input: CreateProgramInput,
): Promise<Program> {
  const title = input.title.trim();
  const owner = input.owner.trim();
  const status = input.status ?? "rascunho";
  const sessionEmail = await db.getUserEmail();
  const created_by = sessionEmail ?? owner;

  if (status === "ativo") {
    const { error: deactivateError } = await db
      .from<ProgramRow>("programs")
      .update({ status: "inativo" })
      .eq("owner", owner)
      .eq("status", "ativo");
    if (deactivateError) throw deactivateError;
  }

  const { data, error } = await db
    .from<ProgramRow>("programs")
    .insert({ title, owner, status, created_by })
    .select()
    .single();

  if (error) throwMapped(error);
  if (!data) throw new Error("Falha ao criar programa: sem retorno do banco.");
  return toDomain(data);
}

export async function updateProgram(
  db: IDatabaseClient,
  id: string,
  input: UpdateProgramInput,
): Promise<Program> {
  if (input.status === "ativo") {
    const current = await findProgramById(db, id);
    if (!current) throw new Error("Programa não encontrado.");
    const { error: deactivateError } = await db
      .from<ProgramRow>("programs")
      .update({ status: "inativo" })
      .eq("owner", current.owner)
      .eq("status", "ativo");
    if (deactivateError) throw deactivateError;
  }

  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.status !== undefined) payload.status = input.status;

  const { data, error } = await db
    .from<ProgramRow>("programs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throwMapped(error);
  if (!data) throw new Error("Falha ao atualizar programa: sem retorno do banco.");
  return toDomain(data);
}

export async function deleteProgram(
  db: IDatabaseClient,
  id: string,
): Promise<void> {
  const { error } = await db.from<ProgramRow>("programs").delete().eq("id", id);
  if (error) throw error;
}

// Standalones p/ hooks (criam o próprio client, singleton por aba).
export async function listProgramsStandalone(): Promise<Program[]> {
  return listPrograms(createBrowserDatabaseClient());
}

export async function findProgramByIdStandalone(
  id: string,
): Promise<Program | null> {
  return findProgramById(createBrowserDatabaseClient(), id);
}

export async function findActiveProgramByOwnerStandalone(
  owner: string,
): Promise<Program | null> {
  return findActiveProgramByOwner(createBrowserDatabaseClient(), owner);
}

export async function createProgramStandalone(
  input: CreateProgramInput,
): Promise<Program> {
  return createProgram(createBrowserDatabaseClient(), input);
}

export async function updateProgramStandalone(
  id: string,
  input: UpdateProgramInput,
): Promise<Program> {
  return updateProgram(createBrowserDatabaseClient(), id, input);
}

export async function deleteProgramStandalone(id: string): Promise<void> {
  return deleteProgram(createBrowserDatabaseClient(), id);
}
