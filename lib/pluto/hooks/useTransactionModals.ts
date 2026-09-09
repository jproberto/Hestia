"use client";

import { useRef, useState } from "react";
import type { IDatabaseClient } from "@/lib/shared/database";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/pluto/db/transactions";
import { getOrCreateAccount } from "@/lib/pluto/db/accounts";
import { getOrCreateCategory } from "@/lib/pluto/db/categories";
import type {
  Account,
  Category,
  TransactionWithDetails,
} from "@/lib/pluto/types";
import { parseErrorMessage } from "@/lib/utils";

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
 * Estado e handlers dos modais de transação e conta/cartão da página
 * de lançamentos. Extraído da TransactionsPage sem mudança de
 * comportamento (Fase 3 da decomposição).
 */
export function useTransactionModals(deps: TransactionModalsDeps): TransactionModals {
  const { db, userEmail, categories, minDateStr, fetchData, setErrorMsg } = deps;

  // Modal de Transação State
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionWithDetails | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingTx, setDeletingTx] = useState<boolean>(false);

  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const [isRefund, setIsRefund] = useState<boolean>(false);
  const [date, setDate] = useState<string>("");
  const [accountInput, setAccountInput] = useState<string>("");
  const [accountTypeInput, setAccountTypeInput] = useState<"conta" | "cartao">("conta");
  const [categoryInput, setCategoryInput] = useState<string>("");
  const [savingTx, setSavingTx] = useState<boolean>(false);
  const [txSuccessMsg, setTxSuccessMsg] = useState<string | null>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  // Modal de Nova Conta / Cartão State
  const [isAccModalOpen, setIsAccModalOpen] = useState<boolean>(false);
  const [newAccName, setNewAccName] = useState<string>("");
  const [newAccType, setNewAccType] = useState<"conta" | "cartao">("conta");
  const [savingAcc, setSavingAcc] = useState<boolean>(false);

  // Abertura do Modal de Transação pré-fixado para a conta escolhida (Nova Transação)
  const handleOpenTxModal = (acc: Account) => {
    setEditingTransaction(null);
    setDate(minDateStr);
    setDescription("");
    setAmount("");
    setType("despesa");
    setIsRefund(false);
    setAccountInput(acc.name);
    setAccountTypeInput(acc.type);
    setCategoryInput("");
    setErrorMsg(null);
    setTxSuccessMsg(null);
    setIsTxModalOpen(true);
  };

  // Abertura do Modal de Transação (Edição)
  const handleOpenEditModal = (tx: TransactionWithDetails) => {
    setEditingTransaction(tx);
    setDate(tx.date);
    setDescription(tx.description);
    setAmount(String(tx.amount));
    setType(tx.type);
    setIsRefund(tx.is_refund);
    setAccountInput(tx.account_name || "");
    setAccountTypeInput("conta");
    setCategoryInput(tx.category_name || "");
    setErrorMsg(null);
    setTxSuccessMsg(null);
    setIsTxModalOpen(true);
  };

  const handleCloseTxModal = () => {
    setIsTxModalOpen(false);
    setEditingTransaction(null);
  };

  // Abertura do Modal de Exclusão
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

  // Abertura do Modal Dedicado "Nova Conta / Cartão"
  const handleOpenAccModal = () => {
    setNewAccName("");
    setNewAccType("conta");
    setErrorMsg(null);
    setIsAccModalOpen(true);
  };

  const handleCloseAccModal = () => {
    setIsAccModalOpen(false);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      setErrorMsg("Digite o nome da conta ou cartão.");
      return;
    }

    setSavingAcc(true);
    setErrorMsg(null);

    try {
      await getOrCreateAccount(db, newAccName.trim(), userEmail, newAccType);
      setIsAccModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao salvar conta:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setSavingAcc(false);
    }
  };

  const handleTriggerTransactionModalFromChecklist = (prefill: TransactionModalPrefill) => {
    setDescription(prefill.description);
    setType(prefill.type);
    const targetCat = categories.find((c) => c.id === prefill.category_id);
    setCategoryInput(targetCat?.name || prefill.category_id);
    setAmount(prefill.amount !== null && prefill.amount !== undefined ? String(prefill.amount) : "");
    setDate(prefill.date);
    setAccountInput("");
    setIsRefund(false);
    setEditingTransaction(null);
    setTxSuccessMsg(null);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !accountInput.trim() || !categoryInput.trim()) {
      setErrorMsg("Preencha todos os campos obrigatórios.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("O valor deve ser um número maior que zero.");
      return;
    }

    setSavingTx(true);
    setErrorMsg(null);
    setTxSuccessMsg(null);

    try {
      const accountId = await getOrCreateAccount(
        db,
        accountInput,
        userEmail,
        accountTypeInput
      );
      const categoryId = await getOrCreateCategory(db, categoryInput, type, userEmail);

      if (editingTransaction) {
        await updateTransaction(
          db,
          editingTransaction.id,
          {
            description: description.trim(),
            amount: numAmount,
            type,
            is_refund: type === "despesa" ? isRefund : false,
            date,
            account_id: accountId,
            category_id: categoryId,
          }
        );
      } else {
        await createTransaction(
          db,
          {
            description: description.trim(),
            amount: numAmount,
            type,
            is_refund: type === "despesa" ? isRefund : false,
            date,
            account_id: accountId,
            category_id: categoryId,
          },
          userEmail
        );
      }

      setIsTxModalOpen(false);
      setEditingTransaction(null);
      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao salvar a transação:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setSavingTx(false);
    }
  };

  const handleSaveTransactionAndAddAnother = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !accountInput.trim() || !categoryInput.trim()) {
      setErrorMsg("Preencha todos os campos obrigatórios.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("O valor deve ser um número maior que zero.");
      return;
    }

    setSavingTx(true);
    setErrorMsg(null);
    setTxSuccessMsg(null);

    try {
      const accountId = await getOrCreateAccount(
        db,
        accountInput,
        userEmail,
        accountTypeInput
      );
      const categoryId = await getOrCreateCategory(db, categoryInput, type, userEmail);

      await createTransaction(
        db,
        {
          description: description.trim(),
          amount: numAmount,
          type,
          is_refund: type === "despesa" ? isRefund : false,
          date,
          account_id: accountId,
          category_id: categoryId,
        },
        userEmail
      );

      // Reseta os campos especificos e mantem o modal aberto
      setDescription("");
      setAmount("");
      setCategoryInput("");
      setIsRefund(false);
      setTxSuccessMsg("Transação salva com sucesso!");

      await fetchData();

      // Foco automatico no campo Descrição
      setTimeout(() => {
        descInputRef.current?.focus();
      }, 50);
    } catch (err: unknown) {
      console.error("Erro ao salvar a transação:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setSavingTx(false);
    }
  };

  return {
    isTxModalOpen,
    editingTransaction,
    description,
    setDescription,
    amount,
    setAmount,
    type,
    setType,
    isRefund,
    setIsRefund,
    date,
    setDate,
    accountInput,
    setAccountInput,
    categoryInput,
    setCategoryInput,
    savingTx,
    txSuccessMsg,
    descInputRef,
    handleOpenTxModal,
    handleOpenEditModal,
    handleCloseTxModal,
    handleSaveTransaction,
    handleSaveTransactionAndAddAnother,
    handleTriggerTransactionModalFromChecklist,
    deletingTransaction,
    isDeleteModalOpen,
    deletingTx,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleConfirmDelete,
    isAccModalOpen,
    newAccName,
    setNewAccName,
    newAccType,
    setNewAccType,
    savingAcc,
    handleOpenAccModal,
    handleCloseAccModal,
    handleSaveAccount,
  };
}
