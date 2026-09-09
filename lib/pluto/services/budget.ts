import {
  IBudgetRepository,
  ICategoryRepository,
  IMonthRepository,
  BudgetAdjustment,
  BudgetItem,
  Category,
} from "@/lib/pluto/repositories";
import {
  initBudgetParamsSchema,
  createMonthAdjustmentParamsSchema,
  getBudgetSummaryParamsSchema,
  getAllAdjustmentsParamsSchema,
  saveBudgetItemParamsSchema,
  updateBudgetItemParamsSchema,
  type CreateBudgetItemInput,
  budgetSummarySchema,
  getCategoriesParamsSchema,
} from "@/lib/pluto/schemas";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import {
  initializeYearBudgetUseCase,
  InitializeYearBudgetUseCaseDeps,
  createMonthAdjustmentUseCase,
  CreateMonthAdjustmentUseCaseDeps,
  getBudgetSummaryUseCase,
  GetBudgetSummaryUseCaseDeps,
  saveBudgetItemUseCase,
  SaveBudgetItemUseCaseDeps,
  updateBudgetItemAmountUseCase,
  UpdateBudgetItemAmountUseCaseDeps,
} from "@/lib/pluto/use-cases";

export function createBudgetService(
  budgetRepo: IBudgetRepository,
  categoryRepo: ICategoryRepository,
  monthRepo: IMonthRepository
) {
  const initDeps: InitializeYearBudgetUseCaseDeps = { budgetRepo, monthRepo };
  const createAdjDeps: CreateMonthAdjustmentUseCaseDeps = { budgetRepo, monthRepo };
  const getSummaryDeps: GetBudgetSummaryUseCaseDeps = { budgetRepo, categoryRepo };
  const saveItemDeps: SaveBudgetItemUseCaseDeps = { budgetRepo, categoryRepo };
  const updateAmountDeps: UpdateBudgetItemAmountUseCaseDeps = { budgetRepo };

  return {
    async initializeYearBudget(year: number, email: string): Promise<string> {
      initBudgetParamsSchema.parse({ year, email });
      const result = await initializeYearBudgetUseCase(initDeps, year, email);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    async createMonthAdjustment(year: number, month: number, email: string): Promise<string> {
      createMonthAdjustmentParamsSchema.parse({ year, month, email });
      const result = await createMonthAdjustmentUseCase(createAdjDeps, year, month, email);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    async getBudgetSummary(year: number, startMonth: number): Promise<{ budgets: BudgetItem[]; categories: Category[] }> {
      const params = getBudgetSummaryParamsSchema.parse({ year, startMonth });
      const result = await getBudgetSummaryUseCase(getSummaryDeps, params.year, params.startMonth);
      if (!result.success) throw new Error(result.error);
      return budgetSummarySchema.parse(result.data);
    },

    async getAllAdjustmentsForYear(year: number): Promise<BudgetAdjustment[]> {
      getAllAdjustmentsParamsSchema.parse({ year });
      return budgetRepo.getBudgetAdjustments(year);
    },

    async getInitialBudgetRevision(year: number): Promise<BudgetAdjustment | null> {
      getAllAdjustmentsParamsSchema.parse({ year });
      return budgetRepo.getBudgetAdjustment(year);
    },

    async saveBudgetItem(
      year: number,
      startMonth: number,
      data: CreateBudgetItemInput,
      email: string
    ): Promise<void> {
      saveBudgetItemParamsSchema.parse({ year, startMonth, data, email });
      const result = await saveBudgetItemUseCase(saveItemDeps, year, startMonth, {
        categoryName: data.categoryName,
        categoryType: data.categoryType,
        amount: data.amount,
      }, email);
      if (!result.success) throw new Error(result.error);
    },

    async updateBudgetItemAmount(
      year: number,
      startMonth: number,
      categoryName: string,
      categoryType: "receita" | "despesa",
      amount: number,
      email: string
    ): Promise<void> {
      updateBudgetItemParamsSchema.parse({ year, startMonth, categoryName, categoryType, amount, email });
      const result = await updateBudgetItemAmountUseCase(updateAmountDeps, year, startMonth, categoryName, categoryType, amount, email);
      if (!result.success) throw new Error(result.error);
    },

    async getBudgetItemsWithCategories(year: number, startMonth: number): Promise<BudgetItem[]> {
      getBudgetSummaryParamsSchema.parse({ year, startMonth });
      return budgetRepo.getBudgets(year, startMonth);
    },

    async getCategoriesForType(type?: "receita" | "despesa"): Promise<Category[]> {
      getCategoriesParamsSchema.parse({ type });
      return categoryRepo.getCategories(type);
    },
  };
}

export type BudgetService = ReturnType<typeof createBudgetService>;

// Standalone functions for hooks and pages
export async function getBudgetAdjustment(year: number): Promise<BudgetAdjustment | null> {
  const supabase = createBrowserDatabaseClient();
  const { getBudgetAdjustment: repo } = await import("@/lib/pluto/repositories/budget");
  return repo(supabase, year);
}

export async function getBudgetAdjustments(year: number): Promise<BudgetAdjustment[]> {
  const supabase = createBrowserDatabaseClient();
  const { getBudgetAdjustments: repo } = await import("@/lib/pluto/repositories/budget");
  return repo(supabase, year);
}

export async function getBudgetItemsWithCategories(year: number, startMonth: number): Promise<BudgetItem[]> {
  const supabase = createBrowserDatabaseClient();
  const { getBudgets: repo } = await import("@/lib/pluto/repositories/budget");
  return repo(supabase, year, startMonth);
}

export async function getCategoriesForType(type?: "receita" | "despesa"): Promise<Category[]> {
  const supabase = createBrowserDatabaseClient();
  const { getCategories: repo } = await import("@/lib/pluto/repositories/categories");
  return repo(supabase, type);
}

export async function adjustBudgetItem(
  year: number,
  month: number,
  categoryName: string,
  categoryType: "receita" | "despesa",
  amount: number,
  email: string
): Promise<void> {
  const supabase = createBrowserDatabaseClient();
  const { adjustBudgetItem: repo } = await import("@/lib/pluto/repositories/budget");
  return repo(supabase, year, month, categoryName, categoryType, amount, email);
}