import { IBudgetRepository, IMonthRepository } from "@/lib/pluto/repositories";
import { ok, err, Result } from "./result";

export interface CreateMonthAdjustmentUseCaseDeps {
  budgetRepo: IBudgetRepository;
  monthRepo: IMonthRepository;
}

export async function createMonthAdjustmentUseCase(
  deps: CreateMonthAdjustmentUseCaseDeps,
  year: number,
  month: number,
  email: string
): Promise<Result<string>> {
  const { budgetRepo, monthRepo } = deps;

  const periods = await monthRepo.getMonthlyPeriods(year);
  const currentPeriod = periods.find((p) => p.month === month);
  if (!currentPeriod || currentPeriod.status !== "aberto") {
    return err("Período não está aberto para ajuste.");
  }

  const result = await budgetRepo.createBudgetAdjustment(year, month, email);
  return ok(result);
}