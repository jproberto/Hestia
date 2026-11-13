import { IDatabaseClient } from "@/lib/shared/database";
import type { Category, CategoryRow } from "../types";
import { normalizeName } from "../utils";

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

/**
 * Varredura das linhas do tipo pedido comparando pelo nome normalizado
 * (R1/R2/DT-2): o IDatabaseClient não expõe filtro funcional, então a
 * identidade (nome normalizado, tipo) é resolvida em memória.
 */
async function findCategoryId(
  db: IDatabaseClient,
  type: "receita" | "despesa",
  normalizedName: string
): Promise<string | null> {
  const rows = await getCategories(db, type);
  const match = rows.find((category) => normalizeName(category.name) === normalizedName);
  return match ? match.id : null;
}

export async function getOrCreateCategory(
  db: IDatabaseClient,
  name: string,
  type: "receita" | "despesa",
  email: string
): Promise<string> {
  const rawName = name.trim();
  const normalizedName = normalizeName(name);

  const existingId = await findCategoryId(db, type, normalizedName);
  if (existingId) return existingId;

  const { data: newCat, error: insertError } = await db
    .from<CategoryRow>("categories")
    .insert({
      name: rawName,
      type,
      created_by: email
    })
    .select("id")
    .single();

  if (insertError) {
    // Corrida entre abas (D12/R4): o insert perdedor relê e devolve a linha
    // já criada, sem erro visível; sem linha na re-leitura, o erro original
    // do insert propaga (DT-3 — falha real não vira sucesso silencioso).
    const racedId = await findCategoryId(db, type, normalizedName);
    if (racedId) return racedId;
    throw insertError;
  }
  if (!newCat) throw new Error("Falha ao criar categoria.");
  return newCat.id;
}
