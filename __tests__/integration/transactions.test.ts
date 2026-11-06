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
import { AliasIds, getIntegrationDb, resetDatabase } from "./supabase";
import {
  SupabaseTransactionRepository,
  createGate,
  seedAccounts,
  seedCategories,
  seedPeriods,
  seedTransactions,
} from "./repositories";

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
        // Semântica do fake: seed substitui o estado (reset antes de plantar) —
        // contracts podem chamar seed mais de uma vez no mesmo teste.
        await resetDatabase();
        await seedCategories(ids, data.categories);
        await seedAccounts(ids, data.accounts);
        await seedPeriods(ids, data.monthlyPeriods);
        // Plantio direto (T2): lançamentos de mês de cálculo encerrado não
        // passam pela trava do create — FKs exigem categorias/contas acima.
        if (data.transactions?.length) {
          await seedTransactions(ids, data.transactions);
        }
      });
    },
  };
});
