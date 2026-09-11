import type {
  TransactionInput,
  TransactionWithDetails,
  Category,
  Account,
  BudgetAdjustment,
  BudgetItem,
  MonthlyPeriod,
  ChecklistItemInput,
  ChecklistItem,
} from "../types";

export interface ITransactionRepository {
  getTransactionsByMonth(year: number, month: number): Promise<TransactionWithDetails[]>;
  createTransaction(input: TransactionInput, email: string): Promise<TransactionWithDetails>;
  updateTransaction(id: string, input: TransactionInput): Promise<TransactionWithDetails>;
  deleteTransaction(id: string): Promise<void>;
}

export interface ICategoryRepository {
  getCategories(type?: "receita" | "despesa"): Promise<Category[]>;
  getOrCreateCategory(name: string, type: "receita" | "despesa", email: string): Promise<string>;
}

export interface IAccountRepository {
  getAccounts(): Promise<Account[]>;
  getOrCreateAccount(name: string, email: string, accountType: "conta" | "cartao"): Promise<string>;
}

export interface IBudgetRepository {
  getBudgetAdjustment(year: number): Promise<BudgetAdjustment | null>;
  initBudget(year: number, email: string): Promise<string>;
  getBudgets(year: number, month: number): Promise<BudgetItem[]>;
  addOrUpdateBudgetItem(
    adjustmentId: string,
    categoryId: string,
    amount: number,
    email: string
  ): Promise<void>;
  getBudgetAdjustments(year: number): Promise<BudgetAdjustment[]>;
  createBudgetAdjustment(year: number, month: number, email: string): Promise<string>;
  adjustBudgetItem(
    year: number,
    month: number,
    categoryName: string,
    categoryType: "receita" | "despesa",
    amount: number,
    email: string
  ): Promise<void>;
}

export interface IMonthRepository {
  getMonthlyPeriods(year: number): Promise<MonthlyPeriod[]>;
  getAllOpenMonthlyPeriods(): Promise<MonthlyPeriod[]>;
  openMonthlyPeriod(year: number, month: number, email: string): Promise<void>;
  closeMonthlyPeriod(year: number, month: number, email: string): Promise<void>;
}

export interface IChecklistRepository {
  getChecklistItemsByMonth(monthId: string): Promise<ChecklistItem[]>;
  getGlobalChecklistItems(): Promise<ChecklistItem[]>;
  createChecklistItem(
    input: ChecklistItemInput,
    isGlobal: boolean,
    currentMonthId?: string
  ): Promise<ChecklistItem>;
  updateChecklistItem(
    id: string,
    input: Partial<ChecklistItemInput>,
    updateGlobal: boolean,
    parentId?: string | null
  ): Promise<void>;
  deleteChecklistItem(id: string, deleteGlobal: boolean, parentId?: string | null): Promise<void>;
  toggleChecklistItemCompletion(id: string, isCompleted: boolean): Promise<void>;
  instantiateGlobalChecklistItemsForMonth(monthId: string, email: string): Promise<void>;
}