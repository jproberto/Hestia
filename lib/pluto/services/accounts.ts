import { IAccountRepository, Account } from "@/lib/pluto/repositories";
import { getOrCreateAccountParamsSchema } from "@/lib/pluto/schemas";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";

export function createAccountService(accountRepo: IAccountRepository) {
  return {
    async getAllAccounts(): Promise<Account[]> {
      return accountRepo.getAccounts();
    },

    async getOrCreateAccountByName(
      name: string,
      email: string,
      type: "conta" | "cartao" = "conta"
    ): Promise<string> {
      const params = getOrCreateAccountParamsSchema.parse({ name, email, type });
      return accountRepo.getOrCreateAccount(params.name, params.email, params.type);
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;

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