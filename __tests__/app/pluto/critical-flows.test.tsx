import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import TransactionsPage from "@/app/pluto/transactions/page";
import MonthsPage from "@/app/pluto/months/page";
import {
  getTransactionsByMonth,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/pluto/db/transactions";
import { getAccounts, getOrCreateAccount } from "@/lib/pluto/db/accounts";
import { getCategories, getOrCreateCategory } from "@/lib/pluto/db/categories";
import { getAllOpenMonthlyPeriods, getMonthlyPeriods, openMonthlyPeriod } from "@/lib/pluto/db/months";
import { getBudgets } from "@/lib/pluto/db/budget";
import { getChecklistItemsByMonth, getGlobalChecklistItems } from "@/lib/pluto/db/checklist";
import { usePathname } from "next/navigation";
import { MascotProvider } from "@/lib/hestia/MascotProvider";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } }),
    },
  }),
}));

vi.mock("@/lib/shared/supabaseClient", () => ({
  createBrowserDatabaseClient: () => ({
    from: () => { throw new Error("use mocked db barrels in tests"); },
    getUserEmail: () => Promise.resolve("teste@hestia.com"),
  }),
}));

vi.mock("@/lib/pluto/db/transactions", () => ({
  getTransactionsByMonth: vi.fn(() => Promise.resolve([])),
  createTransaction: vi.fn(() => Promise.resolve({})),
  updateTransaction: vi.fn(() => Promise.resolve({})),
  deleteTransaction: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/pluto/db/accounts", () => ({
  getAccounts: vi.fn(() => Promise.resolve([])),
  getOrCreateAccount: vi.fn(() => Promise.resolve("acc-mock")),
}));

vi.mock("@/lib/pluto/db/categories", () => ({
  getCategories: vi.fn(() => Promise.resolve([])),
  getOrCreateCategory: vi.fn(() => Promise.resolve("cat-mock")),
}));

vi.mock("@/lib/pluto/db/months", () => ({
  getMonthlyPeriods: vi.fn(() => Promise.resolve([])),
  getAllOpenMonthlyPeriods: vi.fn(() => Promise.resolve([])),
  openMonthlyPeriod: vi.fn(() => Promise.resolve()),
  closeMonthlyPeriod: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/pluto/db/budget", () => ({
  getBudgets: vi.fn(() => Promise.resolve([])),
  adjustBudgetItem: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/pluto/db/checklist", () => ({
  getChecklistItemsByMonth: vi.fn(() => Promise.resolve([])),
  createChecklistItem: vi.fn(() => Promise.resolve({})),
  updateChecklistItem: vi.fn(() => Promise.resolve()),
  deleteChecklistItem: vi.fn(() => Promise.resolve()),
  toggleChecklistItemCompletion: vi.fn(() => Promise.resolve()),
  getGlobalChecklistItems: vi.fn(() => Promise.resolve([])),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const OPEN_MONTHS = [
  { id: "p1", year: 2026, month: 3, status: "aberto", created_at: "2026-03-01T00:00:00Z", created_by: "t@t.com" },
];

function setupBaseMocks() {
  (getAllOpenMonthlyPeriods as Mock).mockResolvedValue(OPEN_MONTHS);
  (getMonthlyPeriods as Mock).mockResolvedValue(OPEN_MONTHS);
  (getBudgets as Mock).mockResolvedValue([]);
  (getAccounts as Mock).mockResolvedValue([{ id: "a1", name: "Itaú Corrente", type: "conta" }]);
  (getCategories as Mock).mockResolvedValue([{ id: "c1", name: "Alimentação", type: "despesa" }]);
  (getChecklistItemsByMonth as Mock).mockResolvedValue([]);
  (getGlobalChecklistItems as Mock).mockResolvedValue([]);
}

function submitFirstForm(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) throw new Error("form não encontrado");
  fireEvent.submit(form);
}

/**
 * Clica num botão somente quando ele está conectado ao documento.
 * A page faz 2 fetchData em sequência (troca de mês) e cada commit
 * pode substituir os nós — clicar num nó destacado é no-op silencioso.
 */
async function clickConnectedButton(name: RegExp) {
  await waitFor(() => {
    expect(screen.getByRole("button", { name }).isConnected).toBe(true);
  });
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("Fluxos críticos (interação ponta a ponta)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    (usePathname as Mock).mockReturnValue("/pluto/transactions");
    setupBaseMocks();
  });

  it("1. cria transação via modal: preencher, salvar e ver na lista", async () => {
    (getTransactionsByMonth as Mock).mockResolvedValue([]);
    (getOrCreateAccount as Mock).mockResolvedValue("a1");
    (getOrCreateCategory as Mock).mockResolvedValue("c1");
    (createTransaction as Mock).mockResolvedValue({ id: "t99" });

    const { container } = render(
      <MascotProvider>
        <TransactionsPage />
      </MascotProvider>
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("Ano:")).not.toBeNull();
    });
    await clickConnectedButton(/\+ Nova Transação/i);
    await screen.findByLabelText(/Data \(Limitada a/i);

    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Lanche" } });
    fireEvent.change(screen.getByLabelText(/Valor \(R\$\)/i), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText(/Categoria/i), { target: { value: "Alimentação" } });

    submitFirstForm(container);

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          description: "Lanche",
          amount: 25,
          type: "despesa",
          account_id: "a1",
          category_id: "c1",
        }),
        "teste@hestia.com"
      );
    });
    // modal fecha após salvar
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /Nova Transação/ })).not.toBeInTheDocument();
    });
  });

  it("2. edita transação: alterar valor e salvar", async () => {
    (getTransactionsByMonth as Mock).mockResolvedValue([
      {
        id: "t1",
        description: "Supermercado",
        amount: 200,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "c1",
        account_id: "a1",
        created_at: "2026-03-15T00:00:00Z",
        created_by: "teste@hestia.com",
        category_name: "Alimentação",
        account_name: "Itaú Corrente",
      },
    ]);
    (getOrCreateAccount as Mock).mockResolvedValue("a1");
    (getOrCreateCategory as Mock).mockResolvedValue("c1");
    (updateTransaction as Mock).mockResolvedValue({ id: "t1" });

    const { container } = render(
      <MascotProvider>
        <TransactionsPage />
      </MascotProvider>
    );

    await clickConnectedButton(/Editar lançamento Supermercado/i);
    await screen.findByRole("heading", { name: /Editar Transação/ });

    const amountInput = screen.getByLabelText(/Valor \(R\$\)/i);
    fireEvent.change(amountInput, { target: { value: "250" } });
    submitFirstForm(container);

    await waitFor(() => {
      expect(updateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        "t1",
        expect.objectContaining({ amount: 250 })
      );
    });
  });

  it("3. exclui transação: confirmar exclusão", async () => {
    (getTransactionsByMonth as Mock).mockResolvedValue([
      {
        id: "t1",
        description: "Supermercado",
        amount: 200,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "c1",
        account_id: "a1",
        created_at: "2026-03-15T00:00:00Z",
        created_by: "teste@hestia.com",
        category_name: "Alimentação",
        account_name: "Itaú Corrente",
      },
    ]);
    (deleteTransaction as Mock).mockResolvedValue(undefined);

    render(
      <MascotProvider>
        <TransactionsPage />
      </MascotProvider>
    );

    await clickConnectedButton(/Excluir lançamento Supermercado/i);
    await screen.findByText(/Tem certeza que deseja excluir o lançamento/i);

    fireEvent.click(screen.getByRole("button", { name: /Confirmar Exclusão/i }));

    await waitFor(() => {
      expect(deleteTransaction).toHaveBeenCalledWith(expect.anything(), "t1");
    });
  });

  it("4. abre um mês não iniciado na página de meses", async () => {
    (usePathname as Mock).mockReturnValue("/pluto/months");
    (getMonthlyPeriods as Mock).mockResolvedValue([]);
    (openMonthlyPeriod as Mock).mockResolvedValue(undefined);

    render(
      <MascotProvider>
        <MonthsPage />
      </MascotProvider>
    );

    const openButtons = await screen.findAllByRole("button", { name: "Abrir Mês" });
    fireEvent.click(openButtons[0]);

    await waitFor(() => {
      expect(openMonthlyPeriod).toHaveBeenCalledWith(expect.anything(), 2026, 1, "teste@hestia.com");
    });
  });

  it("5. cria conta via modal dedicado", async () => {
    (getTransactionsByMonth as Mock).mockResolvedValue([]);
    (getOrCreateAccount as Mock).mockResolvedValue("a9");

    const { container } = render(
      <MascotProvider>
        <TransactionsPage />
      </MascotProvider>
    );

    await screen.findByLabelText("Ano:");
    fireEvent.click(screen.getByRole("button", { name: /\+ Nova Conta \/ Cartão/i }));
    await screen.findByRole("heading", { name: "Nova Conta / Cartão" });

    fireEvent.change(screen.getByLabelText(/Nome da Conta/i), { target: { value: "Nubank" } });
    submitFirstForm(container);

    await waitFor(() => {
      expect(getOrCreateAccount).toHaveBeenCalledWith(expect.anything(), "Nubank", "teste@hestia.com", "conta");
    });
  });
});
