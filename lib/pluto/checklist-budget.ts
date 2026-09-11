import type { ChecklistItem, BudgetLikeItem, BudgetOverflowResult } from "./types";

export type { BudgetOverflowResult } from "./types";

function getBudgetAmount(budgetItems: BudgetLikeItem[], categoryId: string): number {
  const budgetItem = budgetItems.find((b) => b.category_id === categoryId);
  return budgetItem?.amount ?? 0;
}

function getBudgetName(budgetItems: BudgetLikeItem[], categoryId: string): string {
  const budgetItem = budgetItems.find((b) => b.category_id === categoryId);
  return budgetItem?.category_name ?? "";
}

function sumAmounts(items: ChecklistItem[], categoryId: string, excludeId?: string): number {
  return items
    .filter((item) => item.category_id === categoryId && item.id !== excludeId)
    .reduce((sum, item) => sum + (item.amount || 0), 0);
}

export function checkGlobalBudgetOverflow(
  globalItems: ChecklistItem[],
  budgetItems: BudgetLikeItem[],
  targetCategoryId: string,
  targetAmount: number | null | undefined,
  excludeItemId?: string
): BudgetOverflowResult {
  const activeGlobals = globalItems.filter(
    (item) => item.month_id === null && item.is_active === true
  );

  const currentTotal = sumAmounts(activeGlobals, targetCategoryId, excludeItemId);
  const totalChecklist = currentTotal + (targetAmount || 0);
  const budgetAmount = getBudgetAmount(budgetItems, targetCategoryId);

  return {
    isOverflow: budgetAmount > 0 && totalChecklist > budgetAmount,
    categoryId: targetCategoryId,
    categoryName: getBudgetName(budgetItems, targetCategoryId),
    totalChecklist,
    budgetAmount,
    // Derivado dos itens presentes; só é lido quando isOverflow (há itens da
    // categoria). O fluxo de criação/editar sobrescreve com lookup real em
    // useChecklistOperations antes de exibir o modal.
    categoryType: globalItems.find((item) => item.category_id === targetCategoryId)?.type ?? "despesa",
  };
}

export function checkMonthBudgetOverflow(
  monthItems: ChecklistItem[],
  budgetItems: BudgetLikeItem[],
  targetCategoryId: string
): BudgetOverflowResult {
  const totalChecklist = sumAmounts(monthItems, targetCategoryId);
  const budgetAmount = getBudgetAmount(budgetItems, targetCategoryId);

  return {
    isOverflow: budgetAmount > 0 && totalChecklist > budgetAmount,
    categoryId: targetCategoryId,
    categoryName: getBudgetName(budgetItems, targetCategoryId),
    totalChecklist,
    budgetAmount,
    // Ver comentário em checkGlobalBudgetOverflow sobre o fallback.
    categoryType: monthItems.find((item) => item.category_id === targetCategoryId)?.type ?? "despesa",
  };
}