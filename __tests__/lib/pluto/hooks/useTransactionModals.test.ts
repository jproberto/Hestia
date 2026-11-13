import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useTransactionModals,
  type TransactionModalsDeps,
} from "@/lib/pluto/hooks/useTransactionModals";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/pluto/db/transactions";
import { getOrCreateAccount } from "@/lib/pluto/db/accounts";
import { getOrCreateCategory } from "@/lib/pluto/db/categories";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { Account } from "@/lib/pluto/types";

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

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
const acc: Account = { id: "a1", name: "Itaú", type: "conta", created_at: null, created_by: null };

// Contrato 05e (plan §Hooks): TransactionModalsDeps recebe o mês da tela
// (selectedYear/selectedMonth) em vez dos delimitadores minDateStr/maxDateStr
// e repassa ao useTransactionForm.
function makeDeps() {
  const fetchData = vi.fn(() => Promise.resolve());
  const setErrorMsg = vi.fn();
  return {
    db: {} as IDatabaseClient,
    userEmail: EMAIL,
    categories: [] as never[],
    selectedYear: 2026,
    selectedMonth: 3,
    fetchData,
    setErrorMsg,
  };
}

function renderModals(deps: ReturnType<typeof makeDeps> = makeDeps()) {
  // Cast ponte: o contrato novo das deps ainda não existe nos tipos do hook
  // atual — é exatamente o que o RED desta task fixa.
  const hookDeps = deps as unknown as TransactionModalsDeps;
  return { ...renderHook(() => useTransactionModals(hookDeps)), deps };
}

describe("useTransactionModals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre o modal de nova transação pré-fixando conta e a data do mês da tela (deps sem minDateStr)", () => {
    const deps = makeDeps();

    // Contrato 05e: as deps carregam o mês da tela e NÃO contêm minDateStr.
    expect(Object.keys(deps)).not.toContain("minDateStr");
    expect(deps.selectedYear).toBe(2026);
    expect(deps.selectedMonth).toBe(3);

    const { result } = renderModals(deps);
    expect(result.current.isTxModalOpen).toBe(false);

    act(() => {
      result.current.handleOpenTxModal(acc);
    });

    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.accountInput).toBe("Itaú");
    // Regra 2 / cenário 10: tela em 2026-03 abre com 2026-03-01.
    expect(result.current.date).toBe("2026-03-01");
    expect(result.current.editingTransaction).toBeNull();
  });

  it("abre o modal de edição preenchendo os campos", () => {
    const { result } = renderModals();

    act(() => {
      result.current.handleOpenEditModal({
        id: "t1",
        description: "Supermercado",
        amount: 200,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "c1",
        account_id: "a1",
        period_year: 2026,
        period_month: 3,
        created_at: "x",
        created_by: EMAIL,
        category_name: "Alimentação",
        account_name: "Itaú",
      });
    });

    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.description).toBe("Supermercado");
    expect(result.current.amount).toBe("200");
  });

  it("fecha o modal de transação limpando a edição", () => {
    const { result } = renderModals();

    act(() => {
      result.current.handleOpenTxModal(acc);
    });
    expect(result.current.isTxModalOpen).toBe(true);

    act(() => {
      result.current.handleCloseTxModal();
    });
    expect(result.current.isTxModalOpen).toBe(false);
    expect(result.current.editingTransaction).toBeNull();
  });

  it("salva nova transação e recarrega", async () => {
    const deps = makeDeps();
    const { result } = renderModals(deps);
    vi.mocked(getOrCreateAccount).mockResolvedValue("a1");
    vi.mocked(getOrCreateCategory).mockResolvedValue("c1");
    vi.mocked(createTransaction).mockResolvedValue({} as never);

    act(() => {
      result.current.handleOpenTxModal(acc);
    });
    act(() => {
      result.current.setDescription("Luz");
      result.current.setAmount("120");
      result.current.setCategoryInput("Contas");
      result.current.setDate("2026-03-10");
    });

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(createTransaction).toHaveBeenCalled();
    expect(result.current.isTxModalOpen).toBe(false);
    expect(deps.fetchData).toHaveBeenCalled();
  });

  it("salva edição via updateTransaction", async () => {
    const { result } = renderModals();
    vi.mocked(getOrCreateAccount).mockResolvedValue("a1");
    vi.mocked(getOrCreateCategory).mockResolvedValue("c1");
    vi.mocked(updateTransaction).mockResolvedValue({} as never);

    act(() => {
      result.current.handleOpenEditModal({
        id: "t1",
        description: "X",
        amount: 10,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "c1",
        account_id: "a1",
        period_year: 2026,
        period_month: 3,
        created_at: "x",
        created_by: EMAIL,
        category_name: "Y",
        account_name: "Itaú",
      });
    });

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(updateTransaction).toHaveBeenCalled();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("exclusão confirma, fecha e recarrega", async () => {
    const deps = makeDeps();
    const { result } = renderModals(deps);

    act(() => {
      result.current.handleOpenDeleteModal({
        id: "t1",
        description: "X",
        amount: 10,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "c1",
        account_id: "a1",
        period_year: 2026,
        period_month: 3,
        created_at: "x",
        created_by: EMAIL,
        category_name: "Y",
        account_name: "Itaú",
      });
    });
    expect(result.current.isDeleteModalOpen).toBe(true);

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(deleteTransaction).toHaveBeenCalledWith(expect.anything(), "t1");
    expect(result.current.isDeleteModalOpen).toBe(false);
    expect(deps.fetchData).toHaveBeenCalled();
  });

  it("conta: abre, salva e fecha", async () => {
    const deps = makeDeps();
    const { result } = renderModals(deps);
    vi.mocked(getOrCreateAccount).mockResolvedValue("a9");

    act(() => {
      result.current.handleOpenAccModal();
    });
    expect(result.current.isAccModalOpen).toBe(true);

    act(() => {
      result.current.setNewAccName("Nubank");
    });

    await act(async () => {
      await result.current.handleSaveAccount({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(getOrCreateAccount).toHaveBeenCalledWith(expect.anything(), "Nubank", EMAIL, "conta");
    expect(result.current.isAccModalOpen).toBe(false);
    expect(deps.fetchData).toHaveBeenCalled();
  });

  it("prefill do checklist preenche o formulário", () => {
    const { result } = renderModals();

    act(() => {
      result.current.handleTriggerTransactionModalFromChecklist({
        description: "Internet",
        amount: 120,
        type: "despesa",
        category_id: "cat-9",
        date: "2026-03-10",
      });
    });

    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.description).toBe("Internet");
    expect(result.current.amount).toBe("120");
    expect(result.current.categoryInput).toBe("cat-9");
    expect(result.current.date).toBe("2026-03-10");
  });

  // R7 / contrato do plano §Hooks: useTransactionModals expõe o
  // handleCategoryBlur do useTransactionForm (a página repassa ao modal).
  it("expõe handleCategoryBlur vindo do useTransactionForm", () => {
    const deps = {
      ...makeDeps(),
      categories: [{ id: "c2", name: "Mercado", type: "receita" }] as never[],
    };
    const { result } = renderModals(deps);

    const modals = result.current as unknown as { handleCategoryBlur?: () => void };
    expect(typeof modals.handleCategoryBlur).toBe("function");

    act(() => {
      result.current.handleOpenTxModal(acc); // type = "despesa"
      result.current.setCategoryInput("mercado");
    });

    act(() => modals.handleCategoryBlur!());

    // Comportamento repassado do useTransactionForm: copia a grafia da
    // homônima do outro tipo ("Mercado" receita) no blur.
    expect(result.current.categoryInput).toBe("Mercado");
  });
});
