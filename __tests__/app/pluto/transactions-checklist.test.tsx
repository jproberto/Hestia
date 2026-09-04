import { render, screen, cleanup, waitFor } from "@testing-library/react";
import TransactionsPage from "@/app/pluto/transactions/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getTransactionsByMonth } from "@/lib/pluto/db/transactions";
import { getAccounts } from "@/lib/pluto/db/accounts";
import { getCategories } from "@/lib/pluto/db/categories";
import { getMonthlyPeriods, getAllOpenMonthlyPeriods } from "@/lib/pluto/db/months";
import { getBudgets } from "@/lib/pluto/db/budget";
import { getChecklistItemsByMonth } from "@/lib/pluto/db/checklist";
import { usePathname, useRouter } from "next/navigation";
import { MascotProvider } from "@/lib/hestia/MascotProvider";

const mockUsePathname = vi.hoisted(() => vi.fn(() => '/pluto/transactions'));
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() })));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useRouter: mockUseRouter,
}));

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } }),
    },
  })
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

vi.mock("@/lib/pluto/db/checklist", () => ({
  getChecklistItemsByMonth: vi.fn(),
  getGlobalChecklistItems: vi.fn(() => Promise.resolve([])),
  createChecklistItem: vi.fn(),
  updateChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  toggleChecklistItemCompletion: vi.fn(),
}));

function renderWithMascotProvider(ui: React.ReactElement) {
  return render(
    <MascotProvider>
      {ui}
    </MascotProvider>
  );
}

describe("Integração do Checklist na Página de Transações", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/pluto/transactions');
    mockUseRouter.mockReturnValue({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() });
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

    renderWithMascotProvider(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Checklist de Contas a Pagar / Receber")).toBeInTheDocument();
      expect(screen.getByText("Conta de Energia")).toBeInTheDocument();
    });
  });
});