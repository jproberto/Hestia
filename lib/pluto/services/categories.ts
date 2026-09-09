import { ICategoryRepository, Category } from "@/lib/pluto/repositories";
import { getCategoriesParamsSchema } from "@/lib/pluto/schemas";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";

export function createCategoryService(categoryRepo: ICategoryRepository) {
  return {
    async getAllCategories(type?: "receita" | "despesa"): Promise<Category[]> {
      const params = getCategoriesParamsSchema.parse({ type });
      return categoryRepo.getCategories(params.type);
    },
  };
}

export type CategoryService = ReturnType<typeof createCategoryService>;

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