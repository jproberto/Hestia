import {
  ITransactionRepository,
  IAccountRepository,
  ICategoryRepository,
  IMonthRepository,
  TransactionWithDetails,
  TransactionInput,
} from "@/lib/pluto/repositories";
import { ok, err, Result } from "./result";

export interface UpdateTransactionUseCaseDeps {
  transactionRepo: ITransactionRepository;
  accountRepo: IAccountRepository;
  categoryRepo: ICategoryRepository;
  monthRepo: IMonthRepository;
}

export interface UpdateTransactionInput {
  description?: string;
  amount?: number;
  type?: "receita" | "despesa";
  is_refund?: boolean;
  date?: string;
  account_name?: string;
  account_type?: "conta" | "cartao";
  category_name?: string;
}

export async function updateTransactionUseCase(
  deps: UpdateTransactionUseCaseDeps,
  id: string,
  input: UpdateTransactionInput,
  email: string
): Promise<Result<TransactionWithDetails>> {
  const { transactionRepo, accountRepo, categoryRepo, monthRepo } = deps;

  const existingResult = await transactionRepo.getTransactionsByMonth(2024, 1);
  let dateToCheck = input.date;
  if (!dateToCheck && existingResult.length > 0) {
    dateToCheck = existingResult[0].date;
  }

  if (dateToCheck) {
    const periods = await monthRepo.getMonthlyPeriods(new Date(dateToCheck).getFullYear());
    const currentPeriod = periods.find((p) => p.month === new Date(dateToCheck).getMonth() + 1);
    if (!currentPeriod || currentPeriod.status !== "aberto") {
      return err("Período não está aberto para alteração.");
    }
  }

  let accountId: string | undefined;
  let categoryId: string | undefined;

  if (input.account_name && input.account_type) {
    accountId = await accountRepo.getOrCreateAccount(input.account_name, email, input.account_type);
  }

  if (input.category_name && input.type) {
    categoryId = await categoryRepo.getOrCreateCategory(input.category_name, input.type, email);
  }

  const transactionInput: TransactionInput = {
    description: input.description?.trim() ?? "",
    amount: input.amount ?? 0,
    type: input.type ?? "despesa",
    is_refund: input.is_refund ?? false,
    date: input.date ?? "",
    category_id: categoryId ?? "",
    account_id: accountId ?? "",
  };

  const result = await transactionRepo.updateTransaction(id, transactionInput);
  return ok(result);
}