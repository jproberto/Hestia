import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TransactionsPage from "@/app/finance/transactions/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getTransactionsByMonth } from "@/lib/db/transactions";
import { getAccounts } from "@/lib/db/accounts";
import { getCategories } from "@/lib/db/categories";
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
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú Corrente", type: "conta" }]);
    (getCategories as Mock).mockResolvedValue([{ id: "c1", name: "Alimentação", type: "despesa" }]);

    render(<TransactionsPage />);

    expect(await screen.findByText("Lançamentos")).toBeInTheDocument();
    expect(await screen.findByText(/^📈 Receitas$/i)).toBeInTheDocument();
    expect(screen.getByText(/^📉 Despesas$/i)).toBeInTheDocument();
    expect(screen.getByText("Contas e Cartões")).toBeInTheDocument();
    expect(screen.getByText("Itaú Corrente")).toBeInTheDocument();
    expect(screen.getByText("Supermercado")).toBeInTheDocument();
  });

  it("deve abrir o modal dedicado ao clicar em + Nova Conta / Cartão", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getTransactionsByMonth as Mock).mockResolvedValue([]);
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú Corrente", type: "conta" }]);
    (getCategories as Mock).mockResolvedValue([]);

    render(<TransactionsPage />);

    const newAccBtn = await screen.findByRole("button", { name: /\+ Nova Conta \/ Cartão/i });
    fireEvent.click(newAccBtn);

    expect(screen.getByRole("heading", { name: "Nova Conta / Cartão" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome da Conta \/ Cartão/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo/i)).toBeInTheDocument();
  });

  it("deve abrir o modal de lançamento com a conta fixada ao clicar no botão do rodapé", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getTransactionsByMonth as Mock).mockResolvedValue([]);
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú Corrente", type: "conta" }]);
    (getCategories as Mock).mockResolvedValue([{ id: "c1", name: "Alimentação", type: "despesa" }]);

    render(<TransactionsPage />);

    const footerTxBtn = await screen.findByRole("button", { name: /\+ Nova Transação/i });
    fireEvent.click(footerTxBtn);

    expect(await screen.findByRole("heading", { name: "Nova Transação (Itaú Corrente)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar e Adicionar Outro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });
});
