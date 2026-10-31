/**
 * Contracts de transactions contra Supabase real (item 8).
 * Roda só no CI (`npm run test:integration`) — fora da suite unitária.
 */
import { beforeAll, beforeEach } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import {
  defineTransactionRepositoryContract,
  type TransactionContractSeed,
} from "../lib/pluto/repositories/contract-transactions.test";
import { AliasIds, getIntegrationDb } from "./supabase";
import { SupabaseTransactionRepository, createGate, seedAccounts, seedCategories, seedPeriods } from "./repositories";

let db: IDatabaseClient;
let ids: AliasIds;

beforeAll(() => {
  db = getIntegrationDb();
  ids = new AliasIds();
});

beforeEach(() => {
  ids.clear();
});

defineTransactionRepositoryContract("Supabase (integration)", () => {
  const { gate, reset, seed } = createGate();
  const repo = new SupabaseTransactionRepository(db, ids, gate);
  return {
    repo,
    reset,
    seed: (data: TransactionContractSeed) => {
      seed(async () => {
        await seedCategories(ids, data.categories);
        await seedAccounts(ids, data.accounts);
        await seedPeriods(ids, data.monthlyPeriods);
      });
    },
  };
});
