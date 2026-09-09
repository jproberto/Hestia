import { IChecklistRepository, ChecklistItem } from "@/lib/pluto/repositories";
import type { BudgetLikeItem } from "@/lib/pluto/types";
import { checkGlobalBudgetOverflow, BudgetOverflowResult } from "@/lib/pluto/checklist-budget";
import { ok, Result } from "./result";

export interface CreateChecklistItemUseCaseDeps {
  checklistRepo: IChecklistRepository;
}

export interface CreateChecklistItemInput {
  day: number;
  description: string;
  type: "receita" | "despesa";
  category_id: string;
  amount: number | null;
  created_by: string;
  isGlobal: boolean;
  currentMonthId?: string | null;
}

export interface CreateChecklistItemResult {
  success: boolean;
  overflow?: BudgetOverflowResult;
}

export async function createChecklistItemUseCase(
  deps: CreateChecklistItemUseCaseDeps,
  input: CreateChecklistItemInput,
  globalItems: ChecklistItem[],
  budgetItems: BudgetLikeItem[],
  categories: { id: string; type: "receita" | "despesa" }[]
): Promise<Result<CreateChecklistItemResult>> {
  const { checklistRepo } = deps;

  if (input.isGlobal && input.amount !== null && input.amount !== undefined) {
    const category = categories.find((c) => c.id === input.category_id);
    const overflowResult = checkGlobalBudgetOverflow(
      globalItems,
      budgetItems,
      input.category_id,
      input.amount
    );
    if (overflowResult.isOverflow) {
      return ok({
        success: false,
        overflow: { ...overflowResult, categoryType: category?.type || "despesa" },
      });
    }
  }

  await checklistRepo.createChecklistItem(
    {
      day: input.day,
      description: input.description,
      type: input.type,
      category_id: input.category_id,
      amount: (input.amount ?? null) as number | null,
      created_by: input.created_by,
    },
    input.isGlobal,
    input.isGlobal ? undefined : (input.currentMonthId ?? undefined)
  );

  return ok({ success: true });
}