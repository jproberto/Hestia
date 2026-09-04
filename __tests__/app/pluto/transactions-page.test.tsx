import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import TransactionsPage from "@/app/pluto/transactions/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getTransactionsByMonth, deleteTransaction } from "@/lib/pluto/db/transactions";
import { getAccounts } from "@/lib/pluto/db/accounts";
import { getCategories } from "@/lib/pluto/db/categories";
import { getMonthlyPeriods, getAllOpenMonthlyPeriods } from "@/lib/pluto/db/months";
import { getBudgets } from "@/lib/pluto/db/budget";
import { usePathname, useRouter } from "next/navigation";
import { MascotProvider } from "@/lib/hestia/MascotProvider";

const mockUsePathname = vi.hoisted(() => vi.fn(() => '/pluto/transactions'));
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() })));

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } }),
    },
  }),
));

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

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useRouter: mockUseRouter,
}));

function renderWithMascotProvider(ui: React.ReactElement) {
  return render(
    <MascotProvider>
      {ui}
    </MascotProvider>
  );
}

describe("Página de Cadastro de Transações /pluto/transactions", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/pluto/transactions');
    mockUseRouter.mockReturnValue({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() });
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

    renderWithMascotProvider(<TransactionsPage />);

    expect(await screen.findByText("Lançamentos")).toBeInTheDocument();
    expect(await screen.findByText(/^📈 Receitas$/i)).toBeInTheDocument();
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
    (getAccounts as Mock).mockResolvedValue([]);
    (getCategories as Mock).mockResolvedValue([]);

    renderWithMascotProvider(<TransactionsPage />);

    const newAccBtn = screen.getByRole("button", { name: /\+ Nova Conta \/ Cartão/i });
    fireEvent.click(newAccBtn);

    await waitFor(() => {
      expect(screen.getByText("Nova Conta / Cartão")).toBeInTheDocument();
    });
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
    (getCategories as Mock).mockResolvedValue([]);

    renderWithMascotProvider(<TransactionsPage />);

    const footerBtn = screen.getByRole("button", { name: /\+ Nova Transação/i });
    fireEvent.click(footerBtn);

    await waitFor(() => {
      expect(screen.getByText("Nova Transação")).toBeInTheDocument();
    });

    const accountSelect = screen.getByRole("combobox", { name: /Conta \/ Cartão/i });
    expect(accountSelect).toHaveValue("Itaú Corrente");
  });

  it("deve abrir o modal de edição preenchido ao clicar em editar", async () => {
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

    renderWithMascotProvider(<TransactionsPage />);

    const editBtn = screen.getByRole("button", { name: /Editar lançamento Supermercado/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Editar Transação")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Supermercado")).toBeInTheDocument();
    expect(screen.getByDisplayValue("200")).toBeInTheDocument();
    expect(screen.getByDisplayValue("despesa")).toBeInTheDocument();
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

    renderWithMascotProvider(<TransactionsPage />);

    const deleteBtn = screen.getByRole("button", { name: /Excluir lançamento Supermercado/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tem certeza que deseja excluir "Supermercado"/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Confirmar Exclusão/i }));

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
        date: "2026-03-15",
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
    (getCategories as Mock).mockResolvedValue([
      { id: "c1", name: "Salário", type: "receita" },
      { id: "c2", name: "Alimentação", type: "despesa" },
    ]);

    renderWithMascotProvider(<TransactionsPage />);

    const saldoBanner = await screen.findByText(/Saldo do Mês/i);
    expect(saldoBanner).toBeInTheDocument();
    expect(saldoBanner).toHaveTextContent(/4\.800,00/);
    expect(saldoBanner).toHaveClass("text-emerald");
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

    renderWithMascotProvider(<TransactionsPage />);

    const saldoBanner = await screen.findByText(/Saldo do Mês/i);
    expect(saldoBanner).toBeInTheDocument();
    expect(saldoBanner).toHaveTextContent(/200,00/);
    expect(saldoBanner).toHaveClass("text-rose");
  });

  it("não deve exibir o banner de saldo quando nenhum mês está aberto", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([]);
    (getMonthlyPeriods as Mock).mockResolvedValue([]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getTransactionsByMonth as Mock).mockResolvedValue([]);
    (getAccounts as Mock).mockResolvedValue([]);
    (getCategories as Mock).mockResolvedValue([]);

    renderWithMascotProvider(<TransactionsPage />);

    expect(screen.queryByText(/Saldo do Mês/i)).not.toBeInTheDocument();
  });
});