import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import TransactionsPage from "@/app/finance/transactions/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getTransactionsByMonth, createTransaction } from "@/lib/db/transactions";
import { getAccounts, getOrCreateAccount } from "@/lib/db/accounts";
import { getCategories, getOrCreateCategory } from "@/lib/db/categories";
import { getMonthlyPeriods } from "@/lib/db/months";

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
}));

describe("Página de Cadastro de Transações /finance/transactions", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("deve renderizar o cabeçalho, os cards de resumo e a tabela de lançamentos", async () => {
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
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
        account_name: "Itaú",
        created_by: "teste@hestia.com",
      },
    ]);
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú" }]);
    (getCategories as Mock).mockResolvedValue([{ id: "c1", name: "Alimentação", type: "despesa" }]);

    render(<TransactionsPage />);

    expect(await screen.findByText("Lançamentos")).toBeInTheDocument();
    expect(screen.getByText("Total Entradas")).toBeInTheDocument();
    expect(screen.getByText("Total Saídas")).toBeInTheDocument();
    expect(screen.getByText("Resultado do Mês")).toBeInTheDocument();
    expect(screen.getByText("Supermercado")).toBeInTheDocument();
  });

  it("deve abrir o modal de nova transação e permitir criar um lançamento", async () => {
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getTransactionsByMonth as Mock).mockResolvedValue([]);
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú" }]);
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
      account_name: "Itaú",
    });

    render(<TransactionsPage />);

    const newBtn = await screen.findByRole("button", { name: /\+ Nova Transação/i });
    fireEvent.click(newBtn);

    expect(screen.getByText("Novo Lançamento")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Salário" } });
    fireEvent.change(screen.getByLabelText(/Valor/i), { target: { value: "5000" } });

    const submitBtn = screen.getByRole("button", { name: /Salvar Transação/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalled();
    });
  });
});
