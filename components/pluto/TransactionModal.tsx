"use client";

import type { MutableRefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MONTH_NAMES } from "@/lib/pluto/types";
import type {
  Account,
  Category,
  TransactionWithDetails,
} from "@/lib/pluto/types";

export interface TransactionModalProps {
  isOpen: boolean;
  editingTransaction: TransactionWithDetails | null;
  accountInput: string;
  description: string;
  amount: string;
  type: "receita" | "despesa";
  isRefund: boolean;
  date: string;
  categoryInput: string;
  savingTx: boolean;
  txSuccessMsg: string | null;
  accounts: Account[];
  categories: Category[];
  selectedYear: number;
  selectedMonth: number;
  minDateStr: string;
  maxDateStr: string;
  descInputRef: MutableRefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onSaveAndAddAnother: (e: React.FormEvent) => void;
  onDescriptionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onTypeChange: (value: "receita" | "despesa") => void;
  onIsRefundChange: (value: boolean) => void;
  onDateChange: (value: string) => void;
  onAccountInputChange: (value: string) => void;
  onCategoryInputChange: (value: string) => void;
}

/**
 * Modal de lançamento/edição de transação (conta pré-fixada).
 * Presentacional: todo o estado vive na página (Fase 2).
 */
export default function TransactionModal({
  isOpen,
  editingTransaction,
  accountInput,
  description,
  amount,
  type,
  isRefund,
  date,
  categoryInput,
  savingTx,
  txSuccessMsg,
  accounts,
  categories,
  selectedYear,
  selectedMonth,
  minDateStr,
  maxDateStr,
  descInputRef,
  onClose,
  onSave,
  onSaveAndAddAnother,
  onDescriptionChange,
  onAmountChange,
  onTypeChange,
  onIsRefundChange,
  onDateChange,
  onAccountInputChange,
  onCategoryInputChange,
}: TransactionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight">
          {editingTransaction
            ? `Editar Transação${accountInput ? ` (${accountInput})` : ""}`
            : `Nova Transação${accountInput ? ` (${accountInput})` : ""}`}
        </h2>

        {txSuccessMsg && (
          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {txSuccessMsg}
          </div>
        )}

        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-date" className="text-xs font-semibold">
              Data (Limitada a {MONTH_NAMES[selectedMonth - 1]}/{selectedYear})
            </Label>
            <Input
              id="tx-date"
              type="date"
              min={minDateStr}
              max={maxDateStr}
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-account" className="text-xs font-semibold">
              Conta / Cartão
            </Label>
            {accounts.length > 0 ? (
              <select
                id="tx-account"
                value={accountInput}
                onChange={(e) => onAccountInputChange(e.target.value)}
                required
                className="rounded border p-2 bg-background text-foreground text-sm font-medium"
              >
                <option value="">-- Selecione uma Conta / Cartão --</option>
                {accounts.map((acc) => (
                  <option key={acc.id || acc.name} value={acc.name}>
                    {acc.name} ({acc.type === "cartao" ? "Cartão" : "Conta"})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="tx-account"
                type="text"
                placeholder="Ex: Itaú Corrente, Cartão Nubank"
                value={accountInput}
                onChange={(e) => onAccountInputChange(e.target.value)}
                required
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-description" className="text-xs font-semibold">
              Descrição
            </Label>
            <Input
              id="tx-description"
              ref={descInputRef}
              type="text"
              placeholder="Ex: Supermercado, Salário"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-type" className="text-xs font-semibold">
                Tipo
              </Label>
              <select
                id="tx-type"
                value={type}
                onChange={(e) => onTypeChange(e.target.value as "receita" | "despesa")}
                className="rounded border p-2 bg-background text-foreground text-sm font-medium"
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-amount" className="text-xs font-semibold">
                Valor (R$)
              </Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                required
              />
            </div>
          </div>

          {type === "despesa" && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_refund"
                checked={isRefund}
                onChange={(e) => onIsRefundChange(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_refund" className="text-xs font-medium cursor-pointer">
                Reembolso
              </Label>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-category" className="text-xs font-semibold">
              Categoria
            </Label>
            <Input
              id="tx-category"
              type="text"
              list="categories-list"
              placeholder="Selecione ou digite para criar nova categoria"
              value={categoryInput}
              onChange={(e) => onCategoryInputChange(e.target.value)}
              required
            />
            <datalist id="categories-list">
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name} />
              ))}
            </datalist>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            {!editingTransaction && (
              <Button
                type="button"
                variant="secondary"
                onClick={onSaveAndAddAnother}
                disabled={savingTx}
              >
                {savingTx ? "Salvando..." : "Salvar e Adicionar Outro"}
              </Button>
            )}
            <Button type="submit" disabled={savingTx}>
              {savingTx ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
