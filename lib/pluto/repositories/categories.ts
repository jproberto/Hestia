import { IDatabaseClient } from "@/lib/shared/database";
import type { Category, CategoryRow } from "../types";

export type { Category } from "../types";

export async function getCategories(db: IDatabaseClient, type?: "receita" | "despesa"): Promise<Category[]> {
  let query = db.from<CategoryRow>("categories").select("*");
  if (type) {
    query = query.eq("type", type);
  }
  const { data, error } = await query.order("name");
  if (error) throw error;
  return data || [];
}

export async function getOrCreateCategory(
  db: IDatabaseClient,
  name: string,
  type: "receita" | "despesa",
  email: string
): Promise<string> {
  const normalizedName = name.trim();
  const { data, error } = await db
    .from<CategoryRow>("categories")
    .select("id")
    .eq("name", normalizedName)
    .maybeSingle();

  if (error) throw error;
  if (data) return data.id;

  const { data: newCat, error: insertError } = await db
    .from<CategoryRow>("categories")
    .insert({
      name: normalizedName,
      type,
      created_by: email
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  if (!newCat) throw new Error("Falha ao criar categoria.");
  return newCat.id;
}
