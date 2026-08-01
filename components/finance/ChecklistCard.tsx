"use client";

import { useState } from "react";
import { ChecklistItem, ChecklistItemInput } from "@/lib/db/checklist";
import { Category } from "@/lib/db/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, CheckCircle2, Clock, AlertTriangle, AlertCircle } from "lucide-react";

interface ChecklistCardProps {
  items: ChecklistItem[];
  categories: Category[];
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

export default function ChecklistCard({
  items,
  categories,
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

  const today = new Date();
  const isCurrentViewedMonth =
    today.getFullYear() === selectedYear && today.getMonth() + 1 === selectedMonth;
  const currentDay = isCurrentViewedMonth ? today.getDate() : 1;

  const getItemUrgency = (item: ChecklistItem) => {
    if (item.is_completed) return "completed";
    if (!isCurrentViewedMonth) return "ondue"; // Em mês futuro/passado sem hoje como balizador
    if (item.day < currentDay) return "overdue";
    if (item.day <= currentDay + 3) return "warning";
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

    // Se estiver marcando como concluído, dispara o modal de transação pré-preenchido
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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Checklist de Contas a Pagar / Receber
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lembretes de vencimento do mês e atalho para lançamento
          </p>
        </div>

        {isMonthOpen && (
          <Button
            onClick={handleOpenAddModal}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Adicionar Item
          </Button>
        )}
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          Nenhum item no checklist para este mês.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedItems.map((item) => {
            const urgency = getItemUrgency(item);

            let borderClass = "border-slate-200 dark:border-slate-800";
            let badgeBg = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
            let statusIcon = <Clock className="w-3.5 h-3.5" />;
            let statusLabel = `Dia ${item.day}`;

            if (urgency === "completed") {
              borderClass = "opacity-60 bg-slate-50/50 dark:bg-slate-900/30";
              badgeBg = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
              statusIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
              statusLabel = "Concluída";
            } else if (urgency === "overdue") {
              badgeBg = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold";
              statusIcon = <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
              statusLabel = `Vencida (Dia ${item.day})`;
            } else if (urgency === "warning") {
              badgeBg = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold";
              statusIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
              statusLabel = `Dia ${item.day} (Em breve)`;
            }

            return (
              <div
                key={item.id}
                className={`py-3.5 px-2 flex items-center justify-between gap-3 transition-colors ${borderClass}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    disabled={!isMonthOpen}
                    onChange={() => handleCheckboxToggle(item)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium text-slate-900 dark:text-slate-100 ${
                          item.is_completed ? "line-through text-slate-400 dark:text-slate-500" : ""
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

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{item.category_name ?? "Sem categoria"}</span>
                      <span>•</span>
                      <span
                        className={
                          item.type === "receita"
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-slate-600 dark:text-slate-400"
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
                        ? "line-through text-slate-400 dark:text-slate-500"
                        : item.type === "receita"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {formatCurrency(item.amount)}
                  </span>

                  {isMonthOpen && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        title="Editar item"
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(item)}
                        title="Excluir item"
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
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

      {/* Modal Adicionar Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              Adicionar Item ao Checklist
            </h3>

            {errorMsg && (
              <div className="p-3 mb-4 text-sm bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-day">Dia do Vencimento</Label>
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
                  <Label htmlFor="add-type">Tipo</Label>
                  <select
                    id="add-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as "receita" | "despesa")}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="add-desc">Descrição</Label>
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
                  <Label htmlFor="add-cat">Categoria</Label>
                  <select
                    id="add-cat"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="add-amount">Valor Previsto (opcional)</Label>
                  <Input
                    id="add-amount"
                    type="text"
                    placeholder="0,00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Label className="block mb-2 text-xs font-semibold uppercase text-slate-500">
                  Escopo da Inclusão
                </Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="add-scope"
                      value="month"
                      checked={formScope === "month"}
                      onChange={() => setFormScope("month")}
                    />
                    Apenas neste mês
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              Editar Item do Checklist
            </h3>

            {errorMsg && (
              <div className="p-3 mb-4 text-sm bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-day">Dia do Vencimento</Label>
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
                  <Label htmlFor="edit-type">Tipo</Label>
                  <select
                    id="edit-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as "receita" | "despesa")}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-desc">Descrição</Label>
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
                  <Label htmlFor="edit-cat">Categoria</Label>
                  <select
                    id="edit-cat"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="edit-amount">Valor Previsto (opcional)</Label>
                  <Input
                    id="edit-amount"
                    type="text"
                    placeholder="0,00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Label className="block mb-2 text-xs font-semibold uppercase text-slate-500">
                  Escopo da Alteração
                </Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="edit-scope"
                      value="month"
                      checked={formScope === "month"}
                      onChange={() => setFormScope("month")}
                    />
                    Apenas neste mês
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Excluir Item do Checklist
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Tem certeza que deseja excluir &quot;{deletingItem.description}&quot;?
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 text-sm bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="mb-6 space-y-2">
              <Label className="block mb-2 text-xs font-semibold uppercase text-slate-500">
                Escopo da Exclusão
              </Label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="delete-scope"
                  value="month"
                  checked={formScope === "month"}
                  onChange={() => setFormScope("month")}
                />
                Apenas neste mês
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
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
