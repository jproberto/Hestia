import {
  ITransactionRepository,
  IAccountRepository,
  ICategoryRepository,
  IMonthRepository,
  TransactionWithDetails,
  TransactionInput,
} from "@/lib/pluto/repositories";
import { ok, err, Result } from "./result";

export interface CreateTransactionUseCaseDeps {
  transactionRepo: ITransactionRepository;
  accountRepo: IAccountRepository;
  categoryRepo: ICategoryRepository;
  monthRepo: IMonthRepository;
}

export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: "receita" | "despesa";
  is_refund: boolean;
  date: string;
  account_name: string;
  account_type: "conta" | "cartao";
  category_name: string;
}

export async function createTransactionUseCase(
  deps: CreateTransactionUseCaseDeps,
  input: CreateTransactionInput,
  email: string
): Promise<Result<TransactionWithDetails>> {
  const { transactionRepo, accountRepo, categoryRepo, monthRepo } = deps;

  const periods = await monthRepo.getMonthlyPeriods(new Date(input.date).getFullYear());
  const currentPeriod = periods.find((p) => p.month === new Date(input.date).getMonth() + 1);
  if (!currentPeriod || currentPeriod.status !== "aberto") {
    return err("Período não está aberto para lançamento.");
  }

  const accountId = await accountRepo.getOrCreateAccount(input.account_name, email, input.account_type);
  const categoryId = await categoryRepo.getOrCreateCategory(input.category_name, input.type, email);

  const transactionInput: TransactionInput = {
    description: input.description.trim(),
    amount: input.amount,
    type: input.type,
    is_refund: input.is_refund,
    date: input.date,
    category_id: categoryId,
    account_id: accountId,
  };

  const result = await transactionRepo.createTransaction(transactionInput, email);
  return ok(result);
}