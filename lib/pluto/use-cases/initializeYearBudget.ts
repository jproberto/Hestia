import { IBudgetRepository, IMonthRepository } from "@/lib/pluto/repositories";
import { ok, err, Result } from "./result";

export interface InitializeYearBudgetUseCaseDeps {
  budgetRepo: IBudgetRepository;
  monthRepo: IMonthRepository;
}

export async function initializeYearBudgetUseCase(
  deps: InitializeYearBudgetUseCaseDeps,
  year: number,
  email: string
): Promise<Result<string>> {
  const { budgetRepo, monthRepo } = deps;

  const periods = await monthRepo.getMonthlyPeriods(year);
  const hasOpenPeriod = periods.some((p) => p.status === "aberto");
  if (!hasOpenPeriod) {
    return err("Não há períodos abertos para este ano.");
  }

  const result = await budgetRepo.initBudget(year, email);
  return ok(result);
}