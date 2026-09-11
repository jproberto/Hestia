/**
 * Contracts de months contra Supabase real (item 8).
 * Roda só no CI (`npm run test:integration`) — fora da suite unitária.
 */
import { beforeAll, beforeEach } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import { defineMonthRepositoryContract } from "../lib/pluto/repositories/contract-months.test";
import { getIntegrationDb } from "./supabase";
import { SupabaseMonthRepository, createGate } from "./repositories";

let db: IDatabaseClient;

beforeAll(() => {
  db = getIntegrationDb();
});

beforeEach(() => {});

defineMonthRepositoryContract("Supabase (integration)", () => {
  const { gate, reset } = createGate();
  return { repo: new SupabaseMonthRepository(db, gate), reset };
});
