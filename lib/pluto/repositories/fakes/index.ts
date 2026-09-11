import { FakeTransactionRepository } from "./fakeTransactionRepository";
import { FakeCategoryRepository } from "./fakeCategoryRepository";
import { FakeAccountRepository } from "./fakeAccountRepository";
import { FakeBudgetRepository } from "./fakeBudgetRepository";
import { FakeMonthRepository } from "./fakeMonthRepository";
import { FakeChecklistRepository } from "./fakeChecklistRepository";

export {
  FakeTransactionRepository,
  FakeCategoryRepository,
  FakeAccountRepository,
  FakeBudgetRepository,
  FakeMonthRepository,
  FakeChecklistRepository,
};

import type {
  TransactionWithDetails,
  Category,
  Account,
  MonthlyPeriod,
  BudgetAdjustment,
  ChecklistItem,
} from "@/lib/pluto/types";

export function createFakeTransactionRepository(
  initial?: TransactionWithDetails[]
): FakeTransactionRepository {
  return new FakeTransactionRepository(initial);
}

export function createFakeCategoryRepository(
  initial?: Category[]
): FakeCategoryRepository {
  return new FakeCategoryRepository(initial);
}

export function createFakeAccountRepository(
  initial?: Account[]
): FakeAccountRepository {
  return new FakeAccountRepository(initial);
}

export function createFakeBudgetRepository(
  initial?: { adjustments?: BudgetAdjustment[]; categories?: Category[] }
): FakeBudgetRepository {
  return new FakeBudgetRepository(
    initial?.adjustments,
    initial?.categories
  );
}

export function createFakeMonthRepository(
  initial?: MonthlyPeriod[]
): FakeMonthRepository {
  return new FakeMonthRepository(initial);
}

export function createFakeChecklistRepository(
  initial?: { items?: ChecklistItem[]; categories?: Category[] }
): FakeChecklistRepository {
  return new FakeChecklistRepository(initial?.items, initial?.categories);
}

export interface AllFakes {
  transactions: FakeTransactionRepository;
  categories: FakeCategoryRepository;
  accounts: FakeAccountRepository;
  budget: FakeBudgetRepository;
  months: FakeMonthRepository;
  checklist: FakeChecklistRepository;
}

export function createAllFakes(): AllFakes {
  const categories = createFakeCategoryRepository();
  const accounts = createFakeAccountRepository();
  const months = createFakeMonthRepository();
  const transactions = createFakeTransactionRepository();
  const budget = createFakeBudgetRepository();
  const checklist = createFakeChecklistRepository();

  // Wire them together so they share category/account/month data
  // Note: Each fake has its own internal storage, but tests can manually
  // seed them with shared data using seed() methods.

  return {
    transactions,
    categories,
    accounts,
    budget,
    months,
    checklist,
  };
}

// Re-export types for convenience
export type {
  TransactionWithDetails,
  Category,
  Account,
  MonthlyPeriod,
  BudgetAdjustment,
  BudgetItem,
  ChecklistItem,
  ChecklistItemInput,
} from "@/lib/pluto/types";