import { Category } from "@/lib/pluto/repositories";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";

// Standalone functions for hooks
export async function getAllCategories(type?: "receita" | "despesa"): Promise<Category[]> {
  const supabase = createBrowserDatabaseClient();
  const { getCategories: repo } = await import("@/lib/pluto/repositories/categories");
  return repo(supabase, type);
}

export async function getOrCreateCategory(name: string, type: "receita" | "despesa", email: string): Promise<string> {
  const supabase = createBrowserDatabaseClient();
  const { getOrCreateCategory: repo } = await import("@/lib/pluto/repositories/categories");
  return repo(supabase, name, type, email);
}