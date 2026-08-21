export interface ChecklistItem {
  id: string;
  category_id: string;
  amount?: number | null;
  month_id?: string | null;
  is_active?: boolean;
}

export interface BudgetItem {
  category_id: string;
  category_name?: string;
  amount: number;
}

export interface BudgetOverflowResult {
  isOverflow: boolean;
  categoryId: string;
  categoryName: string;
  totalChecklist: number;
  budgetAmount: number;
}

export function checkGlobalBudgetOverflow(
  globalItems: ChecklistItem[],
  budgetItems: BudgetItem[],
  targetCategoryId: string,
  targetAmount: number | null | undefined,
  excludeItemId?: string
): BudgetOverflowResult {
  const activeGlobals = globalItems.filter(
    (item) => item.category_id === targetCategoryId && item.month_id === null && item.is_active === true
  );

  const filteredGlobals = excludeItemId
    ? activeGlobals.filter((item) => item.id !== excludeItemId)
    : activeGlobals;

  const currentTotal = filteredGlobals.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalChecklist = currentTotal + (targetAmount || 0);

  const budgetItem = budgetItems.find((b) => b.category_id === targetCategoryId);

  if (!budgetItem) {
    return {
      isOverflow: false,
      categoryId: targetCategoryId,
      categoryName: '',
      totalChecklist,
      budgetAmount: 0,
    };
  }

  return {
    isOverflow: totalChecklist > budgetItem.amount,
    categoryId: targetCategoryId,
    categoryName: budgetItem.category_name || '',
    totalChecklist,
    budgetAmount: budgetItem.amount,
  };
}

export function checkMonthBudgetOverflow(
  monthItems: ChecklistItem[],
  budgetItems: BudgetItem[],
  targetCategoryId: string
): BudgetOverflowResult {
  const catItems = monthItems.filter((item) => item.category_id === targetCategoryId);
  const totalChecklist = catItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  const budgetItem = budgetItems.find((b) => b.category_id === targetCategoryId);

  if (!budgetItem) {
    return {
      isOverflow: false,
      categoryId: targetCategoryId,
      categoryName: '',
      totalChecklist,
      budgetAmount: 0,
    };
  }

  return {
    isOverflow: totalChecklist > budgetItem.amount,
    categoryId: targetCategoryId,
    categoryName: budgetItem.category_name || '',
    totalChecklist,
    budgetAmount: budgetItem.amount,
  };
}
