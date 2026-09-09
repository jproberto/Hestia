import { IBudgetRepository } from "@/lib/pluto/repositories";
import { ok, Result } from "./result";

export interface UpdateBudgetItemAmountUseCaseDeps {
  budgetRepo: IBudgetRepository;
}

export async function updateBudgetItemAmountUseCase(
  deps: UpdateBudgetItemAmountUseCaseDeps,
  year: number,
  startMonth: number,
  categoryName: string,
  categoryType: "receita" | "despesa",
  amount: number,
  email: string
): Promise<Result<void>> {
  const { budgetRepo } = deps;

  await budgetRepo.adjustBudgetItem(year, startMonth, categoryName, categoryType, amount, email);
  return ok(undefined);
}