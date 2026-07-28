"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  getTransactionsByMonth,
  createTransaction,
  TransactionWithDetails,
} from "@/lib/db/transactions";
import { getAccounts, getOrCreateAccount, Account } from "@/lib/db/accounts";
import { getCategories, getOrCreateCategory, Category } from "@/lib/db/categories";
import { getMonthlyPeriods, MonthlyPeriod } from "@/lib/db/months";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseErrorMessage } from "@/lib/utils";

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
  const supabase = createClient();
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);

  const [userEmail, setUserEmail] = useState<string>("");
  const [openMonths, setOpenMonths] = useState<MonthlyPeriod[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const [isRefund, setIsRefund] = useState<boolean>(false);
  const [date, setDate] = useState<string>("");
  const [accountInput, setAccountInput] = useState<string>("");
  const [categoryInput, setCategoryInput] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      // Buscar períodos abertos do ano selecionado
      const periods = await getMonthlyPeriods(supabase, selectedYear);
      const openPeriods = periods.filter((p) => p.status === "aberto");
      setOpenMonths(openPeriods);

      // Se o mês selecionado não estiver aberto mas houver meses abertos, ajusta para o primeiro aberto
      let monthToFetch = selectedMonth;
      if (openPeriods.length > 0 && !openPeriods.some((p) => p.month === selectedMonth)) {
        monthToFetch = openPeriods[0].month;
        setSelectedMonth(monthToFetch);
      }

      const [txsData, accsData, catsData] = await Promise.all([
        getTransactionsByMonth(supabase, selectedYear, monthToFetch),
        getAccounts(supabase),
        getCategories(supabase),
      ]);

      setTransactions(txsData);
      setAccounts(accsData);
      setCategories(catsData);
    } catch (err: unknown) {
      console.error("Erro ao carregar lançamentos:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedYear, selectedMonth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Totais do mês
  const totalReceitas = transactions
    .filter((t) => t.type === "receita")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const despesasNormais = transactions
    .filter((t) => t.type === "despesa" && !t.is_refund)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const estornosDespesa = transactions
    .filter((t) => t.type === "despesa" && t.is_refund)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalSaidas = despesasNormais - estornosDespesa;
  const resultadoMes = totalReceitas - totalSaidas;

  // Delimitadores do Date Input para travar dentro do Mês e Ano selecionados
  const minDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const maxDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
    lastDayOfMonth
  ).padStart(2, "0")}`;

  const handleOpenModal = () => {
    setDate(minDateStr);
    setDescription("");
    setAmount("");
    setType("despesa");
    setIsRefund(false);
    setAccountInput(accounts.length > 0 ? accounts[0].name : "");
    setCategoryInput(categories.length > 0 ? categories[0].name : "");
    setErrorMsg(null);
    setIsModalOpen(true);
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

    setSaving(true);
    setErrorMsg(null);

    try {
      const accountId = await getOrCreateAccount(supabase, accountInput, userEmail);
      const categoryId = await getOrCreateCategory(supabase, categoryInput, type, userEmail);

      await createTransaction(
        supabase,
        {
          description,
          amount: numAmount,
          type,
          is_refund: type === "despesa" ? isRefund : false,
          date,
          account_id: accountId,
          category_id: categoryId,
        },
        userEmail
      );

      setIsModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao salvar a transação:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      {/* Menu Superior Financeiro */}
      <div className="flex border-b pb-1 gap-6">
        <Link
          href="/finance/budget"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Orçamento Anual
        </Link>
        <Link
          href="/finance/months"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Meses e Períodos
        </Link>
        <Link
          href="/finance/transactions"
          className="pb-2 text-sm font-semibold border-b-2 border-primary text-foreground"
        >
          Lançamentos
        </Link>
      </div>

      {/* Header e Seletores */}
      <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Extrato de Lançamentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie entradas, saídas e estornos do período.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="year-select" className="text-xs">Ano:</Label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded border p-1 bg-card text-card-foreground text-sm"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>

          {openMonths.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Label htmlFor="month-select" className="text-xs">Mês:</Label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded border p-1 bg-card text-card-foreground text-sm font-medium"
              >
                {openMonths.map((p) => (
                  <option key={p.month} value={p.month}>
                    {MONTH_NAMES[p.month - 1]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {openMonths.length > 0 && (
            <Button onClick={handleOpenModal} size="sm">
              + Nova Transação
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de erro */}
      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200">
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Mensagem caso nenhum mês esteja aberto */}
      {!loading && openMonths.length === 0 && (
        <div className="rounded-lg border p-8 text-center bg-card text-card-foreground flex flex-col items-center gap-3">
          <p className="text-muted-foreground">
            Nenhum mês está <strong className="text-emerald-600 dark:text-emerald-400">Aberto</strong> para lançamentos no ano de {selectedYear}.
          </p>
          <Link href="/finance/months">
            <Button variant="outline">Ir para Gestão de Meses e Períodos 📅</Button>
          </Link>
        </div>
      )}

      {/* Conteúdo do Mês Aberto */}
      {openMonths.length > 0 && (
        <>
          {/* Cards de Resumo Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 shadow-sm bg-card text-card-foreground">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Entradas
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalReceitas)}
              </p>
            </div>

            <div className="rounded-lg border p-4 shadow-sm bg-card text-card-foreground">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Saídas
              </p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(totalSaidas)}
              </p>
            </div>

            <div className="rounded-lg border p-4 shadow-sm bg-card text-card-foreground">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Resultado do Mês
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  resultadoMes >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrency(resultadoMes)}
              </p>
            </div>
          </div>

          {/* Tabela de Extrato de Lançamentos */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Carregando lançamentos...
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum lançamento registrado neste mês.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                      <th className="p-3">Data</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Conta</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium whitespace-nowrap">
                          {formatDateBR(tx.date)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span>{tx.description}</span>
                            {tx.is_refund && (
                              <span className="rounded bg-sky-100 text-sky-800 text-[10px] font-semibold px-2 py-0.5 dark:bg-sky-950 dark:text-sky-300">
                                Reembolso
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{tx.category_name}</td>
                        <td className="p-3 text-muted-foreground">{tx.account_name}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              tx.type === "receita"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {tx.type === "receita" ? "Receita" : "Despesa"}
                          </span>
                        </td>
                        <td
                          className={`p-3 text-right font-semibold whitespace-nowrap ${
                            tx.type === "receita" || tx.is_refund
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {tx.type === "receita" || tx.is_refund ? "+" : "-"} {formatCurrency(Number(tx.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Formulário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
            <h2 className="text-lg font-bold tracking-tight">Novo Lançamento</h2>

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
                <Label htmlFor="tx-description" className="text-xs font-semibold">
                  Descrição
                </Label>
                <Input
                  id="tx-description"
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
                    className="rounded border p-2 bg-background text-foreground text-sm"
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
                <Label htmlFor="tx-account" className="text-xs font-semibold">
                  Conta
                </Label>
                <Input
                  id="tx-account"
                  type="text"
                  list="accounts-list"
                  placeholder="Selecione ou digite para criar nova conta"
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  required
                />
                <datalist id="accounts-list">
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.name} />
                  ))}
                </datalist>
              </div>

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
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Transação"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
