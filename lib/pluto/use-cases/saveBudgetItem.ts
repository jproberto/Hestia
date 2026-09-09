import { IBudgetRepository, ICategoryRepository, BudgetAdjustment } from "@/lib/pluto/repositories";
import { ok, Result } from "./result";

export interface SaveBudgetItemUseCaseDeps {
  budgetRepo: IBudgetRepository;
  categoryRepo: ICategoryRepository;
}

export interface SaveBudgetItemInput {
  categoryName: string;
  categoryType: "receita" | "despesa";
  amount: number;
}

export async function saveBudgetItemUseCase(
  deps: SaveBudgetItemUseCaseDeps,
  year: number,
  startMonth: number,
  input: SaveBudgetItemInput,
  email: string
): Promise<Result<void>> {
  const { budgetRepo, categoryRepo } = deps;

  await categoryRepo.getOrCreateCategory(input.categoryName, input.categoryType, email);

  let adjustment: BudgetAdjustment | null = null;
  const adjustments = await budgetRepo.getBudgetAdjustments(year);
  adjustment = adjustments.find((a) => a.start_month === startMonth) || null;

  if (!adjustment) {
    const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(year, startMonth - 1, 1));
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const adjustmentId = await budgetRepo.createBudgetAdjustment(year, startMonth, email);
    adjustment = {
      id: adjustmentId,
      year,
      start_month: startMonth,
      description: `Ajuste de ${capitalizedMonth}/${year}`,
      created_by: email,
    };
  }

  const categoryId = await categoryRepo.getOrCreateCategory(input.categoryName, input.categoryType, email);
  await budgetRepo.addOrUpdateBudgetItem(adjustment.id, categoryId, input.amount, email);

  return ok(undefined);
}