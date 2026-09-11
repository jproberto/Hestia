"use client";

import { useState } from "react";
import type { IDatabaseClient } from "@/lib/shared/database";
import {
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItemCompletion,
} from "@/lib/pluto/db/checklist";
import { adjustBudgetItem } from "@/lib/pluto/db/budget";
import { checkGlobalBudgetOverflow } from "@/lib/pluto/checklist-budget";
import type {
  BudgetItem,
  Category,
  ChecklistItem,
  ChecklistItemInput,
  ChecklistOverflowState,
  MonthlyPeriod,
} from "@/lib/pluto/types";
import { parseErrorMessage } from "@/lib/utils";

export interface ChecklistOperationsDeps {
  db: IDatabaseClient;
  selectedYear: number;
  selectedMonth: number;
  openMonths: MonthlyPeriod[];
  userEmail: string;
  categories: Category[];
  budgetItems: BudgetItem[];
  checklistItems: ChecklistItem[];
  globalChecklistItems: ChecklistItem[];
  setChecklistItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>;
  setErrorMsg: (msg: string | null) => void;
  fetchData: () => Promise<void>;
}

export interface ChecklistOperations {
  isOverflowModalOpen: boolean;
  overflowData: ChecklistOverflowState | null;
  handleToggleChecklistItem: (id: string, isCompleted: boolean) => Promise<void>;
  handleAddChecklistItem: (input: ChecklistItemInput, isGlobal: boolean) => Promise<void>;
  handleEditChecklistItem: (
    id: string,
    input: Partial<ChecklistItemInput>,
    updateGlobal: boolean,
    parentId?: string | null
  ) => Promise<void>;
  handleDeleteChecklistItem: (id: string, deleteGlobal: boolean, parentId?: string | null) => Promise<void>;
  handleOverflowConfirm: (newBudgetValue: number) => Promise<void>;
  handleOverflowCancel: () => void;
}

/**
 * Operações do checklist da página de lançamentos: toggle com atalho
 * para lançamento, CRUD com verificação de estouro de orçamento e o
 * fluxo do modal de overflow (operação pendente + confirmação).
 * Extraído da TransactionsPage sem mudança de comportamento (Fase 1).
 */
export function useChecklistOperations(deps: ChecklistOperationsDeps): ChecklistOperations {
  const {
    db,
    selectedYear,
    selectedMonth,
    openMonths,
    userEmail,
    categories,
    budgetItems,
    checklistItems,
    globalChecklistItems,
    setChecklistItems,
    setErrorMsg,
    fetchData,
  } = deps;

  const [isOverflowModalOpen, setIsOverflowModalOpen] = useState<boolean>(false);
  const [overflowData, setOverflowData] = useState<ChecklistOverflowState | null>(null);

  const handleToggleChecklistItem = async (id: string, isCompleted: boolean) => {
    try {
      await toggleChecklistItemCompletion(db, id, isCompleted);
      setChecklistItems((prev) =>
        prev.map((prevItem) => (prevItem.id === id ? { ...prevItem, is_completed: isCompleted } : prevItem))
      );
    } catch (err) {
      console.error("Erro ao alterar conclusão do item:", err);
    }
  };

  const handleAddChecklistItem = async (input: ChecklistItemInput, isGlobal: boolean) => {
    if (isGlobal && input.amount !== null && input.amount !== undefined) {
      const overflowResult = checkGlobalBudgetOverflow(
        globalChecklistItems,
        budgetItems,
        input.category_id,
        input.amount
      );
      if (overflowResult.isOverflow) {
        const category = categories.find((c) => c.id === input.category_id);
        setOverflowData({
          ...overflowResult,
          categoryType: category?.type || "despesa",
          operationLabel: "incluir",
          pendingOperation: {
            type: "create",
            input,
            isGlobal: true,
          },
        });
        setIsOverflowModalOpen(true);
        return;
      }
    }

    const activeMonthPeriod = openMonths.find((p) => p.month === selectedMonth);
    await createChecklistItem(db, input, isGlobal, activeMonthPeriod?.id);
    await fetchData();
  };

  const handleEditChecklistItem = async (
    id: string,
    input: Partial<ChecklistItemInput>,
    updateGlobal: boolean,
    parentId?: string | null
  ) => {
    if (updateGlobal && input.amount !== undefined && input.amount !== null) {
      const originalItem = globalChecklistItems.find((item) => item.id === id) ||
                           checklistItems.find((item) => item.id === id);
      const targetCategoryId = input.category_id || originalItem?.category_id;
      const targetAmount = input.amount !== undefined ? input.amount : originalItem?.amount;

      if (targetCategoryId && targetAmount !== undefined && targetAmount !== null && originalItem) {
        const overflowResult = checkGlobalBudgetOverflow(
          globalChecklistItems,
          budgetItems,
          targetCategoryId,
          targetAmount,
          id // exclude the item being edited
        );
        if (overflowResult.isOverflow) {
          const category = categories.find((c) => c.id === targetCategoryId);
          setOverflowData({
            ...overflowResult,
            categoryType: category?.type || "despesa",
            operationLabel: "alterar",
            pendingOperation: {
              type: "edit",
              input: {
                day: input.day ?? originalItem.day,
                description: input.description ?? originalItem.description,
                type: input.type ?? originalItem.type,
                category_id: targetCategoryId,
                amount: targetAmount,
                created_by: userEmail,
              },
              isGlobal: true,
              itemId: id,
              updateGlobal: updateGlobal ?? false,
              parentId,
            },
          });
          setIsOverflowModalOpen(true);
          return;
        }
      }
    }

    await updateChecklistItem(db, id, input, updateGlobal, parentId);
    await fetchData();
  };

  const handleDeleteChecklistItem = async (
    id: string,
    deleteGlobal: boolean,
    parentId?: string | null
  ) => {
    await deleteChecklistItem(db, id, deleteGlobal, parentId);
    await fetchData();
  };

  const handleOverflowConfirm = async (newBudgetValue: number) => {
    if (!overflowData?.pendingOperation) return;

    const { pendingOperation } = overflowData;
    const category = categories.find((c) => c.id === overflowData.categoryId);

    try {
      await adjustBudgetItem(
        db,
        selectedYear,
        selectedMonth,
        category?.name || "",
        overflowData.categoryType,
        newBudgetValue,
        userEmail
      );

      if (pendingOperation.type === "create") {
        const activeMonthPeriod = openMonths.find((p) => p.month === selectedMonth);
        await createChecklistItem(db, pendingOperation.input, true, activeMonthPeriod?.id);
      } else if (pendingOperation.type === "edit" && pendingOperation.itemId) {
        await updateChecklistItem(
          db,
          pendingOperation.itemId,
          pendingOperation.input,
          pendingOperation.updateGlobal ?? false,
          pendingOperation.parentId
        );
      }

      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao confirmar ajuste de orçamento:", err);
      setErrorMsg(parseErrorMessage(err));
    }
  };

  const handleOverflowCancel = () => {
    setIsOverflowModalOpen(false);
    setOverflowData(null);
  };

  return {
    isOverflowModalOpen,
    overflowData,
    handleToggleChecklistItem,
    handleAddChecklistItem,
    handleEditChecklistItem,
    handleDeleteChecklistItem,
    handleOverflowConfirm,
    handleOverflowCancel,
  };
}
