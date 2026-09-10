import { Account } from "@/lib/pluto/repositories";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";

// Standalone functions for hooks
export async function getAllAccounts(): Promise<Account[]> {
  const supabase = createBrowserDatabaseClient();
  const { getAccounts: repo } = await import("@/lib/pluto/repositories/accounts");
  return repo(supabase);
}

export async function getOrCreateAccountByName(
  name: string,
  email: string,
  type: "conta" | "cartao" = "conta"
): Promise<string> {
  const supabase = createBrowserDatabaseClient();
  const { getOrCreateAccount: repo } = await import("@/lib/pluto/repositories/accounts");
  return repo(supabase, name, email, type);
}