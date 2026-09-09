import { IBudgetRepository, ICategoryRepository, BudgetItem, Category } from "@/lib/pluto/repositories";
import { ok, Result } from "./result";

export interface BudgetSummary {
  budgets: BudgetItem[];
  categories: Category[];
}

export interface GetBudgetSummaryUseCaseDeps {
  budgetRepo: IBudgetRepository;
  categoryRepo: ICategoryRepository;
}

export async function getBudgetSummaryUseCase(
  deps: GetBudgetSummaryUseCaseDeps,
  year: number,
  startMonth: number
): Promise<Result<BudgetSummary>> {
  const { budgetRepo, categoryRepo } = deps;

  const [budgets, categories] = await Promise.all([
    budgetRepo.getBudgets(year, startMonth),
    categoryRepo.getCategories(),
  ]);

  return ok({ budgets, categories });
}