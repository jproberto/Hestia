import { IDatabaseClient } from "@/lib/shared/database";
import { getOrCreateCategory } from "./categories";
import type { BudgetAdjustment, BudgetAdjustmentRow, BudgetItem, BudgetItemRow } from "../types";

export type { BudgetAdjustment, BudgetAdjustmentRow, BudgetItem, BudgetItemRow, BudgetItemInput } from "../types";

export async function getBudgetAdjustment(db: IDatabaseClient, year: number): Promise<BudgetAdjustment | null> {
  const { data, error } = await db
    .from<BudgetAdjustmentRow>("budget_adjustments")
    .select("*")
    .eq("year", year)
    .eq("start_month", 1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function initBudget(db: IDatabaseClient, year: number, email: string): Promise<string> {
  const { data, error } = await db
    .from<BudgetAdjustmentRow>("budget_adjustments")
    .insert({
      year,
      start_month: 1,
      description: `Orçamento Inicial ${year}`,
      created_by: email
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Falha ao inicializar orçamento.");
  return data.id;
}

export async function getBudgets(db: IDatabaseClient, year: number, month: number): Promise<BudgetItem[]> {
  const { data, error } = await db
    .from<BudgetItemRow>("budget_items")
    .select(`
      amount,
      category_id,
      categories (name, type),
      budget_adjustments!inner (year, start_month)
    `)
    .eq("budget_adjustments.year", year)
    .lte("budget_adjustments.start_month", month)
    .order("category_id");

  if (error) {
    console.error("getBudgets error:", error);
    throw error;
  }

  // Ordena explicitamente por start_month decrescente no JavaScript
  // para que o ajuste mais recente de cada categoria venha antes
  const rows = ((data || []) as unknown as Array<{
    amount: string;
    category_id: string;
    categories: { name: string; type: "receita" | "despesa" } | null;
    budget_adjustments: { start_month: number } | null;
  }>).sort((a, b) => {
    const monthA = a.budget_adjustments?.start_month ?? 0;
    const monthB = b.budget_adjustments?.start_month ?? 0;
    return monthB - monthA;
  });

  const uniqueItems: Record<string, BudgetItem> = {};
  rows.forEach((row) => {
    const cat = row.categories;
    const adj = row.budget_adjustments;
    if (!cat || !adj) return;

    if (!uniqueItems[row.category_id]) {
      uniqueItems[row.category_id] = {
        category_id: row.category_id,
        category_name: cat.name,
        category_type: cat.type,
        amount: parseFloat(row.amount),
        start_month: adj.start_month
      };
    }
  });

  return Object.values(uniqueItems);
}

export async function addOrUpdateBudgetItem(
  db: IDatabaseClient,
  adjustmentId: string,
  categoryId: string,
  amount: number,
  email: string
): Promise<void> {
  const { error: upsertError } = await db
    .from<BudgetItemRow>("budget_items")
    .upsert({
      adjustment_id: adjustmentId,
      category_id: categoryId,
      amount,
      created_by: email
    }, { onConflict: "adjustment_id,category_id" });

  if (upsertError) throw upsertError;
}

export async function getBudgetAdjustments(db: IDatabaseClient, year: number): Promise<BudgetAdjustment[]> {
  const { data, error } = await db
    .from<BudgetAdjustmentRow>("budget_adjustments")
    .select("*")
    .eq("year", year)
    .order("start_month", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createBudgetAdjustment(
  db: IDatabaseClient,
  year: number,
  month: number,
  email: string
): Promise<string> {
  const { data: existing, error: selectError } = await db
    .from<BudgetAdjustmentRow>("budget_adjustments")
    .select("id")
    .eq("year", year)
    .eq("start_month", month)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing?.id) return existing.id;

  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(year, month - 1, 1));
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const { data: newAdj, error: insertError } = await db
    .from<BudgetAdjustmentRow>("budget_adjustments")
    .insert({
      year,
      start_month: month,
      description: `Ajuste de ${capitalizedMonth}/${year}`,
      created_by: email
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  if (!newAdj) throw new Error("Falha ao criar ajuste de orçamento.");
  return newAdj.id;
}

export async function adjustBudgetItem(
  db: IDatabaseClient,
  year: number,
  month: number,
  categoryName: string,
  categoryType: "receita" | "despesa",
  amount: number,
  email: string
): Promise<void> {
  const categoryId = await getOrCreateCategory(db, categoryName, categoryType, email);

  const adjustmentId = await createBudgetAdjustment(db, year, month, email);

  const { error: upsertError } = await db
    .from<BudgetItemRow>("budget_items")
    .upsert({
      adjustment_id: adjustmentId,
      category_id: categoryId,
      amount,
      created_by: email
    }, { onConflict: "adjustment_id,category_id" });

  if (upsertError) throw upsertError;
}
