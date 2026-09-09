import {
  ITransactionRepository,
  IAccountRepository,
  ICategoryRepository,
  IMonthRepository,
  TransactionWithDetails,
} from "@/lib/pluto/repositories";
import { createTransactionDataSchema, computeMonthRangeSchema, type CreateTransactionInput, type ComputeMonthRangeInput, type AvailableYearsMonthsOutput, availableYearsMonthsSchema } from "@/lib/pluto/schemas";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import {
  createTransactionUseCase,
  CreateTransactionUseCaseDeps,
  updateTransactionUseCase,
  UpdateTransactionUseCaseDeps,
  deleteTransactionUseCase,
  DeleteTransactionUseCaseDeps,
  getTransactionsForMonthUseCase,
  GetTransactionsForMonthUseCaseDeps,
} from "@/lib/pluto/use-cases";

export function createTransactionService(
  transactionRepo: ITransactionRepository,
  accountRepo: IAccountRepository,
  categoryRepo: ICategoryRepository,
  monthRepo: IMonthRepository
) {
  const createDeps: CreateTransactionUseCaseDeps = { transactionRepo, accountRepo, categoryRepo, monthRepo };
  const updateDeps: UpdateTransactionUseCaseDeps = { transactionRepo, accountRepo, categoryRepo, monthRepo };
  const deleteDeps: DeleteTransactionUseCaseDeps = { transactionRepo, monthRepo };
  const getDeps: GetTransactionsForMonthUseCaseDeps = { transactionRepo };

  return {
    async createTransactionWithValidation(
      data: CreateTransactionInput,
      email: string
    ): Promise<TransactionWithDetails> {
      const validatedData = createTransactionDataSchema.parse(data);

      const result = await createTransactionUseCase(createDeps, {
        description: validatedData.description,
        amount: validatedData.amount,
        type: validatedData.type,
        is_refund: validatedData.is_refund,
        date: validatedData.date,
        account_name: validatedData.account_name,
        account_type: validatedData.account_type,
        category_name: validatedData.category_name,
      }, email);

      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    async updateTransactionWithValidation(
      id: string,
      data: CreateTransactionInput,
      email: string
    ): Promise<TransactionWithDetails> {
      const validatedData = createTransactionDataSchema.parse(data);

      const result = await updateTransactionUseCase(updateDeps, id, {
        description: validatedData.description,
        amount: validatedData.amount,
        type: validatedData.type,
        is_refund: validatedData.is_refund,
        date: validatedData.date,
        account_name: validatedData.account_name,
        account_type: validatedData.account_type,
        category_name: validatedData.category_name,
      }, email);

      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    async deleteTransactionWithPeriodCheck(id: string): Promise<void> {
      const result = await deleteTransactionUseCase(deleteDeps, id);
      if (!result.success) {
        throw new Error(result.error);
      }
    },

    async getTransactionsForMonth(year: number, month: number): Promise<TransactionWithDetails[]> {
      const result = await getTransactionsForMonthUseCase(getDeps, year, month);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },

    async getAvailableYearsAndMonths(): Promise<AvailableYearsMonthsOutput> {
      const allOpen = await monthRepo.getAllOpenMonthlyPeriods();
      const years = Array.from(new Set(allOpen.map((p) => p.year))).sort((a, b) => a - b);
      const result = { years, openMonths: allOpen };
      return availableYearsMonthsSchema.parse(result);
    },

    computeMonthRange(input: ComputeMonthRangeInput) {
      const validatedInput = computeMonthRangeSchema.parse(input);
      const { year, month } = validatedInput;
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { startDate, endDate };
    },
  };
}

export type TransactionService = ReturnType<typeof createTransactionService>;

// Standalone functions for hooks (create Supabase client internally)
export async function getTransactionsForMonth(year: number, month: number): Promise<TransactionWithDetails[]> {
  const supabase = createBrowserDatabaseClient();
  const { getTransactionsByMonth } = await import("@/lib/pluto/repositories/transactions");
  return getTransactionsByMonth(supabase, year, month);
}

export async function getAvailableYearsAndMonths(): Promise<AvailableYearsMonthsOutput> {
  const supabase = createBrowserDatabaseClient();
  const { getAllOpenMonthlyPeriods } = await import("@/lib/pluto/repositories/months");
  const allOpen = await getAllOpenMonthlyPeriods(supabase);
  const years = Array.from(new Set(allOpen.map((p) => p.year))).sort((a, b) => a - b);
  return { years, openMonths: allOpen };
}

export function computeMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}