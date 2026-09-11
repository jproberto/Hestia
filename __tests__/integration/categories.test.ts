/**
 * Contracts de categories contra Supabase real (item 8).
 * Roda só no CI (`npm run test:integration`) — fora da suite unitária.
 */
import { beforeAll, beforeEach } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import { defineCategoryRepositoryContract } from "../lib/pluto/repositories/contract-categories.test";
import { getIntegrationDb } from "./supabase";
import { SupabaseCategoryRepository, createGate } from "./repositories";

let db: IDatabaseClient;

beforeAll(() => {
  db = getIntegrationDb();
});

beforeEach(() => {});

defineCategoryRepositoryContract("Supabase (integration)", () => {
  const { gate, reset } = createGate();
  return { repo: new SupabaseCategoryRepository(db, gate), reset };
});
