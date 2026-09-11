/**
 * Contracts de accounts contra Supabase real (item 8).
 * Roda só no CI (`npm run test:integration`) — fora da suite unitária.
 */
import { beforeAll, beforeEach } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import { defineAccountRepositoryContract } from "../lib/pluto/repositories/contract-accounts.test";
import { getIntegrationDb } from "./supabase";
import { SupabaseAccountRepository, createGate } from "./repositories";

let db: IDatabaseClient;

beforeAll(() => {
  db = getIntegrationDb();
});

beforeEach(() => {});

defineAccountRepositoryContract("Supabase (integration)", () => {
  const { gate, reset } = createGate();
  return { repo: new SupabaseAccountRepository(db, gate), reset };
});
