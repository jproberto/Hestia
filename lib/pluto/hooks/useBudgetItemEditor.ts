"use client";

import { useState } from "react";
import { adjustBudgetItem } from "@/lib/pluto/db/budget";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { BudgetAdjustment, Category } from "@/lib/pluto/types";

export interface UseBudgetItemEditorOptions {
  db: IDatabaseClient;
  year: number;
  revision: BudgetAdjustment | null;
  activeAdjustment: BudgetAdjustment | null;
  userEmail: string;
  categories: Category[];
  isEditable: boolean;
  onSaved: () => Promise<void>;
}

export interface BudgetItemEditor {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  categoryName: string;
  setCategoryName: (name: string) => void;
  categoryType: "receita" | "despesa";
  setCategoryType: (type: "receita" | "despesa") => void;
  amount: string;
  setAmount: (amount: string) => void;
  suggestions: Category[];
  editingCategoryId: string | null;
  tempAmount: string;
  setTempAmount: (amount: string) => void;
  savingCategoryId: string | null;
  handleSaveItem: (e: React.FormEvent) => Promise<void>;
  handleCellClick: (categoryId: string, currentAmount: number) => void;
  handleSaveInline: (categoryId: string, categoryName: string, categoryType: "receita" | "despesa") => Promise<void>;
  setEditingCategoryId: (id: string | null) => void;
}

/**
 * Form de nova previsão + edição inline de valores (extraído de BudgetPage
 * sem mudança de comportamento).
 */
export function useBudgetItemEditor({
  db,
  year,
  revision,
  activeAdjustment,
  userEmail,
  categories,
  isEditable,
  onSaved,
}: UseBudgetItemEditorOptions): BudgetItemEditor {
  const [showForm, setShowForm] = useState<boolean>(false);
  const [categoryName, setCategoryName] = useState<string>("");
  const [categoryType, setCategoryType] = useState<"receita" | "despesa">("despesa");
  const [amount, setAmount] = useState<string>("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<string>("");
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);

  const suggestions = categories.filter(
    (c) =>
      c.type === categoryType &&
      c.name.toLowerCase().includes(categoryName.toLowerCase()) &&
      c.name.toLowerCase() !== categoryName.toLowerCase()
  );

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!revision || !activeAdjustment || !categoryName || !amount || !userEmail) return;

    try {
      await adjustBudgetItem(
        db,
        year,
        activeAdjustment.start_month,
        categoryName,
        categoryType,
        parseFloat(amount),
        userEmail
      );
      setCategoryName("");
      setAmount("");
      setShowForm(false);
      await onSaved();
    } catch (err) {
      console.error(err);
    }
  }

  const handleCellClick = (categoryId: string, currentAmount: number) => {
    if (!isEditable) return;
    setEditingCategoryId(categoryId);
    setTempAmount(currentAmount.toString());
  };

  const handleSaveInline = async (
    categoryId: string,
    categoryName: string,
    categoryType: "receita" | "despesa"
  ) => {
    const value = parseFloat(tempAmount);
    if (isNaN(value) || value < 0) {
      setEditingCategoryId(null);
      return;
    }
    setSavingCategoryId(categoryId);
    try {
      if (!userEmail || !activeAdjustment) return;
      await adjustBudgetItem(
        db,
        year,
        activeAdjustment.start_month,
        categoryName,
        categoryType,
        value,
        userEmail
      );
      await onSaved();
    } catch (err) {
      console.error("Erro ao salvar ajuste inline:", err);
    } finally {
      setSavingCategoryId(null);
      setEditingCategoryId(null);
    }
  };

  return {
    showForm,
    setShowForm,
    categoryName,
    setCategoryName,
    categoryType,
    setCategoryType,
    amount,
    setAmount,
    suggestions,
    editingCategoryId,
    tempAmount,
    setTempAmount,
    savingCategoryId,
    handleSaveItem,
    handleCellClick,
    handleSaveInline,
    setEditingCategoryId,
  };
}
