import { IChecklistRepository, ChecklistItem, ChecklistItemInput } from "@/lib/pluto/repositories";
import { checkGlobalBudgetOverflow, BudgetOverflowResult } from "@/lib/pluto/checklist-budget";
import { ok, Result } from "./result";

export interface UpdateChecklistItemUseCaseDeps {
  checklistRepo: IChecklistRepository;
}

export interface UpdateChecklistItemInput {
  day?: number;
  description?: string;
  type?: "receita" | "despesa";
  category_id?: string;
  amount?: number | null;
}

export interface UpdateChecklistItemResult {
  success: boolean;
  overflow?: BudgetOverflowResult;
}

export async function updateChecklistItemUseCase(
  deps: UpdateChecklistItemUseCaseDeps,
  id: string,
  input: UpdateChecklistItemInput,
  updateGlobal: boolean,
  parentId: string | null | undefined,
  globalItems: ChecklistItem[],
  budgetItems: { category_id: string; amount: number }[],
  categories: { id: string; type: "receita" | "despesa" }[]
): Promise<Result<UpdateChecklistItemResult>> {
  const { checklistRepo } = deps;

  if (updateGlobal && input.amount !== undefined && input.amount !== null) {
    const originalItem = globalItems.find((item) => item.id === id);
    const targetCategoryId = input.category_id || originalItem?.category_id;
    const targetAmount = input.amount !== undefined ? input.amount : originalItem?.amount;

    if (targetCategoryId && targetAmount !== undefined && targetAmount !== null && originalItem) {
      const category = categories?.find((c) => c.id === targetCategoryId);
      const overflowResult = checkGlobalBudgetOverflow(
        globalItems,
        [],
        targetCategoryId,
        targetAmount,
        id
      );
      if (overflowResult.isOverflow) {
        return ok({
          success: false,
          overflow: { ...overflowResult, categoryType: category?.type || "despesa" },
        });
      }
    }
  }

  await checklistRepo.updateChecklistItem(
    id,
    {
      ...input,
      amount: (input.amount ?? null) as number | null,
    } as Partial<ChecklistItemInput>,
    updateGlobal,
    parentId
  );

  return ok({ success: true });
}