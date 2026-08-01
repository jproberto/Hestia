import { render, screen, cleanup, waitFor } from "@testing-library/react";
import TransactionsPage from "@/app/finance/transactions/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getTransactionsByMonth } from "@/lib/db/transactions";
import { getAccounts } from "@/lib/db/accounts";
import { getCategories } from "@/lib/db/categories";
import { getMonthlyPeriods, getAllOpenMonthlyPeriods } from "@/lib/db/months";
import { getBudgets } from "@/lib/db/budget";
import { getChecklistItemsByMonth } from "@/lib/db/checklist";

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
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
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

vi.mock("@/lib/db/checklist", () => ({
  getChecklistItemsByMonth: vi.fn(),
  createChecklistItem: vi.fn(),
  updateChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  toggleChecklistItemCompletion: vi.fn(),
}));

describe("Integração do Checklist na Página de Transações", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("deve carregar e renderizar o card de checklist de contas a pagar na pagina de transacoes", async () => {
    (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto" },
    ]);
    (getBudgets as Mock).mockResolvedValue([]);
    (getAccounts as Mock).mockResolvedValue([
      { id: "acc1", name: "Itaú", created_at: "", created_by: "" },
    ]);
    (getCategories as Mock).mockResolvedValue([
      { id: "c1", name: "Alimentação", type: "despesa", created_at: "", created_by: "" },
    ]);
    (getTransactionsByMonth as Mock).mockResolvedValue([]);
    (getChecklistItemsByMonth as Mock).mockResolvedValue([
      {
        id: "chk1",
        month_id: "p1",
        day: 10,
        description: "Conta de Energia",
        type: "despesa",
        category_id: "c1",
        category_name: "Alimentação",
        amount: 150,
        is_completed: false,
        is_active: true,
        created_at: "",
        created_by: "",
      },
    ]);

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Checklist de Contas a Pagar / Receber")).toBeInTheDocument();
      expect(screen.getByText("Conta de Energia")).toBeInTheDocument();
    });
  });
});
