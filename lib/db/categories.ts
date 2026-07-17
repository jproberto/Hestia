import { SupabaseClient } from "@supabase/supabase-js";

export interface Category {
  id: string;
  name: string;
  type: "receita" | "despesa";
  created_at: string;
  created_by: string;
}

export async function getCategories(supabase: SupabaseClient, type?: "receita" | "despesa"): Promise<Category[]> {
  let query = supabase.from("categories").select("*");
  if (type) {
    query = query.eq("type", type);
  }
  const { data, error } = await query.order("name");
  if (error) throw error;
  return data || [];
}

export async function getOrCreateCategory(
  supabase: SupabaseClient,
  name: string,
  type: "receita" | "despesa",
  email: string
): Promise<string> {
  const normalizedName = name.trim();
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("name", normalizedName)
    .maybeSingle();

  if (error) throw error;
  if (data) return data.id;

  const { data: newCat, error: insertError } = await supabase
    .from("categories")
    .insert({
      name: normalizedName,
      type,
      created_by: email
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return newCat.id;
}
