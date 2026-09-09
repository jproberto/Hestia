"use client";

import { useState } from "react";
import { ChecklistItem, ChecklistItemInput, BudgetItem, Category } from "@/lib/pluto/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import ChecklistItemFormModal from "./ChecklistItemFormModal";
import ChecklistItemDeleteModal from "./ChecklistItemDeleteModal";
import ChecklistItemRow from "./ChecklistItemRow";
import ChecklistOverflowAlerts from "./ChecklistOverflowAlerts";
import { useChecklistItems } from "@/lib/pluto/hooks/useChecklistItems";
import { getItemUrgency } from "@/lib/shared";

interface ChecklistCardProps {
  items: ChecklistItem[];
  categories: Category[];
  budgetItems: BudgetItem[];
  isMonthOpen: boolean;
  selectedYear: number;
  selectedMonth: number;
  userEmail: string;
  onToggleItem: (id: string, isCompleted: boolean, item: ChecklistItem) => void;
  onAddItem: (input: ChecklistItemInput, isGlobal: boolean) => Promise<void>;
  onEditItem: (id: string, input: Partial<ChecklistItemInput>, updateGlobal: boolean, parentId?: string | null) => Promise<void>;
  onDeleteItem: (id: string, deleteGlobal: boolean, parentId?: string | null) => Promise<void>;
  onTriggerTransactionModal: (prefillData: {
    description: string;
    amount?: number | null;
    type: "receita" | "despesa";
    category_id: string;
    date: string;
  }) => void;
}

export default function ChecklistCard({
  items,
  categories,
  budgetItems,
  isMonthOpen,
  selectedYear,
  selectedMonth,
  userEmail,
  onToggleItem,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onTriggerTransactionModal,
}: ChecklistCardProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ChecklistItem | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    sortedItems,
    overflowCategories,
    renderUrgencyBadge,
    getRowBg,
  } = useChecklistItems(items, budgetItems);

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
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxToggle = (item: ChecklistItem) => {
    if (!isMonthOpen) return;
    const newCompleted = !item.is_completed;
    onToggleItem(item.id, newCompleted, item);

    if (newCompleted) {
      const formattedDay = String(item.day).padStart(2, "0");
      const formattedMonth = String(selectedMonth).padStart(2, "0");
      const dateStr = `${selectedYear}-${formattedMonth}-${formattedDay}`;

      onTriggerTransactionModal({
        description: item.description,
        type: item.type,
        category_id: item.category_id,
        amount: item.amount,
        date: dateStr,
      });
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Checklist de Contas a Pagar / Receber
          </h2>
          <p className="text-sm text-muted-foreground">
            Lembretes de vencimento do mês e atalho para lançamento
          </p>
        </div>

        {isMonthOpen && (
          <Button onClick={handleOpenAddModal} size="sm" className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-4 h-4">+</span>
            Adicionar Item
          </Button>
        )}
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          Nenhum item no checklist para este mês.
        </div>
      ) : (
        <div className="divide-y border-t border-b">
          {sortedItems.map((item) => {
            const urgency = getItemUrgency(item, selectedYear, selectedMonth);
            const rowBg = getRowBg(urgency);

            return (
              <ChecklistItemRow
                key={item.id}
                item={item}
                urgency={urgency}
                onToggle={handleCheckboxToggle}
                onEdit={handleOpenEditModal}
                onDelete={handleOpenDeleteModal}
                isMonthOpen={isMonthOpen}
                rowBg={rowBg}
                renderUrgencyBadge={renderUrgencyBadge}
              />
            );
          })}
        </div>
      )}

      <ChecklistOverflowAlerts overflowCategories={overflowCategories} />

      <ChecklistItemFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSaveAdd}
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
          onClose={() => setEditingItem(null)}
          onSubmit={handleSaveEdit}
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
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        item={deletingItem}
        saving={saving}
        errorMsg={errorMsg}
      />
    </div>
  );
}