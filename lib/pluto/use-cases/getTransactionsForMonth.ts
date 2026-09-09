import { ITransactionRepository, TransactionWithDetails } from "@/lib/pluto/repositories";
import { ok, Result } from "./result";

export interface GetTransactionsForMonthUseCaseDeps {
  transactionRepo: ITransactionRepository;
}

export async function getTransactionsForMonthUseCase(
  deps: GetTransactionsForMonthUseCaseDeps,
  year: number,
  month: number
): Promise<Result<TransactionWithDetails[]>> {
  const { transactionRepo } = deps;

  const result = await transactionRepo.getTransactionsByMonth(year, month);
  return ok(result);
}