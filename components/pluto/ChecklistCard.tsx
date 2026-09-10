"use client";

import { ChecklistItem, ChecklistItemInput, BudgetItem, Category } from "@/lib/pluto/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import ChecklistItemRow from "./ChecklistItemRow";
import ChecklistOverflowAlerts from "./ChecklistOverflowAlerts";
import ChecklistCardModals from "./ChecklistCardModals";
import { useChecklistItems } from "@/lib/pluto/hooks/useChecklistItems";
import { useChecklistCardModals } from "@/lib/pluto/hooks/useChecklistCardModals";
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
  const {
    sortedItems,
    overflowCategories,
    renderUrgencyBadge,
    getRowBg,
  } = useChecklistItems(items, budgetItems);

  const modals = useChecklistCardModals({ onAddItem, onEditItem, onDeleteItem });

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
          <h2 className="text-lg font-display tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Checklist de Contas a Pagar / Receber
          </h2>
          <p className="text-sm text-muted-foreground">
            Lembretes de vencimento do mês e atalho para lançamento
          </p>
        </div>

        {isMonthOpen && (
          <Button onClick={modals.handleOpenAddModal} size="sm" className="flex items-center gap-1.5 self-start sm:self-auto">
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
                onEdit={modals.handleOpenEditModal}
                onDelete={modals.handleOpenDeleteModal}
                isMonthOpen={isMonthOpen}
                rowBg={rowBg}
                renderUrgencyBadge={renderUrgencyBadge}
              />
            );
          })}
        </div>
      )}

      <ChecklistOverflowAlerts overflowCategories={overflowCategories} />

      <ChecklistCardModals
        isAddModalOpen={modals.isAddModalOpen}
        editingItem={modals.editingItem}
        deletingItem={modals.deletingItem}
        saving={modals.saving}
        errorMsg={modals.errorMsg}
        categories={categories}
        userEmail={userEmail}
        onCloseAdd={() => modals.setIsAddModalOpen(false)}
        onSaveAdd={modals.handleSaveAdd}
        onCloseEdit={() => modals.setEditingItem(null)}
        onSaveEdit={modals.handleSaveEdit}
        onCloseDelete={() => modals.setDeletingItem(null)}
        onConfirmDelete={modals.handleConfirmDelete}
      />
    </div>
  );
}
