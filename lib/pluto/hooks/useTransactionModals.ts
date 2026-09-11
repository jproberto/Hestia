"use client";

import type { IDatabaseClient } from "@/lib/shared/database";
import type {
  Account,
  Category,
  TransactionWithDetails,
} from "@/lib/pluto/types";
import { useTransactionForm } from "./useTransactionForm";
import { useAccountForm } from "./useAccountForm";
import { useDeleteTransaction } from "./useDeleteTransaction";

export interface TransactionModalPrefill {
  description: string;
  amount?: number | null;
  type: "receita" | "despesa";
  category_id: string;
  date: string;
}

export interface TransactionModalsDeps {
  db: IDatabaseClient;
  userEmail: string;
  categories: Category[];
  minDateStr: string;
  fetchData: () => Promise<void>;
  setErrorMsg: (msg: string | null) => void;
}

export interface TransactionModals {
  // Transaction modal state (props do TransactionModal)
  isTxModalOpen: boolean;
  editingTransaction: TransactionWithDetails | null;
  description: string;
  setDescription: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  type: "receita" | "despesa";
  setType: (value: "receita" | "despesa") => void;
  isRefund: boolean;
  setIsRefund: (value: boolean) => void;
  date: string;
  setDate: (value: string) => void;
  accountInput: string;
  setAccountInput: (value: string) => void;
  categoryInput: string;
  setCategoryInput: (value: string) => void;
  savingTx: boolean;
  txSuccessMsg: string | null;
  descInputRef: React.MutableRefObject<HTMLInputElement | null>;
  handleOpenTxModal: (account: Account) => void;
  handleOpenEditModal: (tx: TransactionWithDetails) => void;
  handleCloseTxModal: () => void;
  handleSaveTransaction: (e: React.FormEvent) => Promise<void>;
  handleSaveTransactionAndAddAnother: (e: React.FormEvent) => Promise<void>;
  handleTriggerTransactionModalFromChecklist: (prefill: TransactionModalPrefill) => void;
  // Delete modal state (props do DeleteConfirmModal)
  deletingTransaction: TransactionWithDetails | null;
  isDeleteModalOpen: boolean;
  deletingTx: boolean;
  handleOpenDeleteModal: (tx: TransactionWithDetails) => void;
  handleCloseDeleteModal: () => void;
  handleConfirmDelete: () => Promise<void>;
  // Account modal state (props do AccountModal)
  isAccModalOpen: boolean;
  newAccName: string;
  setNewAccName: (value: string) => void;
  newAccType: "conta" | "cartao";
  setNewAccType: (value: "conta" | "cartao") => void;
  savingAcc: boolean;
  handleOpenAccModal: () => void;
  handleCloseAccModal: () => void;
  handleSaveAccount: (e: React.FormEvent) => Promise<void>;
}

/**
 * Compositor dos 3 modais da página de lançamentos (transação + exclusão +
 * conta). Lógica extraída para useTransactionForm/useAccountForm/
 * useDeleteTransaction sem mudança de comportamento; a interface e os
 * consumidores permanecem idênticos.
 */
export function useTransactionModals(deps: TransactionModalsDeps): TransactionModals {
  const { db, userEmail, categories, minDateStr, fetchData, setErrorMsg } = deps;

  const txForm = useTransactionForm({ db, userEmail, categories, minDateStr, fetchData, setErrorMsg });
  const accForm = useAccountForm({ db, userEmail, fetchData, setErrorMsg });
  const delFlow = useDeleteTransaction({ db, fetchData, setErrorMsg });

  return {
    isTxModalOpen: txForm.isTxModalOpen,
    editingTransaction: txForm.editingTransaction,
    description: txForm.description,
    setDescription: txForm.setDescription,
    amount: txForm.amount,
    setAmount: txForm.setAmount,
    type: txForm.type,
    setType: txForm.setType,
    isRefund: txForm.isRefund,
    setIsRefund: txForm.setIsRefund,
    date: txForm.date,
    setDate: txForm.setDate,
    accountInput: txForm.accountInput,
    setAccountInput: txForm.setAccountInput,
    categoryInput: txForm.categoryInput,
    setCategoryInput: txForm.setCategoryInput,
    savingTx: txForm.savingTx,
    txSuccessMsg: txForm.txSuccessMsg,
    descInputRef: txForm.descInputRef,
    handleOpenTxModal: txForm.handleOpenTxModal,
    handleOpenEditModal: txForm.handleOpenEditModal,
    handleCloseTxModal: txForm.handleCloseTxModal,
    handleSaveTransaction: txForm.handleSaveTransaction,
    handleSaveTransactionAndAddAnother: txForm.handleSaveTransactionAndAddAnother,
    handleTriggerTransactionModalFromChecklist: txForm.handleTriggerTransactionModalFromChecklist,
    deletingTransaction: delFlow.deletingTransaction,
    isDeleteModalOpen: delFlow.isDeleteModalOpen,
    deletingTx: delFlow.deletingTx,
    handleOpenDeleteModal: delFlow.handleOpenDeleteModal,
    handleCloseDeleteModal: delFlow.handleCloseDeleteModal,
    handleConfirmDelete: delFlow.handleConfirmDelete,
    isAccModalOpen: accForm.isAccModalOpen,
    newAccName: accForm.newAccName,
    setNewAccName: accForm.setNewAccName,
    newAccType: accForm.newAccType,
    setNewAccType: accForm.setNewAccType,
    savingAcc: accForm.savingAcc,
    handleOpenAccModal: accForm.handleOpenAccModal,
    handleCloseAccModal: accForm.handleCloseAccModal,
    handleSaveAccount: accForm.handleSaveAccount,
  };
}
