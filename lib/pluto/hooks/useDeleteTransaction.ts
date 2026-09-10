"use client";

import { useState } from "react";
import type { IDatabaseClient } from "@/lib/shared/database";
import { deleteTransaction } from "@/lib/pluto/db/transactions";
import type { TransactionWithDetails } from "@/lib/pluto/types";
import { parseErrorMessage } from "@/lib/utils";

export interface UseDeleteTransactionOptions {
  db: IDatabaseClient;
  fetchData: () => Promise<void>;
  setErrorMsg: (msg: string | null) => void;
}

/**
 * Estado e handlers do modal de exclusão de transação.
 * Extraído de useTransactionModals sem mudança de comportamento.
 */
export function useDeleteTransaction({ db, fetchData, setErrorMsg }: UseDeleteTransactionOptions) {
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionWithDetails | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingTx, setDeletingTx] = useState<boolean>(false);

  const handleOpenDeleteModal = (tx: TransactionWithDetails) => {
    setDeletingTransaction(tx);
    setErrorMsg(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingTransaction(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;
    setDeletingTx(true);
    setErrorMsg(null);

    try {
      await deleteTransaction(db, deletingTransaction.id);
      setIsDeleteModalOpen(false);
      setDeletingTransaction(null);
      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao excluir a transação:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setDeletingTx(false);
    }
  };

  return {
    deletingTransaction,
    isDeleteModalOpen,
    deletingTx,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleConfirmDelete,
  };
}
