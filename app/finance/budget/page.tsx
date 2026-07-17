"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getBudgetRevision,
  initBudget,
  getBudgets,
  adjustBudgetItem,
  BudgetRevision,
  BudgetItem
} from "@/lib/db/budget";
import { getCategories, Category } from "@/lib/db/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default function BudgetPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [revision, setRevision] = useState<BudgetRevision | null>(null);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>("");

  // Form state
  const [showForm, setShowForm] = useState<boolean>(false);
  const [categoryName, setCategoryName] = useState<string>("");
  const [categoryType, setCategoryType] = useState<"receita" | "despesa">("despesa");
  const [amount, setAmount] = useState<string>("");

  // Inline editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<string>("");
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);

  const supabase = createClient();

  // Obter o mês aberto de forma segura (suportando mockMonth em desenvolvimento)
  const getOpenMonth = useCallback(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      const urlParams = new URLSearchParams(window.location.search);
      const mockMonthParam = urlParams.get("mockMonth");
      if (mockMonthParam) {
        const parsed = parseInt(mockMonthParam, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
          return parsed;
        }
      }
    }
    return new Date().getMonth() + 1;
  }, []);

  const openMonth = getOpenMonth();
  const isEditable = month >= openMonth;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      // Busca a revisão de Janeiro para saber se o orçamento anual foi iniciado
      const activeRevision = await getBudgetRevision(supabase, year);
      setRevision(activeRevision);

      if (activeRevision) {
        const [items, cats] = await Promise.all([
          getBudgets(supabase, year, month),
          getCategories(supabase)
        ]);
        setBudgets(items);
        setCategories(cats);
      } else {
        setBudgets([]);
        setCategories([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, month, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleStartBudget() {
    if (!userEmail) return;
    setLoading(true);
    try {
      await initBudget(supabase, year, userEmail);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!revision || !categoryName || !amount || !userEmail) return;

    try {
      await adjustBudgetItem(
        supabase,
        year,
        month,
        categoryName,
        categoryType,
        parseFloat(amount),
        userEmail
      );
      setCategoryName("");
      setAmount("");
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  const handleCellClick = (categoryId: string, currentAmount: number) => {
    if (!isEditable) return;
    setEditingCategoryId(categoryId);
    setTempAmount(currentAmount.toString());
  };

  const handleSaveInline = async (
    categoryId: string,
    categoryName: string,
    categoryType: "receita" | "despesa"
  ) => {
    const value = parseFloat(tempAmount);
    if (isNaN(value) || value < 0) {
      setEditingCategoryId(null);
      return;
    }
    setSavingCategoryId(categoryId);
    try {
      if (!userEmail) return;
      await adjustBudgetItem(
        supabase,
        year,
        month,
        categoryName,
        categoryType,
        value,
        userEmail
      );
      await loadData();
    } catch (err) {
      console.error("Erro ao salvar ajuste inline:", err);
    } finally {
      setSavingCategoryId(null);
      setEditingCategoryId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando orçamento...</p>
      </div>
    );
  }

  // Filtragem que remove os orçamentos zerados da listagem da tabela
  const revenues = budgets.filter((b) => b.category_type === "receita" && b.amount > 0);
  const expenses = budgets.filter((b) => b.category_type === "despesa" && b.amount > 0);

  const totalRevenues = revenues.reduce((acc, cur) => acc + cur.amount, 0);
  const totalExpenses = expenses.reduce((acc, cur) => acc + cur.amount, 0);
  const netBudget = totalRevenues - totalExpenses;

  // Filtrar sugestões de categoria com base no que o usuário digita
  const suggestions = categories.filter(
    (c) =>
      c.type === categoryType &&
      c.name.toLowerCase().includes(categoryName.toLowerCase()) &&
      c.name.toLowerCase() !== categoryName.toLowerCase()
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamento Anual</h1>
          <p className="text-sm text-muted-foreground">Planeje suas metas financeiras para o ano.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="month-select">Mês:</Label>
          <select
            id="month-select"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="rounded border p-1 bg-card text-card-foreground text-sm"
          >
            <option value={1}>Janeiro</option>
            <option value={2}>Fevereiro</option>
            <option value={3}>Março</option>
            <option value={4}>Abril</option>
            <option value={5}>Maio</option>
            <option value={6}>Junho</option>
            <option value={7}>Julho</option>
            <option value={8}>Agosto</option>
            <option value={9}>Setembro</option>
            <option value={10}>Outubro</option>
            <option value={11}>Novembro</option>
            <option value={12}>Dezembro</option>
          </select>

          <Label htmlFor="year-select" className="ml-2">Ano:</Label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded border p-1 bg-card text-card-foreground text-sm"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>
      </div>

      {!revision ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">Nenhum orçamento cadastrado para o ano {year}.</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Crie um orçamento inicial para começar a cadastrar suas receitas e despesas previstas.
          </p>
          <Button onClick={handleStartBudget}>
            Iniciar Orçamento de {year}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 bg-muted/40">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Receitas Previstas</span>
              <p className="text-2xl font-bold text-emerald-600">R$ {totalRevenues.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-4 bg-muted/40">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Despesas Previstas</span>
              <p className="text-2xl font-bold text-rose-600">R$ {totalExpenses.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-4 bg-muted/40">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Saldo Planejado</span>
              <p className={`text-2xl font-bold ${netBudget >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                R$ {netBudget.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Previsões Cadastradas</h2>
              {!isEditable && (
                <p className="text-xs text-rose-500 font-medium mt-0.5">
                  Este mês está fechado para edições orçamentárias.
                </p>
              )}
            </div>
            {isEditable && (
              <Button onClick={() => setShowForm(!showForm)}>
                {showForm ? "Fechar" : "Adicionar Previsão"}
              </Button>
            )}
          </div>

          {showForm && isEditable && (
            <form onSubmit={handleSaveItem} className="flex flex-col gap-4 rounded-lg border p-4 bg-card relative">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="category-type">Tipo</Label>
                  <select
                    id="category-type"
                    value={categoryType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setCategoryType(e.target.value as "receita" | "despesa");
                      setCategoryName("");
                    }}
                    className="rounded border p-2 bg-card text-card-foreground text-sm"
                  >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 relative">
                  <Label htmlFor="category-name">Categoria</Label>
                  <Input
                    id="category-name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ex: Alimentação"
                    required
                    autoComplete="off"
                  />
                  {/* Dropdown de autocompletar simples */}
                  {categoryName && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded border bg-popover shadow-md">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setCategoryName(s.name)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="item-amount">Valor Previsto (Mensal)</Label>
                  <Input
                    id="item-amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ex: 800.00"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button type="submit">Salvar Previsão</Button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-2 gap-8">
            {/* Seção Receitas */}
            <div className="flex flex-col gap-3">
              <h3 className="text-md font-semibold text-emerald-700">Receitas</h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Categoria</th>
                      <th className="p-3 text-right">Valor Planejado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenues.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-muted-foreground">Nenhuma receita planejada.</td>
                      </tr>
                    ) : (
                      revenues.map((b) => (
                        <tr key={b.category_id} className="border-b">
                          <td className="p-3">{b.category_name}</td>
                          <td className="p-3 text-right">
                            {editingCategoryId === b.category_id ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={tempAmount}
                                onChange={(e) => setTempAmount(e.target.value)}
                                onBlur={() => handleSaveInline(b.category_id, b.category_name, b.category_type)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveInline(b.category_id, b.category_name, b.category_type);
                                  } else if (e.key === "Escape") {
                                    setEditingCategoryId(null);
                                  }
                                }}
                                className="w-24 text-right inline-block h-8 p-1 ml-auto"
                                autoFocus
                                disabled={savingCategoryId === b.category_id}
                              />
                            ) : (
                              <span
                                onClick={() => handleCellClick(b.category_id, b.amount)}
                                className={`${
                                  isEditable
                                    ? "cursor-pointer border-b border-dashed border-muted-foreground/60 hover:text-foreground hover:border-foreground"
                                    : "cursor-default"
                                } ${savingCategoryId === b.category_id ? "opacity-50" : ""}`}
                              >
                                R$ {b.amount.toFixed(2)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção Despesas */}
            <div className="flex flex-col gap-3">
              <h3 className="text-md font-semibold text-rose-700">Despesas</h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Categoria</th>
                      <th className="p-3 text-right">Valor Planejado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-muted-foreground">Nenhuma despesa planejada.</td>
                      </tr>
                    ) : (
                      expenses.map((b) => (
                        <tr key={b.category_id} className="border-b">
                          <td className="p-3">{b.category_name}</td>
                          <td className="p-3 text-right">
                            {editingCategoryId === b.category_id ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={tempAmount}
                                onChange={(e) => setTempAmount(e.target.value)}
                                onBlur={() => handleSaveInline(b.category_id, b.category_name, b.category_type)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveInline(b.category_id, b.category_name, b.category_type);
                                  } else if (e.key === "Escape") {
                                    setEditingCategoryId(null);
                                  }
                                }}
                                className="w-24 text-right inline-block h-8 p-1 ml-auto"
                                autoFocus
                                disabled={savingCategoryId === b.category_id}
                              />
                            ) : (
                              <span
                                onClick={() => handleCellClick(b.category_id, b.amount)}
                                className={`${
                                  isEditable
                                    ? "cursor-pointer border-b border-dashed border-muted-foreground/60 hover:text-foreground hover:border-foreground"
                                    : "cursor-default"
                                } ${savingCategoryId === b.category_id ? "opacity-50" : ""}`}
                              >
                                R$ {b.amount.toFixed(2)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

