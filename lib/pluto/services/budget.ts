import {
  BudgetAdjustment,
  BudgetItem,
  Category,
} from "@/lib/pluto/repositories";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";

// Standalone functions for hooks and pages
export async function getBudgetAdjustment(year: number): Promise<BudgetAdjustment | null> {
  const supabase = createBrowserDatabaseClient();
  const { getBudgetAdjustment: repo } = await import("@/lib/pluto/repositories/budget");
  return repo(supabase, year);
}

export async function getBudgetAdjustments(year: number): Promise<BudgetAdjustment[]> {
  const supabase = createBrowserDatabaseClient();
  const { getBudgetAdjustments: repo } = await import("@/lib/pluto/repositories/budget");
  return repo(supabase, year);
}

export async function getBudgetItemsWithCategories(year: number, startMonth: number): Promise<BudgetItem[]> {
  const supabase = createBrowserDatabaseClient();
  const { getBudgets: repo } = await import("@/lib/pluto/repositories/budget");
  return repo(supabase, year, startMonth);
}

export async function getCategoriesForType(type?: "receita" | "despesa"): Promise<Category[]> {
  const supabase = createBrowserDatabaseClient();
  const { getCategories: repo } = await import("@/lib/pluto/repositories/categories");
  return repo(supabase, type);
}

export async function adjustBudgetItem(
  year: number,
  month: number,
  categoryName: string,
  categoryType: "receita" | "despesa",
  amount: number,
  email: string
): Promise<void> {
  const supabase = createBrowserDatabaseClient();
  const { adjustBudgetItem: repo } = await import("@/lib/pluto/repositories/budget");
  return repo(supabase, year, month, categoryName, categoryType, amount, email);
}