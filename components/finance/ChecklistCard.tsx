"use client";

import { useState } from "react";
import { ChecklistItem, ChecklistItemInput } from "@/lib/pluto/db/checklist";
import { Category } from "@/lib/pluto/db/categories";
import { BudgetItem } from "@/lib/pluto/db/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, CheckCircle2, Clock, AlertTriangle, AlertCircle } from "lucide-react";

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

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

import { checkMonthBudgetOverflow, BudgetOverflowResult } from "@/lib/pluto/checklist-budget";

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

  // Form State
  const [formDay, setFormDay] = useState<number>(10);
  const [formDescription, setFormDescription] = useState<string>("");
  const [formType, setFormType] = useState<"receita" | "despesa">("despesa");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formScope, setFormScope] = useState<"month" | "global">("month");
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getItemUrgency = (item: ChecklistItem) => {
    if (item.is_completed) return "completed";

    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const itemDate = new Date(selectedYear, selectedMonth - 1, item.day);

    const diffTime = itemDate.getTime() - todayZero.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

    if (diffDays < 0) return "overdue";
    if (diffDays <= 3) return "warning";
    return "ondue";
  };

  const handleOpenAddModal = () => {
    setFormDay(10);
    setFormDescription("");
    setFormType("despesa");
    setFormCategory(categories[0]?.id || "");
    setFormAmount("");
    setFormScope("month");
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormDay(item.day);
    setFormDescription(item.description);
    setFormType(item.type);
    setFormCategory(item.category_id);
    setFormAmount(item.amount !== null && item.amount !== undefined ? String(item.amount) : "");
    setFormScope("month");
    setErrorMsg(null);
  };

  const handleOpenDeleteModal = (item: ChecklistItem) => {
    setDeletingItem(item);
    setFormScope("month");
    setErrorMsg(null);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      setErrorMsg("A descrição é obrigatória.");
      return;
    }
    if (!formCategory) {
      setErrorMsg("Selecione uma categoria.");
      return;
    }
    if (formDay < 1 || formDay > 31) {
      setErrorMsg("O dia deve ser entre 1 e 31.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const parsedAmount = formAmount ? parseFloat(formAmount.replace(",", ".")) : null;
      await onAddItem(
        {
          day: formDay,
          description: formDescription.trim(),
          type: formType,
          category_id: formCategory,
          amount: parsedAmount,
          created_by: userEmail,
        },
        formScope === "global"
      );
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao adicionar item.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!formDescription.trim()) {
      setErrorMsg("A descrição é obrigatória.");
      return;
    }
    if (!formCategory) {
      setErrorMsg("Selecione uma categoria.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const parsedAmount = formAmount ? parseFloat(formAmount.replace(",", ".")) : null;
      await onEditItem(
        editingItem.id,
        {
          day: formDay,
          description: formDescription.trim(),
          type: formType,
          category_id: formCategory,
          amount: parsedAmount,
        },
        formScope === "global",
        editingItem.parent_id
      );
      setEditingItem(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao atualizar item.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      await onDeleteItem(deletingItem.id, formScope === "global", deletingItem.parent_id);
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

  const sortedItems = [...items].sort((a, b) => a.day - b.day);

  // Calculate budget overflow per category
  const categoryTotals = new Map<string, { total: number; categoryName: string }>();
  sortedItems.forEach((item) => {
    const catId = item.category_id;
    const catName = item.category_name ?? "Sem categoria";
    const amount = item.amount ?? 0;
    const existing = categoryTotals.get(catId) || { total: 0, categoryName: catName };
    existing.total += amount;
    categoryTotals.set(catId, existing);
  });

  const overflowCategories: BudgetOverflowResult[] = [];
  categoryTotals.forEach((data, catId) => {
    const result = checkMonthBudgetOverflow(sortedItems, budgetItems, catId);
    if (result.isOverflow) {
      overflowCategories.push(result);
    }
  });

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
          <Button
            onClick={handleOpenAddModal}
            size="sm"
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
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
            const urgency = getItemUrgency(item);

            let rowBg = "";
            let badgeBg = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50";
            let statusIcon = <Clock className="w-3.5 h-3.5" />;
            let statusLabel = `Dia ${item.day}`;

            if (urgency === "completed") {
              rowBg = "opacity-60 bg-muted/30";
              badgeBg = "bg-muted text-muted-foreground border border-border";
              statusIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
              statusLabel = "Concluída";
            } else if (urgency === "overdue") {
              badgeBg = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-semibold";
              statusIcon = <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
              statusLabel = `Vencida (Dia ${item.day})`;
            } else if (urgency === "warning") {
              badgeBg = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 font-semibold";
              statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
              statusLabel = `Dia ${item.day} (Em breve)`;
            }

            return (
              <div
                key={item.id}
                className={`py-3 px-2 flex items-center justify-between gap-3 transition-colors ${rowBg}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    disabled={!isMonthOpen}
                    onChange={() => handleCheckboxToggle(item)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium ${
                          item.is_completed ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {item.description}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${badgeBg}`}
                      >
                        {statusIcon}
                        {statusLabel}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{item.category_name ?? "Sem categoria"}</span>
                      <span>•</span>
                      <span
                        className={
                          item.type === "receita"
                            ? "text-emerald-700 dark:text-emerald-400 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {item.type === "receita" ? "Receita" : "Despesa"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-sm font-semibold ${
                      item.is_completed
                        ? "line-through text-muted-foreground"
                        : item.type === "receita"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-foreground"
                    }`}
                  >
                    {formatCurrency(item.amount)}
                  </span>

                  {isMonthOpen && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        title="Editar item"
                        className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(item)}
                        title="Excluir item"
                        className="p-1 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget Overflow Banners for point items */}
      {overflowCategories.length > 0 && (
        <div className="mt-4 space-y-2">
          {overflowCategories.map((overflow) => (
            <div
              key={overflow.categoryId}
              className="font-semibold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 rounded-lg p-3 text-sm"
              role="alert"
            >
              Atenção: O total previsto para &apos;{overflow.categoryName}&apos; neste mês (
              <strong>{formatCurrency(overflow.totalChecklist)}</strong>
              ) excede o orçamento planejado (
              <strong>{formatCurrency(overflow.budgetAmount)}</strong>
              ).
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground rounded-lg shadow-lg max-w-md w-full p-6 border">
            <h3 className="text-lg font-bold tracking-tight mb-4">
              Adicionar Item ao Checklist
            </h3>

            {errorMsg && (
              <div className="p-3 mb-4 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-day" className="text-xs font-semibold">Dia do Vencimento</Label>
                  <Input
                    id="add-day"
                    type="number"
                    min={1}
                    max={31}
                    value={formDay}
                    onChange={(e) => setFormDay(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="add-type" className="text-xs font-semibold">Tipo</Label>
                  <select
                    id="add-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as "receita" | "despesa")}
                    className="w-full h-10 px-3 rounded-md border bg-background text-foreground text-sm"
                  >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="add-desc" className="text-xs font-semibold">Descrição</Label>
                <Input
                  id="add-desc"
                  type="text"
                  placeholder="Ex: Aluguel, Luz, Salário"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-cat" className="text-xs font-semibold">Categoria</Label>
                  <select
                    id="add-cat"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background text-foreground text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="add-amount" className="text-xs font-semibold">Valor Previsto (opcional)</Label>
                  <Input
                    id="add-amount"
                    type="text"
                    placeholder="0,00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <Label className="block mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Escopo da Inclusão
                </Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="add-scope"
                      value="month"
                      checked={formScope === "month"}
                      onChange={() => setFormScope("month")}
                    />
                    Apenas neste mês
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="add-scope"
                      value="global"
                      checked={formScope === "global"}
                      onChange={() => setFormScope("global")}
                    />
                    No modelo global (repetir em todos os meses futuros)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Adicionar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Item */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground rounded-lg shadow-lg max-w-md w-full p-6 border">
            <h3 className="text-lg font-bold tracking-tight mb-4">
              Editar Item do Checklist
            </h3>

            {errorMsg && (
              <div className="p-3 mb-4 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-day" className="text-xs font-semibold">Dia do Vencimento</Label>
                  <Input
                    id="edit-day"
                    type="number"
                    min={1}
                    max={31}
                    value={formDay}
                    onChange={(e) => setFormDay(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-type" className="text-xs font-semibold">Tipo</Label>
                  <select
                    id="edit-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as "receita" | "despesa")}
                    className="w-full h-10 px-3 rounded-md border bg-background text-foreground text-sm"
                  >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-desc" className="text-xs font-semibold">Descrição</Label>
                <Input
                  id="edit-desc"
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-cat" className="text-xs font-semibold">Categoria</Label>
                  <select
                    id="edit-cat"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background text-foreground text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="edit-amount" className="text-xs font-semibold">Valor Previsto (opcional)</Label>
                  <Input
                    id="edit-amount"
                    type="text"
                    placeholder="0,00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <Label className="block mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Escopo da Alteração
                </Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="edit-scope"
                      value="month"
                      checked={formScope === "month"}
                      onChange={() => setFormScope("month")}
                    />
                    Apenas neste mês
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="edit-scope"
                      value="global"
                      checked={formScope === "global"}
                      onChange={() => setFormScope("global")}
                    />
                    No modelo global (atualizar também a lista recorrente)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Item */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground rounded-lg shadow-lg max-w-md w-full p-6 border">
            <h3 className="text-lg font-bold tracking-tight mb-2">
              Excluir Item do Checklist
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tem certeza que deseja excluir &quot;{deletingItem.description}&quot;?
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
                {errorMsg}
              </div>
            )}

            <div className="mb-6 space-y-2 border-t pt-3">
              <Label className="block mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Escopo da Exclusão
              </Label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="delete-scope"
                  value="month"
                  checked={formScope === "month"}
                  onChange={() => setFormScope("month")}
                />
                Apenas neste mês
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="delete-scope"
                  value="global"
                  checked={formScope === "global"}
                  onChange={() => setFormScope("global")}
                />
                No modelo global (remover dos próximos meses)
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingItem(null)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={saving}>
                {saving ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
