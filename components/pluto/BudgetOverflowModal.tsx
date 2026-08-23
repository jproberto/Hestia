"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export interface BudgetOverflowModalProps {
  isOpen: boolean;
  overflowData: {
    categoryId: string;
    categoryName: string;
    categoryType: "receita" | "despesa";
    totalChecklist: number;
    budgetAmount: number;
    operationLabel: string;
  };
  month: number;
  userEmail: string;
  onConfirm: (newBudgetValue: number) => void;
  onCancel: () => void;
}

export default function BudgetOverflowModal({
  isOpen,
  overflowData,
  month,
  onConfirm,
  onCancel,
}: BudgetOverflowModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 3 | 4>(1);
  const [newBudgetValue, setNewBudgetValue] = useState<number>(overflowData?.totalChecklist || 0);

  if (!isOpen || !overflowData) return null;

  const handleAdjustBudget = () => {
    setNewBudgetValue(overflowData.totalChecklist);
    setStep(3);
  };

  const handleSave = () => {
    onConfirm(newBudgetValue);
    setStep(4);
  };

  const handleClose = () => {
    setStep(1);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        
        {step === 1 && (
          <>
            <h2 className="text-lg font-bold tracking-tight text-rose-700 dark:text-rose-300">
              Estouro de Orçamento Detectado
            </h2>
            <p className="text-sm text-muted-foreground">
              Não é possível {overflowData.operationLabel} este item pois o total previsto da categoria{" "}
              <strong className="text-foreground">{overflowData.categoryName}</strong> no checklist (
              <strong className="text-foreground">{formatCurrency(overflowData.totalChecklist)}</strong>
              ) ultrapassa o orçamento planejado para o mês (
              <strong className="text-foreground">{formatCurrency(overflowData.budgetAmount)}</strong>
              ).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleAdjustBudget}>
                Ajustar Orçamento
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-bold tracking-tight">
              Ajustar Orçamento
            </h2>
            <p className="text-sm text-muted-foreground">
              Ajuste de {MONTH_NAMES[month - 1]}: defina o novo orçamento para {overflowData.categoryName}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="new-budget-value">Valor (R$)</Label>
              <Input
                id="new-budget-value"
                type="number"
                step="0.01"
                min={overflowData.totalChecklist}
                value={newBudgetValue}
                onChange={(e) => setNewBudgetValue(Number(e.target.value))}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={handleSave}
                disabled={newBudgetValue < overflowData.totalChecklist}
              >
                Salvar Ajuste e {overflowData.operationLabel === "incluir" ? "Incluir" : "Alterar"} Item
              </Button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              Sucesso!
            </h2>
            <p className="text-sm text-muted-foreground">
              O orçamento foi ajustado e o item do checklist foi gravado com sucesso.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="button" onClick={() => router.push("/pluto/budget")}>
                Ir para a página de Orçamento
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Continuar no Checklist
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
