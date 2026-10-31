/**
 * Contracts de checklist contra Supabase real (item 8).
 * Roda só no CI (`npm run test:integration`) — fora da suite unitária.
 */
import { beforeAll, beforeEach } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { Category } from "@/lib/pluto/types";
import { defineChecklistRepositoryContract } from "../lib/pluto/repositories/contract-checklist.test";
import { AliasIds, getIntegrationDb } from "./supabase";
import { SupabaseChecklistRepository, createGate, seedCategories } from "./repositories";

let db: IDatabaseClient;
let ids: AliasIds;

beforeAll(() => {
  db = getIntegrationDb();
  ids = new AliasIds();
});

beforeEach(() => {
  ids.clear();
});

defineChecklistRepositoryContract("Supabase (integration)", () => {
  const { gate, reset, seed } = createGate();
  const repo = new SupabaseChecklistRepository(db, ids, gate);
  return {
    repo,
    reset,
    seedCategories: (categories: Category[]) => {
      seed(() => seedCategories(ids, categories));
    },
  };
});
