"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getBudgetRevision,
  initBudget,
  getBudgets,
  addOrUpdateBudgetItem,
  BudgetRevision,
  BudgetItem
} from "@/lib/db/budget";
import { getCategories, Category } from "@/lib/db/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BudgetPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
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

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      const activeRevision = await getBudgetRevision(supabase, year);
      setRevision(activeRevision);

      if (activeRevision) {
        const [items, cats] = await Promise.all([
          getBudgets(supabase, year, 1),
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
  }, [year, supabase]);

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
      await addOrUpdateBudgetItem(
        supabase,
        revision.id,
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando orçamento...</p>
      </div>
    );
  }

  const revenues = budgets.filter((b) => b.category_type === "receita");
  const expenses = budgets.filter((b) => b.category_type === "despesa");

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
          <Label htmlFor="year-select">Ano:</Label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded border p-1"
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
            <h2 className="text-lg font-semibold">Previsões Cadastradas</h2>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Fechar" : "Adicionar Previsão"}
            </Button>
          </div>

          {showForm && (
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
                    className="rounded border p-2"
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
                          <td className="p-3 text-right">R$ {b.amount.toFixed(2)}</td>
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
                          <td className="p-3 text-right">R$ {b.amount.toFixed(2)}</td>
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
