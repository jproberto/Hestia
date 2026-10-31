/**
 * Harness dos testes de integração (item 8): Supabase real efêmero no CI.
 *
 * Exige `SUPABASE_INTEGRATION_URL` + `SUPABASE_SERVICE_ROLE_KEY`, exportadas
 * pelo job `integration` (`supabase status -o env`). A chave `service_role`
 * bypasta RLS por desenho — estes testes provam lógica/schema, não policies.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { SupabaseDatabaseClient, type SupabaseLikeClient } from "@/lib/shared/supabaseClient";
import type { IDatabaseClient } from "@/lib/shared/database";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável ${name} ausente — rode via CI (job integration) ou exporte apontando para um Supabase local.`
    );
  }
  return value;
}

let rawClient: SupabaseClient | null = null;

/** Client cru (operações de setup como truncate, fora do `IDatabaseClient`). */
export function getRawClient(): SupabaseClient {
  if (!rawClient) {
    rawClient = createClient(
      requiredEnv("SUPABASE_INTEGRATION_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );
  }
  return rawClient;
}

/** Adapter real sobre o banco de integração (mesma porta `IDatabaseClient`). */
export function getIntegrationDb(): IDatabaseClient {
  return new SupabaseDatabaseClient(getRawClient() as unknown as SupabaseLikeClient);
}

// UUID v5 determinístico (RFC 4122): aliases dos contracts ("cat-1",
// "mes-2026-03") viram UUIDs válidos e estáveis entre runs — o DDL real
// exige UUID em todas as PKs/FKs.
const UUID_NAMESPACE = "8f2c3a1e-5b4d-4c6a-9e7f-0a1b2c3d4e5f";

export function toUuid(alias: string): string {
  const ns = Buffer.from(UUID_NAMESPACE.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(alias, "utf8").digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Registro bidirecional alias ↔ UUID (remapeia saídas nos asserts literais). */
export class AliasIds {
  private readonly backward = new Map<string, string>();

  to(alias: string): string {
    const uuid = toUuid(alias);
    this.backward.set(uuid, alias);
    return uuid;
  }

  from(uuid: string | null | undefined): string | null | undefined {
    if (uuid == null) return uuid;
    return this.backward.get(uuid) ?? uuid;
  }

  clear(): void {
    this.backward.clear();
  }
}

const IMPOSSIBLE_ID = "00000000-0000-0000-0000-000000000000";

// Filhos antes dos pais (FKs). `budget_items` não tem coluna `id`
// (usa `adjustment_id` no filtro).
const TABLES: Array<[table: string, idColumn: string]> = [
  ["checklist_items", "id"],
  ["transactions", "id"],
  ["budget_items", "adjustment_id"],
  ["budget_adjustments", "id"],
  ["monthly_periods", "id"],
  ["categories", "id"],
  ["financial_accounts", "id"],
];

export async function resetDatabase(): Promise<void> {
  const client = getRawClient();
  for (const [table, idColumn] of TABLES) {
    const { error } = await client.from(table).delete().neq(idColumn, IMPOSSIBLE_ID);
    if (error) {
      throw new Error(`resetDatabase falhou em ${table}: ${error.message}`);
    }
  }
}
