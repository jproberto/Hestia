import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import TransactionsPage from "@/app/finance/transactions/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getTransactionsByMonth, createTransaction } from "@/lib/db/transactions";
import { getAccounts, getOrCreateAccount } from "@/lib/db/accounts";
import { getCategories, getOrCreateCategory } from "@/lib/db/categories";
import { getMonthlyPeriods, getAllOpenMonthlyPeriods } from "@/lib/db/months";
import { getBudgets } from "@/lib/db/budget";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } }),
    },
  }),
}));

vi.mock("@/lib/db/transactions", () => ({
  getTransactionsByMonth: vi.fn(),
  createTransaction: vi.fn(),
}));

vi.mock("@/lib/db/accounts", () => ({
  getAccounts: vi.fn(),
  getOrCreateAccount: vi.fn(),
}));

vi.mock("@/lib/db/categories", () => ({
  getCategories: vi.fn(),
  getOrCreateCategory: vi.fn(),
}));

vi.mock("@/lib/db/months", () => ({
  getMonthlyPeriods: vi.fn(),
  getAllOpenMonthlyPeriods: vi.fn(),
}));

vi.mock("@/lib/db/budget", () => ({
  getBudgets: vi.fn(),
}));

describe("Página de Cadastro de Transações /finance/transactions", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("deve renderizar os cabeçalhos de Receitas, Despesas e a seção de Contas e Cartões", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getBudgets as Mock).mockResolvedValue([
      { category_id: "c1", category_name: "Alimentação", category_type: "despesa", amount: 1000, start_month: 1 },
      { category_id: "c2", category_name: "Salário", category_type: "receita", amount: 5000, start_month: 1 },
    ]);
    (getTransactionsByMonth as Mock).mockResolvedValue([
      {
        id: "t1",
        description: "Supermercado",
        amount: 200,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_name: "Alimentação",
        account_name: "Itaú Corrente",
        created_by: "teste@hestia.com",
      },
    ]);
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú Corrente" }]);
    (getCategories as Mock).mockResolvedValue([{ id: "c1", name: "Alimentação", type: "despesa" }]);

    render(<TransactionsPage />);

    expect(await screen.findByText("Lançamentos")).toBeInTheDocument();
    expect(screen.getByText(/^📈 Receitas$/i)).toBeInTheDocument();
    expect(screen.getByText(/^📉 Despesas$/i)).toBeInTheDocument();
    expect(screen.getByText("Contas e Cartões")).toBeInTheDocument();
    expect(screen.getByText("Itaú Corrente")).toBeInTheDocument();
    expect(screen.getByText("Supermercado")).toBeInTheDocument();
  });

  it("deve abrir o modal de nova conta/cartão e permitir criar um lançamento", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getTransactionsByMonth as Mock).mockResolvedValue([]);
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú Corrente" }]);
    (getCategories as Mock).mockResolvedValue([{ id: "c1", name: "Alimentação", type: "despesa" }]);
    (getOrCreateAccount as Mock).mockResolvedValue("a1");
    (getOrCreateCategory as Mock).mockResolvedValue("c1");
    (createTransaction as Mock).mockResolvedValue({
      id: "t2",
      description: "Salário",
      amount: 5000,
      type: "receita",
      is_refund: false,
      date: "2026-03-01",
      category_name: "Salário",
      account_name: "Itaú Corrente",
    });

    render(<TransactionsPage />);

    const newAccountBtn = await screen.findByRole("button", { name: /\+ Nova Conta \/ Cartão/i });
    fireEvent.click(newAccountBtn);

    expect(screen.getByText("Novo Lançamento / Conta")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Salário" } });
    fireEvent.change(screen.getByLabelText(/Valor/i), { target: { value: "5000" } });
    fireEvent.change(screen.getByPlaceholderText(/Selecione ou digite para criar nova conta/i), { target: { value: "Itaú Corrente" } });
    fireEvent.change(screen.getByPlaceholderText(/Selecione ou digite para criar nova categoria/i), { target: { value: "Salário" } });

    const submitBtn = screen.getByRole("button", { name: /Salvar Transação/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalled();
    });
  });
});
