import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import TransactionsPage from "@/app/pluto/transactions/page";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { getTransactionsByMonth, createTransaction, updateTransaction } from "@/lib/pluto/db/transactions";
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

// D19/R2 (re-review 2026-11-11, findings[1] → blocker 2): "Itaú" conta e
// "Itaú" cartão são duas linhas válidas de financial_accounts (cenários 14/21
// do test-scenarios.md). A ordem [conta, cartão] reflete o desempate
// arbitrário de getAccounts entre homônimas de mesmo nome normalizado.
const CONTA_ITAU: Account = {
  id: "a-conta",
  name: "Itaú",
  type: "conta",
  created_at: null,
  created_by: null,
};
const CARTAO_ITAU: Account = {
  id: "a-cartao",
  name: "Itaú",
  type: "cartao",
  created_at: null,
  created_by: null,
};
const CARTAO_NUBANK: Account = {
  id: "a-nubank",
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
  (getAccounts as Mock).mockResolvedValue([CONTA_ITAU, CARTAO_ITAU, CARTAO_NUBANK]);
  (getCategories as Mock).mockResolvedValue([
    { id: "c1", name: "Alimentação", type: "despesa", created_at: "", created_by: "" },
  ]);
  (getChecklistItemsByMonth as Mock).mockResolvedValue([]);
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
 *
 * O card usado para abrir é o de NUBANK (nome único entre os cards): os dois
 * cards homônimos "Itaú" teriam headings iguais.
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
 * Blocker (b) da re-review 2026-11-11 (findings[1]): com o par homônimo
 * ("Itaú" conta + "Itaú" cartão) existente, escolher a SEGUNDA homônima no
 * select do modal precisa submeter o account_id (e o tipo) da segunda —
 * hoje value={acc.name} faz as duas options colidirem e a seleção resolve
 * sempre para a primeira linha em ordem da lista (repontamento silencioso
 * para o tipo errado). Mesmo padrão do F1: comportamento observável pela
 * FakeAccountRepository, sem asserção de argumento de mock. O value da option
 * é lido do DOM — o teste não presume o formato do discriminador (id, ou
 * name+tipo).
 */
describe("HOM — select de conta com homônimas conta × cartão na página de lançamentos (D19/R2)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/pluto/transactions");
    mockUseRouter.mockReturnValue({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() });
    setupBaseMocks();
  });

  it("HOM — escolher a segunda homônima (cartão 'Itaú') no select submete o account_id do cartão, sem criar linha nova", async () => {
    const fake = new FakeAccountRepository([CONTA_ITAU, CARTAO_ITAU, CARTAO_NUBANK]);
    delegateGetOrCreateAccountTo(fake);
    (getOrCreateCategory as Mock).mockResolvedValue("c1");
    (createTransaction as Mock).mockResolvedValue({ id: "t9" });

    const { container } = renderPage();
    await settlePage();

    // Abre pré-fixado pelo card de NUBANK (linha não homônima).
    await clickCardFooter("Nubank");
    await screen.findByLabelText("Data");

    // Usuário troca a seleção para a SEGUNDA homônima: a option do cartão
    // "Itaú" (a primeira "Itaú" da lista é a conta).
    const select = screen.getByRole("combobox", { name: /Conta \/ Cartão/i });
    const cartaoOption = Array.from(select.querySelectorAll("option")).find(
      (opt) => /Itaú \(Cartão\)/.test(opt.textContent ?? "")
    );
    expect(cartaoOption).toBeDefined();
    fireEvent.change(select, { target: { value: (cartaoOption as HTMLOptionElement).value } });

    // RED (b) — findings[1] da 3a re-review 2026-11-11: o select deve EXIBIR
    // a escolha. O value controlado precisa casar com a option da homônima
    // escolhida depois que o form assenta (accountInput vira o nome "Itaú",
    // que não discrimina conta × cartão — hoje cai no placeholder e a escolha
    // some da tela). Asserção do valor renderido no DOM, não do payload.
    expect((select as HTMLSelectElement).value).toBe(
      (cartaoOption as HTMLOptionElement).value
    );

    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Fatura" } });
    fireEvent.change(screen.getByLabelText(/Valor \(R\$\)/i), { target: { value: "99" } });
    fireEvent.change(screen.getByLabelText(/Categoria/i), { target: { value: "Alimentação" } });

    submitFirstForm(container);

    // A transação nasce apontando para o CARTÃO escolhido (a segunda
    // homônima) — hoje a seleção resolve para a CONTA homônima primeira da
    // lista e o account_id submetido é o dela.
    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ account_id: "a-cartao" }),
        EMAIL
      );
    });
    // Nenhuma linha nova e nenhuma linha com tipo trocado no repositório.
    const after = await fake.getAccounts();
    expect(after).toHaveLength(3);
    expect(after.find((a) => a.id === "a-conta")?.type).toBe("conta");
    expect(after.find((a) => a.id === "a-cartao")?.type).toBe("cartao");
  });

  /**
   * RED (b) — findings[1] da 3a re-review 2026-11-11 (bloco IMPORTANT):
   * em EDICAO com o par homônimo, trocar o select para a outra homônima
   * faz o value controlado "snap-back" para a linha do account_id da edição
   * — a UI exibe A enquanto o state/save gravam B. O select deve MANTER a
   * escolha renderida (asserção do valor no DOM, não só do payload).
   */
  it("HOM — na edição, trocar para a outra homônima mantém o select.value na escolha (sem snap-back) e salva a escolhida", async () => {
    const fake = new FakeAccountRepository([CONTA_ITAU, CARTAO_ITAU, CARTAO_NUBANK]);
    delegateGetOrCreateAccountTo(fake);
    (getOrCreateCategory as Mock).mockResolvedValue("c1");
    (updateTransaction as Mock).mockResolvedValue({ id: "t1" });
    // Lançamento original apontando para a CONTA homônima (a-conta).
    (getTransactionsByMonth as Mock).mockResolvedValue([
      {
        id: "t1",
        description: "Supermercado",
        amount: 200,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        period_year: 2026,
        period_month: 3,
        category_id: "c1",
        category_name: "Alimentação",
        account_id: CONTA_ITAU.id,
        account_name: CONTA_ITAU.name,
        created_at: "2026-03-15T12:00:00+00",
        created_by: EMAIL,
      },
    ]);

    const { container } = renderPage();
    await settlePage();

    // Abre a edição do lançamento da conta "Itaú".
    await screen.findAllByText("Supermercado");
    fireEvent.click(
      screen.getByRole("button", { name: /Editar lançamento Supermercado/i })
    );
    await screen.findByRole("heading", { name: /Editar Transação/ });

    const select = screen.getByRole("combobox", {
      name: /Conta \/ Cartão/i,
    }) as HTMLSelectElement;
    const cartaoOption = Array.from(select.querySelectorAll("option")).find(
      (opt) => /Itaú \(Cartão\)/.test(opt.textContent ?? "")
    );
    expect(cartaoOption).toBeDefined();

    // Estado inicial: a edição resolve pelo account_id da linha (a-conta).
    expect(select.value).toBe(CONTA_ITAU.id);

    fireEvent.change(select, { target: { value: (cartaoOption as HTMLOptionElement).value } });

    // RED: após a troca o select deve exibir a homônima ESCOLHIDA — sem
    // voltar para a linha original do editingTransaction (snap-back).
    expect((select as HTMLSelectElement).value).toBe(
      (cartaoOption as HTMLOptionElement).value
    );

    submitFirstForm(container);

    // E o save persiste a escolhida (contrato de persistência F1 — mantido).
    await waitFor(() => {
      expect(updateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        "t1",
        expect.objectContaining({ account_id: "a-cartao" })
      );
    });
  });
});
