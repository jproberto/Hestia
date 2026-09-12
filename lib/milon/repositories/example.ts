// Acesso a dados do módulo Mílon via IDatabaseClient (nunca @supabase/*).
// Regras de persistência vivem aqui. UI consome via lib/milon/db/*.
import type { IDatabaseClient } from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { MilonItem, MilonItemRow, CreateMilonInput } from "../types";

export async function listExamples(db: IDatabaseClient): Promise<MilonItem[]> {
  const { data, error } = await db
    .from<MilonItemRow>("milon_items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({ id: row.id, name: row.name, created_at: row.created_at }));
}

export async function createExample(db: IDatabaseClient, input: CreateMilonInput): Promise<MilonItem> {
  const { data, error } = await db
    .from<MilonItemRow>("milon_items")
    .insert({ name: input.name.trim() })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Falha ao criar item: sem retorno do banco.");
  return { id: data.id, name: data.name, created_at: data.created_at };
}

// Standalones p/ hooks (criam o próprio client, singleton por aba).
export async function listExamplesStandalone(): Promise<MilonItem[]> {
  return listExamples(createBrowserDatabaseClient());
}

export async function createExampleStandalone(input: CreateMilonInput): Promise<MilonItem> {
  return createExample(createBrowserDatabaseClient(), input);
}
