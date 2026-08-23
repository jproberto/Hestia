import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import TransactionsPage from "@/app/finance/transactions/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getTransactionsByMonth, deleteTransaction } from "@/lib/pluto/db/transactions";
import { getAccounts } from "@/lib/pluto/db/accounts";
import { getCategories } from "@/lib/pluto/db/categories";
import { getMonthlyPeriods, getAllOpenMonthlyPeriods } from "@/lib/pluto/db/months";
import { getBudgets } from "@/lib/pluto/db/budget";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } }),
    },
  }),
}));

vi.mock("@/lib/pluto/db/transactions", () => ({
  getTransactionsByMonth: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

vi.mock("@/lib/pluto/db/accounts", () => ({
  getAccounts: vi.fn(),
  getOrCreateAccount: vi.fn(),
}));

vi.mock("@/lib/pluto/db/categories", () => ({
  getCategories: vi.fn(),
  getOrCreateCategory: vi.fn(),
}));

vi.mock("@/lib/pluto/db/months", () => ({
  getMonthlyPeriods: vi.fn(),
  getAllOpenMonthlyPeriods: vi.fn(),
}));

vi.mock("@/lib/pluto/db/budget", () => ({
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

  it("deve exibir botões de editar e excluir na tabela de transações e abrir o modal de edição preenchido ao clicar em editar", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getTransactionsByMonth as Mock).mockResolvedValue([
      {
        id: "t1",
        description: "Padaria",
        amount: 30,
        type: "despesa",
        is_refund: false,
        date: "2026-03-10",
        category_name: "Alimentação",
        account_name: "Itaú Corrente",
        account_id: "a1",
        category_id: "c1",
        created_by: "teste@hestia.com",
      },
    ]);
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú Corrente", type: "conta" }]);
    (getCategories as Mock).mockResolvedValue([{ id: "c1", name: "Alimentação", type: "despesa" }]);

    render(<TransactionsPage />);

    const editBtn = await screen.findByRole("button", { name: /Editar lançamento Padaria/i });
    expect(editBtn).toBeInTheDocument();
    const deleteBtn = screen.getByRole("button", { name: /Excluir lançamento Padaria/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(editBtn);

    expect(await screen.findByRole("heading", { name: /Editar Transação/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Padaria")).toBeInTheDocument();
    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
  });

  it("deve abrir modal de confirmação ao clicar no botão excluir e chamar deleteTransaction ao confirmar", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getTransactionsByMonth as Mock).mockResolvedValue([
      {
        id: "t1",
        description: "Aluguel",
        amount: 1500,
        type: "despesa",
        is_refund: false,
        date: "2026-03-05",
        category_name: "Moradia",
        account_name: "Itaú Corrente",
        account_id: "a1",
        category_id: "c2",
        created_by: "teste@hestia.com",
      },
    ]);
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú Corrente", type: "conta" }]);
    (getCategories as Mock).mockResolvedValue([{ id: "c2", name: "Moradia", type: "despesa" }]);
    (deleteTransaction as Mock).mockResolvedValue(undefined);

    render(<TransactionsPage />);

    const deleteBtn = await screen.findByRole("button", { name: /Excluir lançamento Aluguel/i });
    fireEvent.click(deleteBtn);

    expect(await screen.findByRole("heading", { name: "Excluir lançamento" })).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza que deseja excluir o lançamento/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Aluguel/i).length).toBeGreaterThanOrEqual(2);

    const confirmDeleteBtn = screen.getByRole("button", { name: "Confirmar Exclusão" });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteTransaction).toHaveBeenCalledWith(expect.anything(), "t1");
    });
  });

  it("deve exibir o banner de saldo do mês com valor positivo em verde quando receitas superam despesas", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getTransactionsByMonth as Mock).mockResolvedValue([
      {
        id: "t1",
        description: "Salário",
        amount: 5000,
        type: "receita",
        is_refund: false,
        date: "2026-03-05",
        category_name: "Salário",
        account_name: "Itaú Corrente",
        created_by: "teste@hestia.com",
      },
      {
        id: "t2",
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
    (getCategories as Mock).mockResolvedValue([]);

    render(<TransactionsPage />);

    const bannerLabelPos = await screen.findByText("💰 Saldo do Mês");
    const bannerElPos = bannerLabelPos.closest("div") as HTMLElement;

    const saldoElPos = within(bannerElPos).getByText(/R\$\s*4\.800,00/);
    expect(saldoElPos).toBeInTheDocument();
    expect(saldoElPos.className).toContain("text-success");
    expect(saldoElPos.className).not.toContain("text-danger");
  });

  it("deve exibir o banner de saldo do mês em vermelho quando despesas superam receitas", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getTransactionsByMonth as Mock).mockResolvedValue([
      {
        id: "t1",
        description: "Aluguel",
        amount: 1500,
        type: "despesa",
        is_refund: false,
        date: "2026-03-05",
        category_name: "Moradia",
        account_name: "Itaú Corrente",
        created_by: "teste@hestia.com",
      },
    ]);
    (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú Corrente", type: "conta" }]);
    (getCategories as Mock).mockResolvedValue([]);

    render(<TransactionsPage />);

    const bannerLabelNeg = await screen.findByText("💰 Saldo do Mês");
    const bannerElNeg = bannerLabelNeg.closest("div") as HTMLElement;

    const saldoElNeg = within(bannerElNeg).getByText(/-R\$\s*1\.500,00/);
    expect(saldoElNeg).toBeInTheDocument();
    expect(saldoElNeg.className).toContain("text-danger");
    expect(saldoElNeg.className).not.toContain("text-success");
  });

  it("não deve exibir o banner de saldo quando nenhum mês está aberto", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([]);
    (getMonthlyPeriods as Mock).mockResolvedValue([]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getTransactionsByMonth as Mock).mockResolvedValue([]);
    (getAccounts as Mock).mockResolvedValue([]);
    (getCategories as Mock).mockResolvedValue([]);

    render(<TransactionsPage />);

    expect(await screen.findByText(/Nenhum mês está/i)).toBeInTheDocument();
    expect(screen.queryByText("💰 Saldo do Mês")).not.toBeInTheDocument();
  });
});

