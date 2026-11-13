import { IDatabaseClient } from "@/lib/shared/database";
import type { Account, AccountRow } from "../types";
import { normalizeName } from "../utils";

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

/**
 * Varredura das linhas do tipo pedido comparando pelo nome normalizado
 * (R1/R2/DT-2 — mesmo padrão das categorias): a identidade
 * (nome normalizado, tipo) é resolvida em memória e a leitura falha alto
 * (DT-5 — erro de leitura propaga, sem cair no insert às cegas).
 */
async function findAccountId(
  db: IDatabaseClient,
  type: "conta" | "cartao",
  normalizedName: string
): Promise<string | null> {
  const { data, error } = await db
    .from<AccountRow>("financial_accounts")
    .select("*")
    .eq("type", type);

  if (error) throw error;

  const match = (data || []).find((account) => normalizeName(account.name) === normalizedName);
  return match ? match.id : null;
}

export async function getOrCreateAccount(
  db: IDatabaseClient,
  name: string,
  email: string,
  accountType: "conta" | "cartao" = "conta"
): Promise<string> {
  const rawName = name.trim();
  const normalizedName = normalizeName(name);

  const existingId = await findAccountId(db, accountType, normalizedName);
  if (existingId) return existingId;

  const { data: newAcc, error: insertError } = await db
    .from<AccountRow>("financial_accounts")
    .insert({
      name: rawName,
      type: accountType,
      created_by: email,
    })
    .select("id")
    .single();

  if (insertError) {
    // Corrida entre abas (D12/R4): o insert perdedor relê e devolve a linha
    // já criada, sem erro visível; sem linha na re-leitura, o erro original
    // do insert propaga (DT-3 — falha real não vira sucesso silencioso).
    const racedId = await findAccountId(db, accountType, normalizedName);
    if (racedId) return racedId;
    throw insertError;
  }
  if (!newAcc) throw new Error("Falha ao criar conta.");
  return newAcc.id;
}
