"use client";

import type { Category, ChecklistItem, ChecklistItemInput } from "@/lib/pluto/types";
import ChecklistItemFormModal from "./ChecklistItemFormModal";
import ChecklistItemDeleteModal from "./ChecklistItemDeleteModal";

export interface ChecklistCardModalsProps {
  isAddModalOpen: boolean;
  editingItem: ChecklistItem | null;
  deletingItem: ChecklistItem | null;
  saving: boolean;
  errorMsg: string | null;
  categories: Category[];
  userEmail: string;
  onCloseAdd: () => void;
  onSaveAdd: (input: ChecklistItemInput, isGlobal: boolean) => Promise<void>;
  onCloseEdit: () => void;
  onSaveEdit: (input: ChecklistItemInput, isGlobal: boolean) => Promise<void>;
  onCloseDelete: () => void;
  onConfirmDelete: (deleteGlobal: boolean) => Promise<void>;
}

/**
 * Os 3 modais do ChecklistCard (adicionar/editar/excluir).
 * Extraído do card sem mudança visual.
 */
export default function ChecklistCardModals({
  isAddModalOpen,
  editingItem,
  deletingItem,
  saving,
  errorMsg,
  categories,
  userEmail,
  onCloseAdd,
  onSaveAdd,
  onCloseEdit,
  onSaveEdit,
  onCloseDelete,
  onConfirmDelete,
}: ChecklistCardModalsProps) {
  return (
    <>
      <ChecklistItemFormModal
        isOpen={isAddModalOpen}
        onClose={onCloseAdd}
        onSubmit={onSaveAdd}
        categories={categories}
        userEmail={userEmail}
        title="Adicionar Item ao Checklist"
        submitLabel="Adicionar"
        saving={saving}
        errorMsg={errorMsg}
      />

      {editingItem && (
        <ChecklistItemFormModal
          isOpen={true}
          onClose={onCloseEdit}
          onSubmit={onSaveEdit}
          categories={categories}
          userEmail={userEmail}
          initialData={{
            day: editingItem.day,
            description: editingItem.description,
            type: editingItem.type,
            category_id: editingItem.category_id,
            amount: editingItem.amount ?? null,
            scope: "month",
          }}
          title="Editar Item do Checklist"
          submitLabel="Salvar Alterações"
          saving={saving}
          errorMsg={errorMsg}
        />
      )}

      <ChecklistItemDeleteModal
        isOpen={!!deletingItem}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        item={deletingItem}
        saving={saving}
        errorMsg={errorMsg}
      />
    </>
  );
}
