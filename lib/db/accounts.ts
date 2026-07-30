import { SupabaseClient } from "@supabase/supabase-js";

export interface Account {
  id: string;
  name: string;
  type: "conta" | "cartao";
  created_at?: string;
  created_by?: string;
}

export async function getAccounts(supabase: SupabaseClient): Promise<Account[]> {
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map((a) => ({
    ...a,
    type: (a.type as "conta" | "cartao") || "conta",
  }));
}

export async function getOrCreateAccount(
  supabase: SupabaseClient,
  name: string,
  email: string,
  accountType: "conta" | "cartao" = "conta"
): Promise<string> {
  const normalizedName = name.trim();

  // Tenta buscar na tabela financial_accounts
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("id")
    .eq("name", normalizedName)
    .maybeSingle();

  if (!error && data) return data.id;

  const { data: newAcc, error: insertError } = await supabase
    .from("financial_accounts")
    .insert({
      name: normalizedName,
      type: accountType,
      created_by: email,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return newAcc.id;
}
