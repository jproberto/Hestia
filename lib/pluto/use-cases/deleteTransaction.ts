import { ITransactionRepository, IMonthRepository } from "@/lib/pluto/repositories";
import { ok, err, Result } from "./result";

export interface DeleteTransactionUseCaseDeps {
  transactionRepo: ITransactionRepository;
  monthRepo: IMonthRepository;
}

export async function deleteTransactionUseCase(
  deps: DeleteTransactionUseCaseDeps,
  id: string
): Promise<Result<void>> {
  const { transactionRepo, monthRepo } = deps;

  const periods = await monthRepo.getAllOpenMonthlyPeriods();
  if (periods.length === 0) {
    return err("Nenhum período aberto disponível.");
  }

  await transactionRepo.deleteTransaction(id);
  return ok(undefined);
}