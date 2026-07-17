import { SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateCategory } from "./categories";

export interface BudgetRevision {
  id: string;
  year: number;
  start_month: number;
  description: string;
  created_by: string;
}

export interface BudgetItem {
  category_id: string;
  category_name: string;
  category_type: "receita" | "despesa";
  amount: number;
  start_month: number;
}

export async function getBudgetRevision(supabase: SupabaseClient, year: number): Promise<BudgetRevision | null> {
  const { data, error } = await supabase
    .from("budget_revisions")
    .select("*")
    .eq("year", year)
    .eq("start_month", 1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function initBudget(supabase: SupabaseClient, year: number, email: string): Promise<string> {
  const { data, error } = await supabase
    .from("budget_revisions")
    .insert({
      year,
      start_month: 1,
      description: `Orçamento Inicial ${year}`,
      created_by: email
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getBudgets(supabase: SupabaseClient, year: number, month: number): Promise<BudgetItem[]> {
  const { data, error } = await supabase
    .from("budget_items")
    .select(`
      amount,
      category_id,
      categories (name, type),
      budget_revisions!inner (year, start_month)
    `)
    .eq("budget_revisions.year", year)
    .lte("budget_revisions.start_month", month)
    .order("category_id")
    .order("start_month", { referencedTable: "budget_revisions", ascending: false });

  if (error) {
    console.error("getBudgets error:", error);
    throw error;
  }

  const uniqueItems: Record<string, BudgetItem> = {};
  const rows = (data || []) as unknown as Array<{
    amount: string;
    category_id: string;
    categories: { name: string; type: "receita" | "despesa" } | null;
    budget_revisions: { start_month: number } | null;
  }>;
  rows.forEach((row) => {
    const cat = row.categories;
    const rev = row.budget_revisions;
    if (!cat || !rev) return;

    if (!uniqueItems[row.category_id]) {
      uniqueItems[row.category_id] = {
        category_id: row.category_id,
        category_name: cat.name,
        category_type: cat.type,
        amount: parseFloat(row.amount),
        start_month: rev.start_month
      };
    }
  });

  return Object.values(uniqueItems);
}

export async function addOrUpdateBudgetItem(
  supabase: SupabaseClient,
  revisionId: string,
  categoryName: string,
  categoryType: "receita" | "despesa",
  amount: number,
  email: string
): Promise<void> {
  // 1. Resolve ID da categoria (cria inline se não existir) via serviço dedicado
  const categoryId = await getOrCreateCategory(supabase, categoryName, categoryType, email);

  // 2. Upsert no budget_items
  const { error: upsertError } = await supabase
    .from("budget_items")
    .upsert({
      revision_id: revisionId,
      category_id: categoryId,
      amount,
      created_by: email
    }, { onConflict: "revision_id,category_id" });

  if (upsertError) throw upsertError;
}

export async function adjustBudgetItem(
  supabase: SupabaseClient,
  year: number,
  month: number,
  categoryName: string,
  categoryType: "receita" | "despesa",
  amount: number,
  email: string
): Promise<void> {
  // 1. Resolve ID da categoria
  const categoryId = await getOrCreateCategory(supabase, categoryName, categoryType, email);

  // 2. Verificar se a revisão existe para o ano e o mês
  const { data: revision, error: selectError } = await supabase
    .from("budget_revisions")
    .select("id")
    .eq("year", year)
    .eq("start_month", month)
    .maybeSingle();

  if (selectError) throw selectError;

  let revisionId = revision?.id;

  // 3. Criar a revisão se não existir
  if (!revisionId) {
    const { data: newRev, error: insertError } = await supabase
      .from("budget_revisions")
      .insert({
        year,
        start_month: month,
        description: `Ajuste de Orçamento - ${month}/${year}`,
        created_by: email
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    revisionId = newRev.id;
  }

  // 4. Fazer upsert no budget_items
  const { error: upsertError } = await supabase
    .from("budget_items")
    .upsert({
      revision_id: revisionId,
      category_id: categoryId,
      amount,
      created_by: email
    }, { onConflict: "revision_id,category_id" });

  if (upsertError) throw upsertError;
}

