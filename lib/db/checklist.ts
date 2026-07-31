import { SupabaseClient } from "@supabase/supabase-js";

export interface ChecklistItemInput {
  day: number;
  description: string;
  type: "receita" | "despesa";
  category_id: string;
  amount?: number | null;
  created_by: string;
}

export interface ChecklistItem {
  id: string;
  parent_id?: string | null;
  month_id?: string | null;
  day: number;
  description: string;
  type: "receita" | "despesa";
  category_id: string;
  amount?: number | null;
  is_completed: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string;
  category_name?: string;
}

interface ChecklistRow extends ChecklistItem {
  categories?: { name: string } | null;
}

export async function getChecklistItemsByMonth(
  supabase: SupabaseClient,
  monthId: string
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("checklist_items")
    .select(`
      *,
      categories ( name )
    `)
    .eq("month_id", monthId)
    .order("day", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  return ((data || []) as unknown as ChecklistRow[]).map((item) => ({
    ...item,
    category_name: item.categories?.name ?? "Sem categoria",
  }));
}

export async function getGlobalChecklistItems(
  supabase: SupabaseClient
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("checklist_items")
    .select(`
      *,
      categories ( name )
    `)
    .is("month_id", null)
    .eq("is_active", true)
    .order("day", { ascending: true });

  if (error) throw error;

  return ((data || []) as unknown as ChecklistRow[]).map((item) => ({
    ...item,
    category_name: item.categories?.name ?? "Sem categoria",
  }));
}

export async function createChecklistItem(
  supabase: SupabaseClient,
  input: ChecklistItemInput,
  isGlobal: boolean,
  currentMonthId?: string
): Promise<ChecklistItem> {
  if (isGlobal) {
    const { data: globalData, error: globalErr } = await supabase
      .from("checklist_items")
      .insert({
        month_id: null,
        parent_id: null,
        day: input.day,
        description: input.description,
        type: input.type,
        category_id: input.category_id,
        amount: input.amount ?? null,
        is_completed: false,
        is_active: true,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (globalErr) throw globalErr;

    if (currentMonthId) {
      const { data: monthData, error: monthErr } = await supabase
        .from("checklist_items")
        .insert({
          month_id: currentMonthId,
          parent_id: (globalData as ChecklistItem).id,
          day: input.day,
          description: input.description,
          type: input.type,
          category_id: input.category_id,
          amount: input.amount ?? null,
          is_completed: false,
          is_active: true,
          created_by: input.created_by,
        })
        .select()
        .single();

      if (monthErr) throw monthErr;
      return monthData as ChecklistItem;
    }

    return globalData as ChecklistItem;
  } else {
    const { data, error } = await supabase
      .from("checklist_items")
      .insert({
        month_id: currentMonthId ?? null,
        parent_id: null,
        day: input.day,
        description: input.description,
        type: input.type,
        category_id: input.category_id,
        amount: input.amount ?? null,
        is_completed: false,
        is_active: true,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ChecklistItem;
  }
}

export async function updateChecklistItem(
  supabase: SupabaseClient,
  id: string,
  input: Partial<ChecklistItemInput>,
  updateGlobal: boolean,
  parentId?: string | null
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (input.day !== undefined) updateData.day = input.day;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.category_id !== undefined) updateData.category_id = input.category_id;
  if (input.amount !== undefined) updateData.amount = input.amount;

  const { error } = await supabase
    .from("checklist_items")
    .update(updateData)
    .eq("id", id);

  if (error) throw error;

  if (updateGlobal && parentId) {
    const { error: globalErr } = await supabase
      .from("checklist_items")
      .update(updateData)
      .eq("id", parentId);

    if (globalErr) throw globalErr;
  }
}

export async function deleteChecklistItem(
  supabase: SupabaseClient,
  id: string,
  deleteGlobal: boolean,
  parentId?: string | null
): Promise<void> {
  if (deleteGlobal && parentId) {
    const { error: globalErr } = await supabase
      .from("checklist_items")
      .update({ is_active: false })
      .eq("id", parentId);

    if (globalErr) throw globalErr;
  }

  const { error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function toggleChecklistItemCompletion(
  supabase: SupabaseClient,
  id: string,
  isCompleted: boolean
): Promise<void> {
  const { error } = await supabase
    .from("checklist_items")
    .update({ is_completed: isCompleted })
    .eq("id", id);

  if (error) throw error;
}

export async function instantiateGlobalChecklistItemsForMonth(
  supabase: SupabaseClient,
  monthId: string,
  email: string
): Promise<void> {
  const { data: globals, error: fetchErr } = await supabase
    .from("checklist_items")
    .select("*")
    .is("month_id", null)
    .eq("is_active", true);

  if (fetchErr) throw fetchErr;
  if (!globals || globals.length === 0) return;

  const instances = (globals as ChecklistItem[]).map((item) => ({
    month_id: monthId,
    parent_id: item.id,
    day: item.day,
    description: item.description,
    type: item.type,
    category_id: item.category_id,
    amount: item.amount ?? null,
    is_completed: false,
    is_active: true,
    created_by: email,
  }));

  const { error: insertErr } = await supabase
    .from("checklist_items")
    .insert(instances);

  if (insertErr) throw insertErr;
}
