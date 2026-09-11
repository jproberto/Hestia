/**
 * Binding Supabase dos contracts (item 8): wrappers finos que implementam
 * `I*Repository` delegando às funções reais de `lib/pluto/repositories/*`.
 *
 * Duas adaptações, ambas restritas a este harness (zero mudança em produção):
 * 1. `gate`: os contracts chamam `build()` → `reset()` → `seed()` de forma
 *    síncrona no `beforeEach`, mas reset/seed reais são async — cada método
 *    aguarda a chain antes de delegar (construção síncrona, execução ordenada).
 * 2. `AliasIds`: traduz aliases dos contracts ("cat-1") para UUIDs no input
 *    e remapeia `month_id`/`parent_id` de volta nas saídas com assert literal.
 */
import type { IDatabaseClient } from "@/lib/shared/database";
import type {
  IAccountRepository,
  IBudgetRepository,
  ICategoryRepository,
  IChecklistRepository,
  IMonthRepository,
  ITransactionRepository,
} from "@/lib/pluto/repositories/interfaces";
import type {
  Account,
  Category,
  ChecklistItem,
  ChecklistItemInput,
  MonthlyPeriod,
  TransactionInput,
} from "@/lib/pluto/types";
import * as transactions from "@/lib/pluto/repositories/transactions";
import * as budget from "@/lib/pluto/repositories/budget";
import * as months from "@/lib/pluto/repositories/months";
import * as checklist from "@/lib/pluto/repositories/checklist";
import * as categories from "@/lib/pluto/repositories/categories";
import * as accounts from "@/lib/pluto/repositories/accounts";
import { AliasIds, getRawClient, resetDatabase } from "./supabase";

export type Gate = () => Promise<void>;

/** Chain compartilhada reset → seed por teste (ver módulo acima). */
export function createGate() {
  let chain: Promise<void> = Promise.resolve();
  return {
    gate: (): Promise<void> => chain,
    reset: (): void => {
      chain = resetDatabase();
    },
    seed: (fn: () => Promise<void>): void => {
      chain = chain.then(fn);
    },
  };
}

async function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await getRawClient().from(table).insert(row);
  if (error) {
    throw new Error(`seed ${table} falhou: ${error.message}`);
  }
}

export async function seedCategories(ids: AliasIds, rows: Category[]): Promise<void> {
  for (const c of rows) {
    await insertRow("categories", {
      id: ids.to(c.id),
      name: c.name,
      type: c.type,
      created_at: c.created_at,
      created_by: c.created_by,
    });
  }
}

export async function seedAccounts(ids: AliasIds, rows: Account[]): Promise<void> {
  for (const a of rows) {
    await insertRow("financial_accounts", {
      id: ids.to(a.id),
      name: a.name,
      type: a.type,
      // O contract semeia created_at nulo (tipo permite); o DDL real exige NOT NULL.
      created_at: a.created_at ?? new Date().toISOString(),
      created_by: a.created_by,
    });
  }
}

export async function seedPeriods(ids: AliasIds, rows: MonthlyPeriod[]): Promise<void> {
  for (const p of rows) {
    await insertRow("monthly_periods", {
      id: ids.to(p.id),
      year: p.year,
      month: p.month,
      status: p.status,
      created_at: p.created_at,
      created_by: p.created_by,
    });
  }
}

/**
 * Garante a linha do período antes de escritas com `month_id`: o contract
 * de checklist só semeia categorias (o fake não impõe FK), mas no banco
 * real o mês precisa existir — em produção ele sempre existe (mês aberto).
 * Idempotente via `onConflict: "id"`.
 */
export async function ensurePeriod(ids: AliasIds, monthAlias: string, email: string): Promise<void> {
  const { error } = await getRawClient()
    .from("monthly_periods")
    .upsert(
      {
        id: ids.to(monthAlias),
        year: 2026,
        month: 3,
        status: "aberto",
        created_at: new Date().toISOString(),
        created_by: email,
      },
      { onConflict: "id" }
    );
  if (error) {
    throw new Error(`ensurePeriod falhou: ${error.message}`);
  }
}

export class SupabaseTransactionRepository implements ITransactionRepository {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly ids: AliasIds,
    private readonly gate: Gate = () => Promise.resolve()
  ) {}

  async getTransactionsByMonth(year: number, month: number) {
    await this.gate();
    return transactions.getTransactionsByMonth(this.db, year, month);
  }

  async createTransaction(input: TransactionInput, email: string) {
    await this.gate();
    return transactions.createTransaction(this.db, this.mapInput(input), email);
  }

  async updateTransaction(id: string, input: TransactionInput) {
    await this.gate();
    return transactions.updateTransaction(this.db, id, this.mapInput(input));
  }

  async deleteTransaction(id: string) {
    await this.gate();
    return transactions.deleteTransaction(this.db, id);
  }

  private mapInput(input: TransactionInput): TransactionInput {
    return {
      ...input,
      category_id: this.ids.to(input.category_id),
      account_id: this.ids.to(input.account_id),
    };
  }
}

export class SupabaseBudgetRepository implements IBudgetRepository {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly gate: Gate = () => Promise.resolve()
  ) {}

  async getBudgetAdjustment(year: number) {
    await this.gate();
    return budget.getBudgetAdjustment(this.db, year);
  }

  async initBudget(year: number, email: string) {
    await this.gate();
    return budget.initBudget(this.db, year, email);
  }

  async getBudgets(year: number, month: number) {
    await this.gate();
    return budget.getBudgets(this.db, year, month);
  }

  async addOrUpdateBudgetItem(adjustmentId: string, categoryId: string, amount: number, email: string) {
    await this.gate();
    return budget.addOrUpdateBudgetItem(this.db, adjustmentId, categoryId, amount, email);
  }

  async getBudgetAdjustments(year: number) {
    await this.gate();
    return budget.getBudgetAdjustments(this.db, year);
  }

  async createBudgetAdjustment(year: number, month: number, email: string) {
    await this.gate();
    return budget.createBudgetAdjustment(this.db, year, month, email);
  }

  async adjustBudgetItem(
    year: number,
    month: number,
    categoryName: string,
    categoryType: "receita" | "despesa",
    amount: number,
    email: string
  ) {
    await this.gate();
    return budget.adjustBudgetItem(this.db, year, month, categoryName, categoryType, amount, email);
  }
}

export class SupabaseMonthRepository implements IMonthRepository {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly gate: Gate = () => Promise.resolve()
  ) {}

  async getMonthlyPeriods(year: number) {
    await this.gate();
    return months.getMonthlyPeriods(this.db, year);
  }

  async getAllOpenMonthlyPeriods() {
    await this.gate();
    return months.getAllOpenMonthlyPeriods(this.db);
  }

  async openMonthlyPeriod(year: number, month: number, email: string) {
    await this.gate();
    return months.openMonthlyPeriod(this.db, year, month, email);
  }

  async closeMonthlyPeriod(year: number, month: number, email: string) {
    await this.gate();
    return months.closeMonthlyPeriod(this.db, year, month, email);
  }
}

export class SupabaseCategoryRepository implements ICategoryRepository {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly gate: Gate = () => Promise.resolve()
  ) {}

  async getCategories(type?: "receita" | "despesa") {
    await this.gate();
    return categories.getCategories(this.db, type);
  }

  async getOrCreateCategory(name: string, type: "receita" | "despesa", email: string) {
    await this.gate();
    return categories.getOrCreateCategory(this.db, name, type, email);
  }
}

export class SupabaseAccountRepository implements IAccountRepository {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly gate: Gate = () => Promise.resolve()
  ) {}

  async getAccounts() {
    await this.gate();
    return accounts.getAccounts(this.db);
  }

  async getOrCreateAccount(name: string, email: string, accountType: "conta" | "cartao") {
    await this.gate();
    return accounts.getOrCreateAccount(this.db, name, email, accountType);
  }
}

export class SupabaseChecklistRepository implements IChecklistRepository {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly ids: AliasIds,
    private readonly gate: Gate = () => Promise.resolve()
  ) {}

  async getChecklistItemsByMonth(monthId: string) {
    await this.gate();
    const items = await checklist.getChecklistItemsByMonth(this.db, this.ids.to(monthId));
    return items.map((i) => this.unmapItem(i));
  }

  async getGlobalChecklistItems() {
    await this.gate();
    const items = await checklist.getGlobalChecklistItems(this.db);
    return items.map((i) => this.unmapItem(i));
  }

  async createChecklistItem(input: ChecklistItemInput, isGlobal: boolean, currentMonthId?: string) {
    await this.gate();
    if (currentMonthId) {
      await ensurePeriod(this.ids, currentMonthId, input.created_by);
    }
    const created = await checklist.createChecklistItem(
      this.db,
      this.mapInput(input),
      isGlobal,
      currentMonthId ? this.ids.to(currentMonthId) : undefined
    );
    return this.unmapItem(created);
  }

  async updateChecklistItem(
    id: string,
    input: Partial<ChecklistItemInput>,
    updateGlobal: boolean,
    parentId?: string | null
  ) {
    await this.gate();
    const mapped = { ...input };
    if (mapped.category_id) mapped.category_id = this.ids.to(mapped.category_id);
    return checklist.updateChecklistItem(this.db, id, mapped, updateGlobal, parentId);
  }

  async deleteChecklistItem(id: string, deleteGlobal: boolean, parentId?: string | null) {
    await this.gate();
    return checklist.deleteChecklistItem(this.db, id, deleteGlobal, parentId);
  }

  async toggleChecklistItemCompletion(id: string, isCompleted: boolean) {
    await this.gate();
    return checklist.toggleChecklistItemCompletion(this.db, id, isCompleted);
  }

  async instantiateGlobalChecklistItemsForMonth(monthId: string, email: string) {
    await this.gate();
    await ensurePeriod(this.ids, monthId, email);
    return checklist.instantiateGlobalChecklistItemsForMonth(this.db, this.ids.to(monthId), email);
  }

  private mapInput(input: ChecklistItemInput): ChecklistItemInput {
    return { ...input, category_id: this.ids.to(input.category_id) };
  }

  private unmapItem(item: ChecklistItem): ChecklistItem {
    return {
      ...item,
      month_id: this.ids.from(item.month_id),
      parent_id: this.ids.from(item.parent_id),
    };
  }
}
