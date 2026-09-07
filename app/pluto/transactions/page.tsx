"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { PlutoLayout } from "@/components/layout/PlutoLayout";
import { createClient } from "@/utils/supabase/client";
import {
  getTransactionsByMonth,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  TransactionWithDetails,
} from "@/lib/pluto/db/transactions";
import { getAccounts, getOrCreateAccount, Account } from "@/lib/pluto/db/accounts";
import { getCategories, getOrCreateCategory, Category } from "@/lib/pluto/db/categories";
import { getAllOpenMonthlyPeriods, MonthlyPeriod } from "@/lib/pluto/db/months";
import { getBudgets, BudgetItem } from "@/lib/pluto/db/budget";
import ChecklistCard from "@/components/pluto/ChecklistCard";
import {
  getChecklistItemsByMonth,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItemCompletion,
  ChecklistItem,
  ChecklistItemInput,
} from "@/lib/pluto/db/checklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseErrorMessage } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import BudgetOverflowModal from "@/components/pluto/BudgetOverflowModal";
import { checkGlobalBudgetOverflow, BudgetOverflowResult } from "@/lib/pluto/checklist-budget";
import { getGlobalChecklistItems } from "@/lib/pluto/db/checklist";
import { adjustBudgetItem } from "@/lib/pluto/db/budget";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export default function TransactionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);

  const [userEmail, setUserEmail] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [openMonths, setOpenMonths] = useState<MonthlyPeriod[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [globalChecklistItems, setGlobalChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Budget Overflow Modal State
  const [isOverflowModalOpen, setIsOverflowModalOpen] = useState<boolean>(false);
  const [overflowData, setOverflowData] = useState<BudgetOverflowResult & {
    categoryType: "receita" | "despesa";
    operationLabel: string;
    pendingOperation: {
      type: "create" | "edit";
      input: ChecklistItemInput;
      isGlobal: boolean;
      itemId?: string;
      updateGlobal?: boolean;
      parentId?: string | null;
    } | null;
  } | null>(null);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setErrorMsg(null);
      if (user?.email) {
        setUserEmail(user.email);
      }

      // Buscar todos os períodos abertos no banco
      const allOpen = await getAllOpenMonthlyPeriods(supabase);
      const years = Array.from(new Set(allOpen.map((p) => p.year))).sort((a, b) => a - b);
      setAvailableYears(years);

      if (years.length === 0) {
        setOpenMonths([]);
        setTransactions([]);
        setBudgetItems([]);
        setLoading(false);
        return;
      }

      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[0]);
      }

      const yearToUse = years.includes(selectedYear) ? selectedYear : years[0];
      const openMonthsForYear = allOpen.filter((p) => p.year === yearToUse);
      setOpenMonths(openMonthsForYear);

      if (openMonthsForYear.length > 0 && !openMonthsForYear.some((p) => p.month === selectedMonth)) {
        setSelectedMonth(openMonthsForYear[0].month);
      }

      const monthToFetch =
        openMonthsForYear.length > 0 && openMonthsForYear.some((p) => p.month === selectedMonth)
          ? selectedMonth
          : openMonthsForYear[0]?.month ?? selectedMonth;

      const activeMonthPeriod = openMonthsForYear.find((p) => p.month === monthToFetch);

      const [txsData, accsData, catsData, budgetData, chkData, globalChkData] = await Promise.all([
        getTransactionsByMonth(supabase, yearToUse, monthToFetch),
        getAccounts(supabase),
        getCategories(supabase),
        getBudgets(supabase, yearToUse, monthToFetch).catch(() => []),
        activeMonthPeriod?.id
          ? getChecklistItemsByMonth(supabase, activeMonthPeriod.id).catch(() => [])
          : Promise.resolve([]),
        getGlobalChecklistItems(supabase).catch(() => []),
      ]);

      setTransactions(txsData || []);
      setAccounts(accsData || []);
      setCategories(catsData || []);
      setBudgetItems(budgetData || []);
      setChecklistItems(chkData || []);
      setGlobalChecklistItems(globalChkData || []);
    } catch (err: unknown) {
      console.error("Erro ao carregar lançamentos:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedYear, selectedMonth, setSelectedYear, setSelectedMonth]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  // Delimitadores do Date Input para travar dentro do Mês e Ano selecionados
  const minDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const maxDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
    lastDayOfMonth
  ).padStart(2, "0")}`;

  // Processamento de Categorias de Receita e Despesa para a Área Orçado vs Real
  const receitasBudgetCats = budgetItems.filter((b) => b.category_type === "receita");
  const despesasBudgetCats = budgetItems.filter((b) => b.category_type === "despesa");

  // Garantir que categorias com transações registradas mas sem orçamento também apareçam
  const receitaCatMap = new Map<string, { category_name: string; previsto: number; real: number }>();
  receitasBudgetCats.forEach((b) => {
    receitaCatMap.set(b.category_name.toLowerCase(), {
      category_name: b.category_name,
      previsto: Number(b.amount),
      real: 0,
    });
  });

  const despesaCatMap = new Map<string, { category_name: string; previsto: number; real: number }>();
  despesasBudgetCats.forEach((b) => {
    despesaCatMap.set(b.category_name.toLowerCase(), {
      category_name: b.category_name,
      previsto: Number(b.amount),
      real: 0,
    });
  });

  // Calcular o Valor Real de cada categoria a partir das transações
  transactions.forEach((tx) => {
    const catName = tx.category_name || "Sem categoria";
    const key = catName.toLowerCase();
    if (tx.type === "receita") {
      const existing = receitaCatMap.get(key) || {
        category_name: catName,
        previsto: 0,
        real: 0,
      };
      existing.real += Number(tx.amount);
      receitaCatMap.set(key, existing);
    } else {
      const existing = despesaCatMap.get(key) || {
        category_name: catName,
        previsto: 0,
        real: 0,
      };
      if (tx.is_refund) {
        existing.real -= Number(tx.amount);
      } else {
        existing.real += Number(tx.amount);
      }
      despesaCatMap.set(key, existing);
    }
  });

  const receitaRows = Array.from(receitaCatMap.values());
  const despesaRows = Array.from(despesaCatMap.values());

  const totalReceitaPrevisto = receitaRows.reduce((acc, r) => acc + r.previsto, 0);
  const totalReceitaReal = receitaRows.reduce((acc, r) => acc + r.real, 0);

  const totalDespesaPrevisto = despesaRows.reduce((acc, r) => acc + r.previsto, 0);
  const totalDespesaReal = despesaRows.reduce((acc, r) => acc + r.real, 0);

  const saldoMes = totalReceitaReal - totalDespesaReal;

  // Estruturação do Grid de Contas e Cartões (unindo contas existentes e lançamentos)
  const allAccountsMap = new Map<string, { account: Account; txs: TransactionWithDetails[] }>();

  accounts.forEach((acc) => {
    allAccountsMap.set(acc.name.toLowerCase(), {
      account: acc,
      txs: [],
    });
  });

  transactions.forEach((tx) => {
    const accName = tx.account_name || "Sem Conta";
    const key = accName.toLowerCase();
    const existing = allAccountsMap.get(key);
    if (existing) {
      existing.txs.push(tx);
    } else {
      allAccountsMap.set(key, {
        account: { id: tx.account_id, name: accName, type: "conta" },
        txs: [tx],
      });
    }
  });

  const accountCardsList = Array.from(allAccountsMap.values());
  accountCardsList.forEach((card) => {
    card.txs.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.id || "").localeCompare(b.id || "");
    });
  });

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

  // Abertura do Modal de Exclusão
  const handleOpenDeleteModal = (tx: TransactionWithDetails) => {
    setDeletingTransaction(tx);
    setErrorMsg(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;
    setDeletingTx(true);
    setErrorMsg(null);

    try {
      await deleteTransaction(supabase, deletingTransaction.id);
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

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      setErrorMsg("Digite o nome da conta ou cartão.");
      return;
    }

    setSavingAcc(true);
    setErrorMsg(null);

    try {
      await getOrCreateAccount(supabase, newAccName.trim(), userEmail, newAccType);
      setIsAccModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao salvar conta:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setSavingAcc(false);
    }
  };

  const handleToggleChecklistItem = async (id: string, isCompleted: boolean) => {
    try {
      await toggleChecklistItemCompletion(supabase, id, isCompleted);
      setChecklistItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_completed: isCompleted } : item))
      );
    } catch (err) {
      console.error("Erro ao alterar conclusão do item:", err);
    }
  };

  const handleAddChecklistItem = async (input: ChecklistItemInput, isGlobal: boolean) => {
    if (isGlobal && input.amount !== null && input.amount !== undefined) {
      const overflowResult = checkGlobalBudgetOverflow(
        globalChecklistItems,
        budgetItems,
        input.category_id,
        input.amount
      );
      if (overflowResult.isOverflow) {
        const category = categories.find((c) => c.id === input.category_id);
        setOverflowData({
          ...overflowResult,
          categoryType: category?.type || "despesa",
          operationLabel: "incluir",
          pendingOperation: {
            type: "create",
            input,
            isGlobal: true,
          },
        });
        setIsOverflowModalOpen(true);
        return;
      }
    }

    const activeMonthPeriod = openMonths.find((p) => p.month === selectedMonth);
    await createChecklistItem(supabase, input, isGlobal, activeMonthPeriod?.id);
    await fetchData();
  };

  const handleEditChecklistItem = async (
    id: string,
    input: Partial<ChecklistItemInput>,
    updateGlobal: boolean,
    parentId?: string | null
  ) => {
    if (updateGlobal && input.amount !== undefined && input.amount !== null) {
      const originalItem = globalChecklistItems.find((item) => item.id === id) || 
                           checklistItems.find((item) => item.id === id);
      const targetCategoryId = input.category_id || originalItem?.category_id;
      const targetAmount = input.amount !== undefined ? input.amount : originalItem?.amount;

      if (targetCategoryId && targetAmount !== undefined && targetAmount !== null && originalItem) {
        const overflowResult = checkGlobalBudgetOverflow(
          globalChecklistItems,
          budgetItems,
          targetCategoryId,
          targetAmount,
          id // exclude the item being edited
        );
        if (overflowResult.isOverflow) {
          const category = categories.find((c) => c.id === targetCategoryId);
          setOverflowData({
            ...overflowResult,
            categoryType: category?.type || "despesa",
            operationLabel: "alterar",
            pendingOperation: {
              type: "edit",
              input: {
                day: input.day ?? originalItem.day,
                description: input.description ?? originalItem.description,
                type: input.type ?? originalItem.type,
                category_id: targetCategoryId,
                amount: targetAmount,
                created_by: userEmail,
              },
              isGlobal: true,
              itemId: id,
              updateGlobal: updateGlobal ?? false,
              parentId,
            },
          });
          setIsOverflowModalOpen(true);
          return;
        }
      }
    }

    await updateChecklistItem(supabase, id, input, updateGlobal, parentId);
    await fetchData();
  };

  const handleDeleteChecklistItem = async (
    id: string,
    deleteGlobal: boolean,
    parentId?: string | null
  ) => {
    await deleteChecklistItem(supabase, id, deleteGlobal, parentId);
    await fetchData();
  };

  const handleOverflowConfirm = async (newBudgetValue: number) => {
    if (!overflowData?.pendingOperation) return;

    const { pendingOperation } = overflowData;
    const category = categories.find((c) => c.id === overflowData.categoryId);

    try {
      await adjustBudgetItem(
        supabase,
        selectedYear,
        selectedMonth,
        category?.name || "",
        overflowData.categoryType,
        newBudgetValue,
        userEmail
      );

      if (pendingOperation.type === "create") {
        const activeMonthPeriod = openMonths.find((p) => p.month === selectedMonth);
        await createChecklistItem(supabase, pendingOperation.input, true, activeMonthPeriod?.id);
      } else if (pendingOperation.type === "edit" && pendingOperation.itemId) {
        await updateChecklistItem(
          supabase,
          pendingOperation.itemId,
          pendingOperation.input,
          pendingOperation.updateGlobal ?? false,
          pendingOperation.parentId
        );
      }

      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao confirmar ajuste de orçamento:", err);
      setErrorMsg(parseErrorMessage(err));
    }
  };

  const handleOverflowCancel = () => {
    setIsOverflowModalOpen(false);
    setOverflowData(null);
  };

  const handleTriggerTransactionModalFromChecklist = (prefill: {
    description: string;
    amount?: number | null;
    type: "receita" | "despesa";
    category_id: string;
    date: string;
  }) => {
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
        supabase,
        accountInput,
        userEmail,
        accountTypeInput
      );
      const categoryId = await getOrCreateCategory(supabase, categoryInput, type, userEmail);

      if (editingTransaction) {
        await updateTransaction(
          supabase,
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
          supabase,
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
        supabase,
        accountInput,
        userEmail,
        accountTypeInput
      );
      const categoryId = await getOrCreateCategory(supabase, categoryInput, type, userEmail);

      await createTransaction(
        supabase,
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

  const content = (
    <>
      {/* Seletores de Ano/Mês */}
      <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {availableYears.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Label htmlFor="year-select" className="text-xs font-semibold">
                Ano:
              </Label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded border p-1.5 bg-card text-card-foreground text-sm font-medium"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {openMonths.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Label htmlFor="month-select" className="text-xs font-semibold">
                Mês:
              </Label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded border p-1.5 bg-card text-card-foreground text-sm font-medium"
              >
                {openMonths.map((p) => (
                  <option key={p.month} value={p.month}>
                    {MONTH_NAMES[p.month - 1]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Card de Checklist de Contas a Pagar / Receber */}
      <ChecklistCard
        items={checklistItems}
        categories={categories}
        budgetItems={budgetItems}
        isMonthOpen={openMonths.some((p) => p.month === selectedMonth && p.status === "aberto")}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        userEmail={userEmail}
        onToggleItem={handleToggleChecklistItem}
        onAddItem={handleAddChecklistItem}
        onEditItem={handleEditChecklistItem}
        onDeleteItem={handleDeleteChecklistItem}
        onTriggerTransactionModal={handleTriggerTransactionModalFromChecklist}
      />

      {/* Alerta de erro */}
      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200">
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {availableYears.length > 0 && (
        <div
          className={`mt-4 flex items-center justify-between p-3 rounded-lg border ${
            saldoMes >= 0 ? "border-success-border bg-success-soft" : "border-danger-border bg-danger-soft"
          }`}
        >
          <span className="text-sm font-bold text-muted-foreground">💰 Saldo do Mês</span>
          <span className={`text-lg font-bold ${saldoMes >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(saldoMes)}
          </span>
        </div>
      )}

      {/* Mensagem caso nenhum mês esteja aberto */}
      {!loading && availableYears.length === 0 && (
        <div className="rounded-lg border p-8 text-center bg-card text-card-foreground flex flex-col items-center gap-3">
          <p className="text-muted-foreground">
            Nenhum mês está <strong className="text-emerald-600 dark:text-emerald-400">Aberto</strong> para lançamentos.
          </p>
          <Link href="/pluto/months">
            <Button variant="outline">Ir para Gestão de Meses e Períodos 📅</Button>
          </Link>
        </div>
      )}

      {/* Conteúdo Principal do Mês Aberto */}
      {availableYears.length > 0 && openMonths.length > 0 && (
        <>
          {/* ========================================================================= */}
          {/* 1. ÁREA SUPERIOR: COMPARATIVO ORÇADO VS REAL (RECEITAS E DESPESAS)         */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tabela de Receitas (Esquerda) */}
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
                <div className="bg-success-soft p-3 border-b border-success-border flex items-center justify-between">
<h3 className="font-bold text-sm text-[#35472D] font-['CaesarDressing'] tracking-wider">
                      📈 Receitas
                    </h3>
                  <div className="text-xs text-success font-bold">
                    Real: {formatCurrency(totalReceitaReal)}
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/40 text-[#35472D] text-xs font-['CaesarDressing'] tracking-wider">
                        <th className="p-2.5">Categoria</th>
                        <th className="p-2.5 text-right">Previsto</th>
                        <th className="p-2.5 text-right">Real</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receitaRows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-xs text-muted-foreground">
                            Nenhuma categoria de receita cadastrada.
                          </td>
                        </tr>
                      ) : (
                        receitaRows.map((r, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/20 text-xs">
                            <td className="p-2.5 font-medium">{r.category_name}</td>
                            <td className="p-2.5 text-right text-muted-foreground">
                              {formatCurrency(r.previsto)}
                            </td>
                            <td className="p-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                              {formatCurrency(r.real)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/50 font-bold text-xs">
                        <td className="p-2.5">Total Receitas</td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {formatCurrency(totalReceitaPrevisto)}
                        </td>
                        <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(totalReceitaReal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Tabela de Despesas (Direita) */}
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col">
                <div className="bg-danger-soft p-3 border-b border-danger-border flex items-center justify-between">
<h3 className="font-bold text-sm text-[#35472D] font-['CaesarDressing'] tracking-wider">
                      📉 Despesas
                    </h3>
                  <div className="text-xs text-danger font-bold">
                    Real: {formatCurrency(totalDespesaReal)}
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/40 text-[#35472D] text-xs font-['CaesarDressing'] tracking-wider">
                        <th className="p-2.5">Categoria</th>
                        <th className="p-2.5 text-right">Previsto</th>
                        <th className="p-2.5 text-right">Real</th>
                      </tr>
                    </thead>
                    <tbody>
                      {despesaRows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-xs text-muted-foreground">
                            Nenhuma categoria de despesa cadastrada.
                          </td>
                        </tr>
                      ) : (
                        despesaRows.map((d, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/20 text-xs">
                            <td className="p-2.5 font-medium">{d.category_name}</td>
                            <td className="p-2.5 text-right text-muted-foreground">
                              {formatCurrency(d.previsto)}
                            </td>
                            <td className="p-2.5 text-right font-semibold text-rose-700 dark:text-rose-300">
                              {formatCurrency(d.real)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/50 font-bold text-xs">
                        <td className="p-2.5">Total Despesas</td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {formatCurrency(totalDespesaPrevisto)}
                        </td>
                        <td className="p-2.5 text-right text-rose-700 dark:text-rose-300">
                          {formatCurrency(totalDespesaReal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. ÁREA INFERIOR: CONTAS E CARTÕES (GRID DE 2 COLUNAS)                   */}
          {/* ========================================================================= */}
          <div className="flex flex-col gap-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-['CaesarDressing'] text-[#35472D] tracking-wider">Contas e Cartões</h2>
              <Button onClick={handleOpenAccModal} variant="outline" size="sm">
                + Nova Conta / Cartão
              </Button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm font-['CaesarDressing'] text-[#35472D] tracking-wider">
                Carregando contas e lançamentos...
              </div>
            ) : accountCardsList.length === 0 ? (
              <div className="rounded-lg border bg-card p-8 text-center text-sm font-['CaesarDressing'] text-[#35472D] tracking-wider shadow-sm flex flex-col items-center gap-2">
                <p>Nenhuma conta ou cartão cadastrado ainda.</p>
                <Button onClick={handleOpenAccModal} size="sm" className="font-['CaesarDressing'] tracking-wider">
                  + Cadastrar Primeira Conta ou Cartão
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {accountCardsList.map(({ account, txs }) => {
                  const accountTotal = txs.reduce((acc, t) => {
                    if (t.type === "receita" || t.is_refund) return acc + Number(t.amount);
                    return acc - Number(t.amount);
                  }, 0);

                  const isCard = account.type === "cartao";

                  return (
                    <div
                      key={account.id || account.name}
                      className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col"
                    >
                      {/* Cabeçalho da Conta (sem botão de transação) */}
                      <div className="bg-muted/40 p-3 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{isCard ? "💳" : "🏦"}</span>
                          <h3 className="font-['CaesarDressing'] text-[#35472D] text-sm tracking-wider">{account.name}</h3>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-['CaesarDressing'] uppercase tracking-wider ${
                            isCard
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-[#35472D]/10 text-[#35472D]"
                          }`}
                          >
                            {isCard ? "Cartão" : "Conta"}
                          </span>
                        </div>
                        <div className="text-xs font-bold">
                          <span
                            className={
                              accountTotal >= 0
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-rose-700 dark:text-rose-300"
                            }
                          >
                            {formatCurrency(accountTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Tabela de Transações */}
                      <div className="overflow-x-auto flex-1">
                        {txs.length === 0 ? (
                          <div className="p-6 text-center text-xs font-['CaesarDressing'] text-[#35472D] tracking-wider">
                            Nenhum lançamento nesta conta no mês de {MONTH_NAMES[selectedMonth - 1]}.
                          </div>
                        ) : (
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr className="border-b bg-muted/20 text-[#35472D] text-xs font-['CaesarDressing'] tracking-wider">
                                <th className="p-2.5">Data</th>
                                <th className="p-2.5">Descrição</th>
                                <th className="p-2.5">Categoria</th>
                                <th className="p-2.5 text-right">Valor</th>
                                <th className="p-2.5 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txs.map((tx) => (
                                <tr key={tx.id} className="border-b hover:bg-muted/20 transition-colors">
                                  <td className="p-2.5 font-medium text-xs whitespace-nowrap">
                                    {formatDateBR(tx.date)}
                                  </td>
                                  <td className="p-2.5 text-xs">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-medium">{tx.description}</span>
                                      {tx.is_refund && (
                                        <span className="rounded bg-sky-100 text-sky-800 text-[10px] font-semibold px-1.5 py-0.5 dark:bg-sky-950 dark:text-sky-300">
                                          Reembolso
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-xs text-muted-foreground">
                                    {tx.category_name}
                                  </td>
                                  <td
                                    className={`p-2.5 text-xs text-right font-semibold whitespace-nowrap ${
                                      tx.type === "receita" || tx.is_refund
                                        ? "text-emerald-700 dark:text-emerald-300"
                                        : "text-rose-700 dark:text-rose-300"
                                    }`}
                                  >
                                    {tx.type === "receita" || tx.is_refund ? "+" : "-"} {formatCurrency(Number(tx.amount))}
                                  </td>
                                  <td className="p-2.5 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(tx)}
                                        aria-label={`Editar lançamento ${tx.description}`}
                                        title="Editar lançamento"
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDeleteModal(tx)}
                                        aria-label={`Excluir lançamento ${tx.description}`}
                                        title="Excluir lançamento"
                                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Rodapé do Extrato com o botão + Nova Transação */}
                      <div className="p-2.5 bg-muted/20 border-t flex justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenTxModal(account)}
                          className="h-8 text-xs font-['CaesarDressing'] w-full sm:w-auto tracking-wider"
                        >
                          + Nova Transação
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DEDICADO PARA NOVA CONTA / CARTÃO                                 */}
      {/* ========================================================================= */}
      {isAccModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
            <h2 className="text-lg font-bold tracking-tight">Nova Conta / Cartão</h2>

            <form onSubmit={handleSaveAccount} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-name" className="text-xs font-semibold">
                  Nome da Conta / Cartão
                </Label>
                <Input
                  id="acc-name"
                  type="text"
                  placeholder="Ex: Itaú Corrente, Cartão Nubank"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-type" className="text-xs font-semibold">
                  Tipo
                </Label>
                <select
                  id="acc-type"
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as "conta" | "cartao")}
                  className="rounded border p-2 bg-background text-foreground text-sm font-medium"
                >
                  <option value="conta">Conta</option>
                  <option value="cartao">Cartão</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAccModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingAcc}>
                  {savingAcc ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LANÇAMENTO DE TRANSAÇÃO (COM CONTA PRÉ-FIXADA)                   */}
      {/* ========================================================================= */}
      {isTxModalOpen && (
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

            <form onSubmit={handleSaveTransaction} className="flex flex-col gap-4">
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
                  onChange={(e) => setDate(e.target.value)}
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
                    onChange={(e) => setAccountInput(e.target.value)}
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
                    onChange={(e) => setAccountInput(e.target.value)}
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
                  onChange={(e) => setDescription(e.target.value)}
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
                    onChange={(e) => setType(e.target.value as "receita" | "despesa")}
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
                    onChange={(e) => setAmount(e.target.value)}
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
                    onChange={(e) => setIsRefund(e.target.checked)}
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
                  onChange={(e) => setCategoryInput(e.target.value)}
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
                  onClick={() => {
                    setIsTxModalOpen(false);
                    setEditingTransaction(null);
                  }}
                >
                  Cancelar
                </Button>
                {!editingTransaction && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveTransactionAndAddAnother}
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO DE TRANSAÇÃO                              */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && deletingTransaction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
            <h2 className="text-lg font-bold tracking-tight text-rose-700 dark:text-rose-300">
              Excluir lançamento
            </h2>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir o lançamento{" "}
              <strong className="text-foreground">{deletingTransaction.description}</strong> no valor de{" "}
              <strong className="text-foreground">{formatCurrency(Number(deletingTransaction.amount))}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingTransaction(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={deletingTx}
                onClick={handleConfirmDelete}
                className="bg-rose-500/90 hover:bg-rose-600 text-white font-medium shadow-sm border-none transition-colors"
              >
                {deletingTx ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Overflow Modal */}
      {isOverflowModalOpen && overflowData && (
        <BudgetOverflowModal
          isOpen={isOverflowModalOpen}
          overflowData={{
            categoryId: overflowData.categoryId,
            categoryName: overflowData.categoryName,
            categoryType: overflowData.categoryType,
            totalChecklist: overflowData.totalChecklist,
            budgetAmount: overflowData.budgetAmount,
            operationLabel: overflowData.operationLabel,
          }}
          month={selectedMonth}
          userEmail={userEmail}
          onConfirm={handleOverflowConfirm}
          onCancel={handleOverflowCancel}
        />
      )}
    </>
  );

  return (
    <PlutoLayout pageTitle="Lançamentos" pageSubtitle="Registre e gerencie suas transações financeiras.">
      {content}
    </PlutoLayout>
  );
}
