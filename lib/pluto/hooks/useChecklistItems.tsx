"use client";

import { useMemo } from "react";
import { ChecklistItem, BudgetItem, BudgetOverflowResult, ItemUrgency } from "@/lib/pluto/types";
import { checkMonthBudgetOverflow } from "@/lib/pluto/checklist-budget";
import { getUrgencyBadgeConfig } from "@/lib/shared/utils";
import { CheckCircle2, Clock, AlertTriangle, AlertCircle } from "lucide-react";

export interface CategoryTotal {
  total: number;
  categoryName: string;
}

export interface UseChecklistItemsReturn {
  sortedItems: ChecklistItem[];
  categoryTotals: Map<string, CategoryTotal>;
  overflowCategories: BudgetOverflowResult[];
  renderUrgencyBadge: (item: ChecklistItem, urgency: ItemUrgency) => React.ReactElement;
  getRowBg: (urgency: ItemUrgency) => string;
}

export function useChecklistItems(
  items: ChecklistItem[],
  budgetItems: BudgetItem[]
): UseChecklistItemsReturn {
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.day - b.day), [items]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, CategoryTotal>();
    sortedItems.forEach((item) => {
      const catId = item.category_id;
      const catName = item.category_name ?? "Sem categoria";
      const amount = item.amount ?? 0;
      const existing = totals.get(catId) || { total: 0, categoryName: catName };
      existing.total += amount;
      totals.set(catId, existing);
    });
    return totals;
  }, [sortedItems]);

  const overflowCategories = useMemo(() => {
    const overflows: BudgetOverflowResult[] = [];
    categoryTotals.forEach((_data, catId) => {
      const result = checkMonthBudgetOverflow(sortedItems, budgetItems, catId);
      if (result.isOverflow) {
        overflows.push(result);
      }
    });
    return overflows;
  }, [sortedItems, budgetItems, categoryTotals]);

  const renderUrgencyBadge = useMemo(() => {
    // eslint-disable-next-line react/display-name
    return (item: ChecklistItem, urgency: ItemUrgency) => {
      const config = getUrgencyBadgeConfig(urgency, item.day);

      const iconMap = {
        completed: <CheckCircle2 className="w-3.5 h-3.5" />,
        overdue: <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
        warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
        ondue: <Clock className="w-3.5 h-3.5" />,
      };

      return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.badgeBg}`}>
          {iconMap[config.statusIcon as keyof typeof iconMap]}
          {config.statusLabel}
        </span>
      );
    };
  }, []);

  const getRowBg = useMemo(() => {
    return (urgency: ItemUrgency) => {
      if (urgency === "completed") return "opacity-60 bg-muted/30";
      return "";
    };
  }, []);

  return {
    sortedItems,
    categoryTotals,
    overflowCategories,
    renderUrgencyBadge,
    getRowBg,
  };
}

useChecklistItems.displayName = "useChecklistItems";