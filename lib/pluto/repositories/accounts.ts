import { IDatabaseClient } from "@/lib/shared/database";
import type { Account, AccountRow } from "../types";

export type { Account, AccountRow };

export async function getAccounts(db: IDatabaseClient): Promise<Account[]> {
  const { data, error } = await db
    .from<AccountRow>("financial_accounts")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map((a) => ({
    ...a,
    type: (a.type as "conta" | "cartao") || "conta",
  }));
}

export async function getOrCreateAccount(
  db: IDatabaseClient,
  name: string,
  email: string,
  accountType: "conta" | "cartao" = "conta"
): Promise<string> {
  const normalizedName = name.trim();

  // Tenta buscar na tabela financial_accounts
  const { data, error } = await db
    .from<AccountRow>("financial_accounts")
    .select("id")
    .eq("name", normalizedName)
    .maybeSingle();

  if (!error && data) return data.id;

  const { data: newAcc, error: insertError } = await db
    .from<AccountRow>("financial_accounts")
    .insert({
      name: normalizedName,
      type: accountType,
      created_by: email,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  if (!newAcc) throw new Error("Falha ao criar conta.");
  return newAcc.id;
}
