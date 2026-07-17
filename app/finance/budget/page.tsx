"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getBudgetAdjustment,
  initBudget,
  getBudgets,
  adjustBudgetItem,
  getBudgetAdjustments,
  createBudgetAdjustment,
  BudgetAdjustment,
  BudgetItem
} from "@/lib/db/budget";
import { getCategories, Category } from "@/lib/db/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BudgetPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [adjustments, setAdjustments] = useState<BudgetAdjustment[]>([]);
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);
  const [activeAdjustment, setActiveAdjustment] = useState<BudgetAdjustment | null>(null);
  const [revision, setRevision] = useState<BudgetAdjustment | null>(null);
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
  const searchParams = useSearchParams();

  // Obter o mês corrente de forma segura (suportando mockMonth em desenvolvimento e testes)
  const getOpenMonth = useCallback(() => {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      const mockMonthParam = searchParams.get("mockMonth");
      if (mockMonthParam) {
        const parsed = parseInt(mockMonthParam, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
          return parsed;
        }
      }
    }
    return new Date().getMonth() + 1;
  }, [searchParams]);

  const openMonth = getOpenMonth();
  const isEditable = activeAdjustment ? activeAdjustment.start_month === openMonth : false;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      // Busca a revisão de Janeiro para saber se o orçamento anual foi iniciado
      const activeRevision = await getBudgetAdjustment(supabase, year);
      setRevision(activeRevision);

      if (activeRevision) {
        const adjs = await getBudgetAdjustments(supabase, year);
        setAdjustments(adjs);

        let currentAdj: BudgetAdjustment | null = null;
        if (selectedAdjustmentId) {
          currentAdj = adjs.find((a) => a.id === selectedAdjustmentId) || null;
        }

        if (!currentAdj && adjs.length > 0) {
          currentAdj = adjs[adjs.length - 1];
          setSelectedAdjustmentId(currentAdj.id);
        }

        setActiveAdjustment(currentAdj);

        if (currentAdj) {
          const [items, cats] = await Promise.all([
            getBudgets(supabase, year, currentAdj.start_month),
            getCategories(supabase)
          ]);
          setBudgets(items);
          setCategories(cats);
        } else {
          setBudgets([]);
          setCategories([]);
        }
      } else {
        setAdjustments([]);
        setActiveAdjustment(null);
        setBudgets([]);
        setCategories([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, selectedAdjustmentId, supabase]);



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

  async function handleCreateAdjustment() {
    if (!userEmail) return;
    setLoading(true);
    try {
      const newId = await createBudgetAdjustment(supabase, year, openMonth, userEmail);
      setSelectedAdjustmentId(newId);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!revision || !activeAdjustment || !categoryName || !amount || !userEmail) return;

    try {
      await adjustBudgetItem(
        supabase,
        year,
        activeAdjustment.start_month,
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
      if (!userEmail || !activeAdjustment) return;
      await adjustBudgetItem(
        supabase,
        year,
        activeAdjustment.start_month,
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

  const revenues = budgets.filter((b) => b.category_type === "receita" && b.amount > 0);
  const expenses = budgets.filter((b) => b.category_type === "despesa" && b.amount > 0);

  const totalRevenues = revenues.reduce((acc, cur) => acc + cur.amount, 0);
  const totalExpenses = expenses.reduce((acc, cur) => acc + cur.amount, 0);
  const netBudget = totalRevenues - totalExpenses;

  const suggestions = categories.filter(
    (c) =>
      c.type === categoryType &&
      c.name.toLowerCase().includes(categoryName.toLowerCase()) &&
      c.name.toLowerCase() !== categoryName.toLowerCase()
  );

  const hasCurrentMonthAdjustment = adjustments.some((a) => a.start_month === openMonth);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamento Anual</h1>
          <p className="text-sm text-muted-foreground">Planeje suas metas financeiras para o ano.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="adjustment-select">Ajuste:</Label>
          <select
            id="adjustment-select"
            value={selectedAdjustmentId || ""}
            onChange={(e) => setSelectedAdjustmentId(e.target.value)}
            className="rounded border p-1 bg-card text-card-foreground text-sm"
          >
            {adjustments.map((adj) => {
              const label = adj.start_month === 1
                ? `Orçamento Inicial ${adj.year}`
                : adj.description;
              return (
                <option key={adj.id} value={adj.id}>
                  {label}
                </option>
              );
            })}
          </select>

          <Label htmlFor="year-select" className="ml-2">Ano:</Label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => {
              setYear(parseInt(e.target.value));
              setSelectedAdjustmentId(null);
            }}
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Previsões Cadastradas</h2>
            </div>
            <div className="flex items-center gap-2">
              {!hasCurrentMonthAdjustment && !isEditable && (
                <Button onClick={handleCreateAdjustment} variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                  Criar Novo Ajuste
                </Button>
              )}
              {isEditable && (
                <Button onClick={() => setShowForm(!showForm)}>
                  {showForm ? "Fechar" : "Adicionar Previsão"}
                </Button>
              )}
            </div>
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
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSaveInline(b.category_id, b.category_name, b.category_type);
                                  } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    e.stopPropagation();
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
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSaveInline(b.category_id, b.category_name, b.category_type);
                                  } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    e.stopPropagation();
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

