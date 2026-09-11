"use client";

import { useState } from "react";
import type { ChecklistItem, ChecklistItemInput } from "@/lib/pluto/types";

export interface UseChecklistCardModalsOptions {
  onAddItem: (input: ChecklistItemInput, isGlobal: boolean) => Promise<void>;
  onEditItem: (id: string, input: Partial<ChecklistItemInput>, updateGlobal: boolean, parentId?: string | null) => Promise<void>;
  onDeleteItem: (id: string, deleteGlobal: boolean, parentId?: string | null) => Promise<void>;
}

/**
 * Estado dos 3 modais do ChecklistCard (adicionar/editar/excluir) + saving
 * e erro. Extraído do card sem mudança de comportamento.
 */
export function useChecklistCardModals({ onAddItem, onEditItem, onDeleteItem }: UseChecklistCardModalsOptions) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ChecklistItem | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: ChecklistItem) => {
    setEditingItem(item);
    setErrorMsg(null);
  };

  const handleOpenDeleteModal = (item: ChecklistItem) => {
    setDeletingItem(item);
    setErrorMsg(null);
  };

  const handleSaveAdd = async (input: ChecklistItemInput, isGlobal: boolean) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await onAddItem(input, isGlobal);
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao adicionar item.");
      // Relança para o form não fechar o modal no erro (o erro fica visível via errorMsg).
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (input: ChecklistItemInput, isGlobal: boolean) => {
    if (!editingItem) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onEditItem(
        editingItem.id,
        input,
        isGlobal,
        editingItem.parent_id
      );
      setEditingItem(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao atualizar item.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (deleteGlobal: boolean) => {
    if (!deletingItem) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onDeleteItem(deletingItem.id, deleteGlobal, deletingItem.parent_id);
      setDeletingItem(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao excluir item.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    isAddModalOpen,
    setIsAddModalOpen,
    editingItem,
    setEditingItem,
    deletingItem,
    setDeletingItem,
    saving,
    errorMsg,
    handleOpenAddModal,
    handleOpenEditModal,
    handleOpenDeleteModal,
    handleSaveAdd,
    handleSaveEdit,
    handleConfirmDelete,
  };
}
