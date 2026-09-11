/**
 * Contracts de budget contra Supabase real (item 8).
 * Roda só no CI (`npm run test:integration`) — fora da suite unitária.
 */
import { beforeAll, beforeEach } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import { defineBudgetRepositoryContract } from "../lib/pluto/repositories/contract-budget.test";
import { getIntegrationDb } from "./supabase";
import { SupabaseBudgetRepository, createGate } from "./repositories";

let db: IDatabaseClient;

beforeAll(() => {
  db = getIntegrationDb();
});

beforeEach(() => {});

defineBudgetRepositoryContract("Supabase (integration)", () => {
  const { gate, reset } = createGate();
  return { repo: new SupabaseBudgetRepository(db, gate), reset };
});
