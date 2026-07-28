import { SupabaseClient } from "@supabase/supabase-js";

export interface Account {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export async function getAccounts(supabase: SupabaseClient): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getOrCreateAccount(
  supabase: SupabaseClient,
  name: string,
  email: string
): Promise<string> {
  const normalizedName = name.trim();
  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("name", normalizedName)
    .maybeSingle();

  if (error) throw error;
  if (data) return data.id;

  const { data: newAcc, error: insertError } = await supabase
    .from("accounts")
    .insert({
      name: normalizedName,
      created_by: email,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return newAcc.id;
}
