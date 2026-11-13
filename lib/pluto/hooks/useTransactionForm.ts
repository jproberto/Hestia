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
import { getMonthRange } from "@/lib/pluto/types";
import { normalizeName } from "@/lib/pluto/utils";
import { parseErrorMessage } from "@/lib/utils";
import type { TransactionModalPrefill } from "./useTransactionModals";

export interface UseTransactionFormOptions {
  db: IDatabaseClient;
  userEmail: string;
  categories: Category[];
  /**
   * Registros de conta já carregados pela tela — fonte do tipo em edição e
   * na escolha do select (F1/R4, emenda 2026-11-08). Sem fetch novo: a
   * lista vive em usePlutoData e chega via composição da página.
   */
  accounts?: Account[];
  selectedYear: number;
  selectedMonth: number;
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
  accounts = [],
  selectedYear,
  selectedMonth,
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

  // F1/R4 (emenda 2026-11-08): a identidade da conta é (nome normalizado,
  // tipo) — o tipo é SEMPRE resolvido no registro da lista já carregada,
  // nunca herdado do estado anterior do formulário.
  const resolveAccountType = (name: string): "conta" | "cartao" | null => {
    const match = accounts.find(
      (acc) => normalizeName(acc.name) === normalizeName(name)
    );
    return match ? match.type : null;
  };

  // Abertura do Modal de Transação pré-fixado para a conta escolhida (Nova Transação)
  const handleOpenTxModal = (acc: Account) => {
    setEditingTransaction(null);
    // Regra 2/3 (05e): o calendário abre no primeiro dia do mês da tela; o
    // mês de cálculo gravado no create é o da tela, independente da data.
    setDate(getMonthRange(selectedYear, selectedMonth).startDate);
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
    // Tipo do registro editado (F1/R4 + emenda 2026-11-11): o tipo vem do
    // PROPRIO account_id da linha referenciada — homonimas conta x cartao
    // (D19/R2) compartilham o nome normalizado, entao o nome nao discrimina
    // e a primeira linha em ordem de lista nao pode vencer. Fallback: nome
    // normalizado quando a lista nao carregou o id; sem correspondente, o
    // padrao do formulario (mesmo comportamento anterior, nunca "cartao"
    // fixo).
    const accountById = tx.account_id
      ? accounts.find((acc) => acc.id === tx.account_id)
      : undefined;
    setAccountTypeInput(
      accountById?.type ?? resolveAccountType(tx.account_name) ?? "conta"
    );
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
    // Sem escolha de conta, sem tipo herdado do fluxo anterior (F1/R4).
    setAccountTypeInput("conta");
    setIsRefund(false);
    setEditingTransaction(null);
    setTxSuccessMsg(null);
    setIsTxModalOpen(true);
  };

  // Select/entrada de conta: nome e tipo caminham juntos (F1/R4). O value do
  // select é discriminador (emenda 2026-11-11): id da linha quando há
  // homônimas sob normalizeName (mesmo nome com tipo diferente, D19/R2) e a
  // grafia do nome quando única — então o handler resolve o registro EXATO
  // primeiro por id e só depois por nome. Sem correspondente na lista (lista
  // vazia / texto livre), o valor vigente permanece e o tipo não muda.
  const handleAccountInputChange = (value: string) => {
    const chosen =
      accounts.find((acc) => acc.id === value) ??
      accounts.find(
        (acc) => normalizeName(acc.name) === normalizeName(value)
      );
    if (chosen) {
      setAccountInput(chosen.name);
      setAccountTypeInput(chosen.type);
    } else {
      setAccountInput(value);
    }
  };

  // R7: ao perder o foco do campo de categoria, se existir homônima do OUTRO
  // tipo sob normalizeName, o campo assume a grafia da linha existente (só
  // quando difere). Sem aviso, sem estado novo de mensagem. O updater lê o
  // valor vigente do campo no momento do blur (não o do render do handler).
  const handleCategoryBlur = () => {
    setCategoryInput((current) => {
      if (!current.trim()) return current;
      const homonym = categories.find(
        (c) => c.type !== type && normalizeName(c.name) === normalizeName(current)
      );
      return homonym && homonym.name !== current ? homonym.name : current;
    });
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
            period_year: selectedYear,
            period_month: selectedMonth,
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
          period_year: selectedYear,
          period_month: selectedMonth,
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
    handleAccountInputChange,
    accountTypeInput,
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
    handleCategoryBlur,
  };
}
