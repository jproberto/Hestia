"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/pluto/types";
import type { TransactionWithDetails } from "@/lib/pluto/types";

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  transaction: TransactionWithDetails | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Modal de confirmação de exclusão de transação.
 * Presentacional: todo o estado vive na página (Fase 2).
 */
export default function DeleteConfirmModal({
  isOpen,
  transaction,
  deleting,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight text-rose-700 dark:text-rose-300">
          Excluir lançamento
        </h2>
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir o lançamento{" "}
          <strong className="text-foreground">{transaction.description}</strong> no valor de{" "}
          <strong className="text-foreground">{formatCurrency(Number(transaction.amount))}</strong>?
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="bg-rose-500/90 hover:bg-rose-600 text-white font-medium shadow-sm border-none transition-colors"
          >
            {deleting ? "Excluindo..." : "Confirmar Exclusão"}
          </Button>
        </div>
      </div>
    </div>
  );
}
