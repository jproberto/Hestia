import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import TransactionsPage from "@/app/pluto/transactions/page";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { getTransactionsByMonth, createTransaction } from "@/lib/pluto/db/transactions";
import { getAccounts, getOrCreateAccount } from "@/lib/pluto/db/accounts";
import { getCategories, getOrCreateCategory } from "@/lib/pluto/db/categories";
import { getMonthlyPeriods, getAllOpenMonthlyPeriods } from "@/lib/pluto/db/months";
import { getBudgets } from "@/lib/pluto/db/budget";
import { getChecklistItemsByMonth } from "@/lib/pluto/db/checklist";
import { MascotProvider } from "@/lib/hestia/MascotProvider";
import type { Account } from "@/lib/pluto/types";
import { FakeAccountRepository } from "@/lib/pluto/repositories/fakes/fakeAccountRepository";

const mockUsePathname = vi.hoisted(() => vi.fn(() => "/pluto/transactions"));
const mockUseRouter = vi.hoisted(() =>
  vi.fn(() => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }))
);

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useRouter: mockUseRouter,
}));

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } }),
    },
  }),
}));

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

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
  getGlobalChecklistItems: vi.fn(() => Promise.resolve([])),
  createChecklistItem: vi.fn(() => Promise.resolve({})),
  updateChecklistItem: vi.fn(() => Promise.resolve()),
  deleteChecklistItem: vi.fn(() => Promise.resolve()),
  toggleChecklistItemCompletion: vi.fn(() => Promise.resolve()),
}));

const OPEN_MONTH = { id: "p1", year: 2026, month: 3, status: "aberto" };
const EMAIL = "teste@hestia.com";
const CONTA_ITAU: Account = {
  id: "a2",
  name: "Itaú",
  type: "conta",
  created_at: null,
  created_by: null,
};
const CARTAO_NUBANK: Account = {
  id: "a1",
  name: "Nubank",
  type: "cartao",
  created_at: null,
  created_by: null,
};

function setupBaseMocks() {
  (getAllOpenMonthlyPeriods as Mock).mockResolvedValue([OPEN_MONTH]);
  (getMonthlyPeriods as Mock).mockResolvedValue([OPEN_MONTH]);
  (getBudgets as Mock).mockResolvedValue([]);
  (getTransactionsByMonth as Mock).mockResolvedValue([]);
  (getAccounts as Mock).mockResolvedValue([CONTA_ITAU, CARTAO_NUBANK]);
  (getCategories as Mock).mockResolvedValue([
    { id: "c1", name: "Alimentação", type: "despesa", created_at: "", created_by: "" },
  ]);
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
}

function renderPage() {
  return render(
    <MascotProvider>
      <TransactionsPage />
    </MascotProvider>
  );
}

/** Espera a página assentar no mês aberto da tela antes de interagir. */
async function settlePage() {
  await waitFor(() => {
    expect((screen.getByLabelText("Mês:") as HTMLSelectElement).value).toBe("3");
  });
}

function cardFooterButton(accountName: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: accountName });
  const card = heading.closest(".rounded-lg") as HTMLElement | null;
  if (!card) throw new Error(`card da conta "${accountName}" não encontrado`);
  return within(card).getByRole("button", { name: /\+ Nova Transação/i });
}

/**
 * Clica no rodapé do card da conta: cada commit pode substituir os nós
 * (a página faz 2 fetchData em sequência), então só clica com o botão
 * conectado — padrão clickConnectedButton de critical-flows.test.tsx.
 */
async function clickCardFooter(accountName: string) {
  await waitFor(() => {
    expect(cardFooterButton(accountName).isConnected).toBe(true);
  });
  fireEvent.click(cardFooterButton(accountName));
}

function submitFirstForm(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) throw new Error("form não encontrado");
  fireEvent.submit(form);
}

function delegateGetOrCreateAccountTo(fake: FakeAccountRepository) {
  (getOrCreateAccount as Mock).mockImplementation((_db, name, email, type) =>
    fake.getOrCreateAccount(name, email, type)
  );
}

/**
 * F1 (Argos CRITICAL 2026-11-08 + emenda do plano aprovada pelo humano em
 * 2026-11-08): os call sites da UI precisam enviar accountType coerente com a
 * conta escolhida/registrada — identidade de financial_accounts é (nome
 * normalizado, tipo) (R2/R4). O repositório é exercitado pelo
 * FakeAccountRepository (espelho do contrato nome+tipo): tipo errado vira
 * comportamento observável (conta fantasma + account_id repontado), não uma
 * asserção de argumento de mock.
 */
describe("F1 — fluxos de conta na página de lançamentos (accountType coerente)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/pluto/transactions");
    mockUseRouter.mockReturnValue({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() });
    setupBaseMocks();
  });

  it("F1 — escolher o cartão no select e salvar usa a conta escolhida com o tipo correto (sem duplicata com tipo trocado)", async () => {
    const fake = new FakeAccountRepository([CONTA_ITAU, CARTAO_NUBANK]);
    delegateGetOrCreateAccountTo(fake);
    (getOrCreateCategory as Mock).mockResolvedValue("c1");
    (createTransaction as Mock).mockResolvedValue({ id: "t9" });

    const { container } = renderPage();
    await settlePage();

    // Abre pré-fixado na CONTA "Itaú" (entra coerente com accountType 'conta').
    await clickCardFooter("Itaú");
    await screen.findByLabelText("Data");

    // Usuário troca a seleção para o CARTÃO "Nubank" no select do modal.
    fireEvent.change(screen.getByRole("combobox", { name: /Conta \/ Cartão/i }), {
      target: { value: "Nubank" },
    });
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Fatura" } });
    fireEvent.change(screen.getByLabelText(/Valor \(R\$\)/i), { target: { value: "99" } });
    fireEvent.change(screen.getByLabelText(/Categoria/i), { target: { value: "Alimentação" } });

    submitFirstForm(container);

    // A transação nasce apontando para o cartão escolhido...
    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ account_id: "a1" }),
        EMAIL
      );
    });
    // ...e nenhuma conta fantasma homônima com tipo trocado é criada.
    const after = await fake.getAccounts();
    expect(after).toHaveLength(2);
    expect(after.find((a) => a.name === "Nubank")?.type).toBe("cartao");
  });

  it("F1 — fluxo do checklist: partir do cartão, abrir pelo checklist e escolher conta no select salva com o tipo correto", async () => {
    const fake = new FakeAccountRepository([CONTA_ITAU, CARTAO_NUBANK]);
    delegateGetOrCreateAccountTo(fake);
    (getOrCreateCategory as Mock).mockResolvedValue("c1");
    (createTransaction as Mock).mockResolvedValue({ id: "t9" });

    const { container } = renderPage();
    await settlePage();

    // Estado prévio realista: modal aberto pelo card do CARTÃO deixa o
    // accountTypeInput interno em 'cartao' (handleOpenTxModal).
    await clickCardFooter("Nubank");
    await screen.findByLabelText("Data");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Marcar o item do checklist reabre o modal em prefill — o prefill NÃO
    // define conta (accountInput vazio; registro no teste de hook F1).
    fireEvent.click(screen.getByRole("checkbox"));
    await screen.findByLabelText("Data");

    // Usuário escolhe a CONTA "Itaú" no select: o tipo tem que acompanhar a
    // seleção (hoje o tipo 'cartao' do estado prévio vaza para o salvamento).
    fireEvent.change(screen.getByRole("combobox", { name: /Conta \/ Cartão/i }), {
      target: { value: "Itaú" },
    });

    submitFirstForm(container);

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ account_id: "a2" }),
        EMAIL
      );
    });
    const after = await fake.getAccounts();
    expect(after).toHaveLength(2);
    expect(after.find((a) => a.name === "Itaú")?.type).toBe("conta");
  });
});
