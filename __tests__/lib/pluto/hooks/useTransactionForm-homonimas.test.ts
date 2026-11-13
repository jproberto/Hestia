import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useTransactionForm,
} from "@/lib/pluto/hooks/useTransactionForm";
import {
  createTransaction,
  updateTransaction,
} from "@/lib/pluto/db/transactions";
import { getOrCreateAccount } from "@/lib/pluto/db/accounts";
import { getOrCreateCategory } from "@/lib/pluto/db/categories";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { Account, TransactionWithDetails } from "@/lib/pluto/types";
import { FakeAccountRepository } from "@/lib/pluto/repositories/fakes/fakeAccountRepository";

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

const EMAIL = "teste@hestia.com";
const categories = [{ id: "c1", name: "Alimentação", type: "despesa" }] as never;

// D19/R2 da spec (re-review Argos 2026-11-11, findings[1] → blocker 2): a
// identidade de financial_accounts é (nome normalizado, tipo) — "Itaú" como
// CONTA e "Itaú" como CARTÃO são duas linhas distintas e ambas válidas
// (homônimas sancionadas por D19 e roteirizadas nos cenários 14/21 do
// test-scenarios.md). Ids diferentes, mesmo nome.
const contaItau: Account = {
  id: "acc-conta",
  name: "Itaú",
  type: "conta",
  created_at: null,
  created_by: null,
};
const cartaoItau: Account = {
  id: "acc-cartao",
  name: "Itaú",
  type: "cartao",
  created_at: null,
  created_by: null,
};

function makeFormOptions(accounts: Account[]) {
  return {
    db: {} as IDatabaseClient,
    userEmail: EMAIL,
    categories,
    accounts,
    selectedYear: 2026,
    selectedMonth: 3,
    fetchData: vi.fn(() => Promise.resolve()),
    setErrorMsg: vi.fn(),
  };
}

function renderForm(accounts: Account[]) {
  const options = makeFormOptions(accounts);
  const hook = renderHook(() => useTransactionForm(options));
  return { ...hook, options, setErrorMsg: options.setErrorMsg };
}

/**
 * Espelho do contrato do F1: o getOrCreateAccount do módulo é delegado para a
 * FakeAccountRepository (espelho nome+tipo), então tipo errado vira
 * comportamento observável — linha errada devolvida, repontamento silencioso
 * de account_id ou conta fantasma — em vez de asserção de argumento de mock.
 */
function delegateToFake(fake: FakeAccountRepository) {
  vi.mocked(getOrCreateAccount).mockImplementation((_db, name, email, type) =>
    fake.getOrCreateAccount(name, email, type)
  );
}

/** Transação que referencia `account` (account_id + account_name da linha). */
function makeEditTx(account: Account): TransactionWithDetails {
  return {
    id: "t1",
    description: "Compra",
    amount: 80,
    type: "despesa",
    is_refund: false,
    date: "2026-03-15",
    category_id: "c1",
    account_id: account.id,
    period_year: 2026,
    period_month: 3,
    category_name: "Alimentação",
    account_name: account.name,
    created_at: "2026-03-15T00:00:00Z",
    created_by: EMAIL,
  };
}

describe("useTransactionForm — homônimas conta × cartão (edição por account_id, D19/R2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrCreateAccount).mockResolvedValue("a1");
    vi.mocked(getOrCreateCategory).mockResolvedValue("c1");
    vi.mocked(createTransaction).mockResolvedValue({} as never);
    vi.mocked(updateTransaction).mockResolvedValue({} as never);
  });

  // Blocker (a) da re-review 2026-11-11: handleOpenEditModal resolve o tipo
  // POR NOME (resolveAccountType(tx.account_name)) e ignora tx.account_id —
  // com homônimas a primeira linha em ordem alfabética vence (getAccounts
  // ordena por name com desempate arbitrário). Cada teste coloca a homônima
  // DO OUTRO tipo primeiro na lista para expor a ambiguidade: o tipo tem que
  // vir do account_id da linha referenciada, não da ordem da lista.
  it("HOM — edição de transação que referencia a CONTA homônima mantém o account_id da conta e não cria linha nova", async () => {
    // Cartão "Itaú" ANTES da conta "Itaú" (desempate arbitrário de getAccounts
    // entre homônimas — a ordem não pode decidir o tipo).
    const fake = new FakeAccountRepository([cartaoItau, contaItau]);
    delegateToFake(fake);

    const { result } = renderForm([cartaoItau, contaItau]);

    act(() => {
      result.current.handleOpenEditModal(makeEditTx(contaItau));
    });

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    // Sem tocar na conta, o ponteiro da transação não muda: account_id da
    // CONTA referenciada (hoje o tipo é resolvido pelo nome, casa com o
    // cartão homônimo primeiro da lista e o update reponta para ele).
    expect(updateTransaction).toHaveBeenCalledWith(
      expect.anything(),
      "t1",
      expect.objectContaining({ account_id: "acc-conta" })
    );
    // Nenhuma linha nova e nenhum tipo trocado no repositório.
    const after = await fake.getAccounts();
    expect(after).toHaveLength(2);
    expect(after.find((a) => a.id === "acc-conta")?.type).toBe("conta");
    expect(after.find((a) => a.id === "acc-cartao")?.type).toBe("cartao");
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("HOM — edição de transação que referencia o CARTÃO homônimo mantém o account_id do cartão e não cria linha nova", async () => {
    // Conta "Itaú" ANTES do cartão "Itaú" (mesma ambiguidade, direção oposta:
    // Argos pediu explicitamente o caso do cartão — "editar a transação do
    // cartão mantém account_id da linha de cartão").
    const fake = new FakeAccountRepository([contaItau, cartaoItau]);
    delegateToFake(fake);

    const { result } = renderForm([contaItau, cartaoItau]);

    act(() => {
      result.current.handleOpenEditModal(makeEditTx(cartaoItau));
    });

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(updateTransaction).toHaveBeenCalledWith(
      expect.anything(),
      "t1",
      expect.objectContaining({ account_id: "acc-cartao" })
    );
    const after = await fake.getAccounts();
    expect(after).toHaveLength(2);
    expect(after.find((a) => a.id === "acc-conta")?.type).toBe("conta");
    expect(after.find((a) => a.id === "acc-cartao")?.type).toBe("cartao");
    expect(createTransaction).not.toHaveBeenCalled();
  });
});
