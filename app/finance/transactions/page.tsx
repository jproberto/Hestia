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

export default function TransactionsPage() {
  const supabase = createClient();
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);

  const [userEmail, setUserEmail] = useState<string>("");
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const [isRefund, setIsRefund] = useState<boolean>(false);
  const [date, setDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`
  );
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

      const [txsData, accsData, catsData] = await Promise.all([
        getTransactionsByMonth(supabase, selectedYear, selectedMonth),
        getAccounts(supabase),
        getCategories(supabase),
      ]);

      setTransactions(txsData);
      setAccounts(accsData);
      setCategories(catsData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Erro ao carregar os lançamentos.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    supabase,
    selectedYear,
    selectedMonth,
    setLoading,
    setErrorMsg,
    setUserEmail,
    setTransactions,
    setAccounts,
    setCategories,
  ]);

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

  const handleOpenModal = () => {
    const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    setDate(defaultDate);
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
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Erro ao salvar a transação.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Navegação por Abas */}
      <nav
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          borderBottom: "1px solid #333",
          paddingBottom: "1rem",
        }}
      >
        <Link
          href="/finance/budget"
          style={{
            padding: "0.5rem 1rem",
            textDecoration: "none",
            color: "#aaa",
            borderRadius: "6px",
          }}
        >
          Metas de Orçamento
        </Link>
        <Link
          href="/finance/months"
          style={{
            padding: "0.5rem 1rem",
            textDecoration: "none",
            color: "#aaa",
            borderRadius: "6px",
          }}
        >
          Meses e Períodos
        </Link>
        <Link
          href="/finance/transactions"
          style={{
            padding: "0.5rem 1rem",
            textDecoration: "none",
            color: "#fff",
            backgroundColor: "#2563eb",
            fontWeight: "bold",
            borderRadius: "6px",
          }}
        >
          Lançamentos
        </Link>
      </nav>

      {/* Header e Seletores */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", margin: 0, color: "#f3f4f6" }}>Extrato de Lançamentos</h1>
          <p style={{ color: "#9ca3af", margin: "0.25rem 0 0 0" }}>
            Gerencie entradas, saídas e estornos de cada período
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              backgroundColor: "#1f2937",
              color: "#fff",
              border: "1px solid #374151",
            }}
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              backgroundColor: "#1f2937",
              color: "#fff",
              border: "1px solid #374151",
            }}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenModal}
            style={{
              padding: "0.5rem 1.25rem",
              backgroundColor: "#10b981",
              color: "#fff",
              fontWeight: "bold",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            + Nova Transação
          </button>
        </div>
      </header>

      {/* Alerta de erro */}
      {errorMsg && (
        <div
          style={{
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Cards de Resumo Financeiro */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "8px",
            padding: "1.25rem",
          }}
        >
          <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Total Entradas</span>
          <h2 style={{ color: "#10b981", fontSize: "1.75rem", margin: "0.5rem 0 0 0" }}>
            R$ {totalReceitas.toFixed(2)}
          </h2>
        </div>

        <div
          style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "8px",
            padding: "1.25rem",
          }}
        >
          <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Total Saídas</span>
          <h2 style={{ color: "#ef4444", fontSize: "1.75rem", margin: "0.5rem 0 0 0" }}>
            R$ {totalSaidas.toFixed(2)}
          </h2>
        </div>

        <div
          style={{
            backgroundColor: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "8px",
            padding: "1.25rem",
          }}
        >
          <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Resultado do Mês</span>
          <h2
            style={{
              color: resultadoMes >= 0 ? "#10b981" : "#ef4444",
              fontSize: "1.75rem",
              margin: "0.5rem 0 0 0",
            }}
          >
            R$ {resultadoMes.toFixed(2)}
          </h2>
        </div>
      </section>

      {/* Tabela de Extrato de Lançamentos */}
      <section
        style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            Carregando lançamentos...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
            Nenhum lançamento registrado neste mês.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#e5e7eb" }}>
            <thead>
              <tr style={{ backgroundColor: "#1f2937", textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Data</th>
                <th style={{ padding: "0.75rem 1rem" }}>Descrição</th>
                <th style={{ padding: "0.75rem 1rem" }}>Categoria</th>
                <th style={{ padding: "0.75rem 1rem" }}>Conta</th>
                <th style={{ padding: "0.75rem 1rem" }}>Tipo</th>
                <th style={{ padding: "0.75rem 1rem" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>{tx.date}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {tx.description}
                    {tx.is_refund && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.75rem",
                          backgroundColor: "#374151",
                          color: "#38bdf8",
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                        }}
                      >
                        Estorno
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>{tx.category_name}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{tx.account_name}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        color: tx.type === "receita" ? "#10b981" : "#ef4444",
                        fontWeight: "bold",
                      }}
                    >
                      {tx.type === "receita" ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontWeight: "bold",
                      color: tx.type === "receita" || tx.is_refund ? "#10b981" : "#ef4444",
                    }}
                  >
                    {tx.type === "receita" || tx.is_refund ? "+" : "-"} R${" "}
                    {Number(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Modal de Formulário */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "#1f2937",
              borderRadius: "8px",
              padding: "2rem",
              width: "100%",
              maxWidth: "500px",
              color: "#fff",
            }}
          >
            <h2 style={{ margin: "0 0 1.5rem 0" }}>Novo Lançamento</h2>

            <form onSubmit={handleSaveTransaction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label htmlFor="tx-date" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Data
                </label>
                <input
                  id="tx-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #374151",
                    backgroundColor: "#111827",
                    color: "#fff",
                  }}
                />
              </div>

              <div>
                <label htmlFor="tx-description" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Descrição
                </label>
                <input
                  id="tx-description"
                  type="text"
                  placeholder="Ex: Supermercado, Salário"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #374151",
                    backgroundColor: "#111827",
                    color: "#fff",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="tx-type" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                    Tipo
                  </label>
                  <select
                    id="tx-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as "receita" | "despesa")}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #374151",
                      backgroundColor: "#111827",
                      color: "#fff",
                    }}
                  >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label htmlFor="tx-amount" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                    Valor (R$)
                  </label>
                  <input
                    id="tx-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #374151",
                      backgroundColor: "#111827",
                      color: "#fff",
                    }}
                  />
                </div>
              </div>

              {type === "despesa" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    id="is_refund"
                    checked={isRefund}
                    onChange={(e) => setIsRefund(e.target.checked)}
                  />
                  <label htmlFor="is_refund" style={{ fontSize: "0.875rem", cursor: "pointer" }}>
                    É um estorno/reembolso? (abate da despesa da categoria)
                  </label>
                </div>
              )}

              <div>
                <label htmlFor="tx-account" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Conta
                </label>
                <input
                  id="tx-account"
                  type="text"
                  list="accounts-list"
                  placeholder="Selecione ou digite para criar nova conta"
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #374151",
                    backgroundColor: "#111827",
                    color: "#fff",
                  }}
                />
                <datalist id="accounts-list">
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="tx-category" style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Categoria
                </label>
                <input
                  id="tx-category"
                  type="text"
                  list="categories-list"
                  placeholder="Selecione ou digite para criar nova categoria"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #374151",
                    backgroundColor: "#111827",
                    color: "#fff",
                  }}
                />
                <datalist id="categories-list">
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name} />
                  ))}
                </datalist>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    border: "1px solid #374151",
                    backgroundColor: "transparent",
                    color: "#aaa",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#10b981",
                    color: "#fff",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {saving ? "Salvando..." : "Salvar Transação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
