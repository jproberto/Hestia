"use client";

import { useRef, useState } from "react";
import type { IDatabaseClient } from "@/lib/shared/database";
import {
  createTransaction,
  updateTransaction,
} from "@/lib/pluto/db/transactions";
import { getOrCreateAccount } from "@/lib/pluto/db/accounts";
import { getOrCreateCategory } from "@/lib/pluto/db/categories";
import type {
  Account,
  Category,
  TransactionWithDetails,
} from "@/lib/pluto/types";
import { parseErrorMessage } from "@/lib/utils";
import type { TransactionModalPrefill } from "./useTransactionModals";

export interface UseTransactionFormOptions {
  db: IDatabaseClient;
  userEmail: string;
  categories: Category[];
  minDateStr: string;
  fetchData: () => Promise<void>;
  setErrorMsg: (msg: string | null) => void;
}

/**
 * Estado e handlers do modal de transação (nova + edição + prefill do
 * checklist + salvar e adicionar outra). Extraído de useTransactionModals
 * sem mudança de comportamento.
 */
export function useTransactionForm({
  db,
  userEmail,
  categories,
  minDateStr,
  fetchData,
  setErrorMsg,
}: UseTransactionFormOptions) {
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);

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
  };
}
