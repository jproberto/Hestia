"use client";

import { useState } from "react";
import { ChecklistItemInput } from "@/lib/pluto/types";
import { Category } from "@/lib/pluto/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChecklistItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ChecklistItemInput, isGlobal: boolean) => Promise<void>;
  categories: Category[];
  userEmail: string;
  initialData?: {
    day: number;
    description: string;
    type: "receita" | "despesa";
    category_id: string;
    amount: number | null;
    scope: "month" | "global";
  };
  title: string;
  submitLabel: string;
  saving: boolean;
  errorMsg: string | null;
}

export default function ChecklistItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  userEmail,
  initialData,
  title,
  submitLabel,
  saving,
  errorMsg,
}: ChecklistItemFormModalProps) {
  const [formDay, setFormDay] = useState<number>(initialData?.day || 10);
  const [formDescription, setFormDescription] = useState<string>(initialData?.description || "");
  const [formType, setFormType] = useState<"receita" | "despesa">(initialData?.type || "despesa");
  const [formCategory, setFormCategory] = useState<string>(initialData?.category_id || categories[0]?.id || "");
  const [formAmount, setFormAmount] = useState<string>(
    initialData?.amount !== null && initialData?.amount !== undefined ? String(initialData.amount) : ""
  );
  const [formScope, setFormScope] = useState<"month" | "global">(initialData?.scope || "month");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!formDescription.trim()) {
      setValidationError("Informe uma descrição para o item.");
      return;
    }
    if (categories.length === 0) {
      setValidationError("Nenhuma categoria disponível. Cadastre uma categoria antes de incluir itens.");
      return;
    }
    if (!formCategory) {
      setValidationError("Selecione uma categoria.");
      return;
    }
    if (formDay < 1 || formDay > 31) {
      setValidationError("Informe um dia entre 1 e 31.");
      return;
    }

    try {
      const parsedAmount = formAmount ? parseFloat(formAmount.replace(",", ".")) : null;
      await onSubmit(
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
      onClose();
    } catch {
      // Erro de persistência: o modal permanece aberto e a mensagem
      // vem do pai via errorMsg (onSubmit relança após registrá-la).
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground rounded-lg shadow-lg max-w-md w-full p-6 border">
        <h3 className="text-lg font-display tracking-wider mb-4">{title}</h3>

        {(validationError || errorMsg) && (
          <div className="p-3 mb-4 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
            {validationError || errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="form-day" className="text-xs font-semibold">Dia do Vencimento</Label>
              <Input
                id="form-day"
                type="number"
                min={1}
                max={31}
                value={formDay}
                onChange={(e) => setFormDay(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div>
              <Label htmlFor="form-type" className="text-xs font-semibold">Tipo</Label>
              <select
                id="form-type"
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
            <Label htmlFor="form-desc" className="text-xs font-semibold">Descrição</Label>
            <Input
              id="form-desc"
              type="text"
              placeholder="Ex: Aluguel, Luz, Salário"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="form-cat" className="text-xs font-semibold">Categoria</Label>
              <select
                id="form-cat"
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
              <Label htmlFor="form-amount" className="text-xs font-semibold">Valor Previsto (opcional)</Label>
              <Input
                id="form-amount"
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
                  name="form-scope"
                  value="month"
                  checked={formScope === "month"}
                  onChange={() => setFormScope("month")}
                />
                Apenas neste mês
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="form-scope"
                  value="global"
                  checked={formScope === "global"}
                  onChange={() => setFormScope("global")}
                />
                No modelo global (repetir em todos os meses futuros)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}