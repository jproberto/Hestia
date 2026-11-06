import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useTransactionForm,
  type UseTransactionFormOptions,
} from "@/lib/pluto/hooks/useTransactionForm";
import {
  createTransaction,
  updateTransaction,
} from "@/lib/pluto/db/transactions";
import { getOrCreateAccount } from "@/lib/pluto/db/accounts";
import { getOrCreateCategory } from "@/lib/pluto/db/categories";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { Account } from "@/lib/pluto/types";

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
const categories = [{ id: "c1", name: "Alimentação", type: "despesa" }] as never;

// Contrato 05e (plan §Hooks): as opções do formulário recebem o mês da tela
// (selectedYear/selectedMonth) e NÃO mais os delimitadores minDateStr/maxDateStr.
function makeFormOptions() {
  const fetchData = vi.fn(() => Promise.resolve());
  const setErrorMsg = vi.fn();
  return {
    db: {} as IDatabaseClient,
    userEmail: EMAIL,
    categories,
    selectedYear: 2026,
    selectedMonth: 3,
    fetchData,
    setErrorMsg,
  };
}

function renderForm(options: ReturnType<typeof makeFormOptions> = makeFormOptions()) {
  // Cast ponte: o contrato novo (selectedYear/selectedMonth) ainda não existe
  // nos tipos do hook atual — é exatamente o que o RED desta task fixa; o
  // cast desaparece em termos de efeito quando o hook migrar na T5.
  const hookOptions = options as unknown as UseTransactionFormOptions;
  const hook = renderHook(() => useTransactionForm(hookOptions));
  return { ...hook, options, fetchData: options.fetchData, setErrorMsg: options.setErrorMsg };
}

function fillValid(result: { current: ReturnType<typeof useTransactionForm> }) {
  act(() => {
    result.current.handleOpenTxModal(acc);
    result.current.setDescription("Supermercado");
    result.current.setAmount("200");
    result.current.setAccountInput("Itaú");
    result.current.setCategoryInput("Alimentação");
  });
}

function openEditModal(result: { current: ReturnType<typeof useTransactionForm> }) {
  act(() => {
    result.current.handleOpenEditModal({
      id: "t1", description: "Supermercado", amount: 200, type: "despesa",
      is_refund: false, date: "2026-03-15", category_id: "c1", account_id: "a1",
      period_year: 2026, period_month: 3,
      category_name: "Alimentação", account_name: "Itaú",
      created_at: "2026-03-15T00:00:00Z", created_by: EMAIL,
    });
  });
}

describe("useTransactionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrCreateAccount).mockResolvedValue("a1");
    vi.mocked(getOrCreateCategory).mockResolvedValue("c1");
    vi.mocked(createTransaction).mockResolvedValue({} as never);
    vi.mocked(updateTransaction).mockResolvedValue({} as never);
  });

  it("abre nova transação com a data no primeiro dia do mês da tela (opções sem minDateStr)", () => {
    const options = makeFormOptions();

    // Contrato 05e: as opções carregam o mês da tela e NÃO contêm minDateStr.
    expect(Object.keys(options)).not.toContain("minDateStr");
    expect(options.selectedYear).toBe(2026);
    expect(options.selectedMonth).toBe(3);

    const { result } = renderForm(options);

    act(() => {
      result.current.handleOpenTxModal(acc);
    });

    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.accountInput).toBe("Itaú");
    // Regra 2 / cenário 10: tela em 2026-03 abre com 2026-03-01.
    expect(result.current.date).toBe("2026-03-01");
    expect(result.current.editingTransaction).toBeNull();
  });

  it("abre nova transação no primeiro dia do mês da tela escolhido (selectedMonth 11)", () => {
    const options = { ...makeFormOptions(), selectedMonth: 11 };

    const { result } = renderForm(options);

    act(() => {
      result.current.handleOpenTxModal(acc);
    });

    expect(result.current.date).toBe("2026-11-01");
  });

  it("recusa salvar com campos vazios", async () => {
    const { result, setErrorMsg } = renderForm();

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(setErrorMsg).toHaveBeenCalledWith("Preencha todos os campos obrigatórios.");
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("recusa salvar com valor inválido", async () => {
    const { result, setErrorMsg } = renderForm();
    fillValid(result);

    act(() => {
      result.current.setAmount("abc");
    });

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(setErrorMsg).toHaveBeenCalledWith("O valor deve ser um número maior que zero.");
  });

  it("cria transação válida, fecha e recarrega", async () => {
    const { result, fetchData } = renderForm();
    fillValid(result);

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(createTransaction).toHaveBeenCalled();
    expect(result.current.isTxModalOpen).toBe(false);
    expect(fetchData).toHaveBeenCalled();
  });

  it("cria com period_year/period_month do mês da tela mesmo quando a data digitada é de outro mês", async () => {
    const { result } = renderForm();
    fillValid(result);

    // Regra 3 / cenário 1: fatura datada de outro mês lançada na tela de 2026-03.
    act(() => {
      result.current.setDate("2026-04-10");
    });

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(createTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        date: "2026-04-10",
        period_year: 2026,
        period_month: 3,
      }),
      EMAIL
    );
  });

  it("edita transação existente sem reenviar period_year/period_month no payload", async () => {
    const { result } = renderForm();
    openEditModal(result);

    expect(result.current.editingTransaction?.id).toBe("t1");

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(updateTransaction).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(updateTransaction).mock.calls[0][2];
    // Regra 8 / decisão D6: a edição não move o lançamento de mês — o payload
    // é TransactionUpdateInput, sem campos de período.
    expect(payload).not.toHaveProperty("period_year");
    expect(payload).not.toHaveProperty("period_month");
    expect(payload).toMatchObject({ amount: 200, date: "2026-03-15" });
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("salvar e adicionar outro mantém aberto, preserva a data digitada e zera os campos do 05d", async () => {
    const { result } = renderForm();
    fillValid(result);

    // Regra 10 / cenário 9: data digitada de outro mês permanece após salvar.
    act(() => {
      result.current.setDate("2026-04-10");
    });

    await act(async () => {
      await result.current.handleSaveTransactionAndAddAnother({ preventDefault: () => {} } as never);
    });

    expect(createTransaction).toHaveBeenCalled();
    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.txSuccessMsg).toBe("Transação salva com sucesso!");
    expect(result.current.date).toBe("2026-04-10");
    expect(result.current.description).toBe("");
    expect(result.current.amount).toBe("");
    expect(result.current.categoryInput).toBe("");
    expect(result.current.isRefund).toBe(false);
  });

  it("prefill do checklist resolve nome da categoria", () => {
    const { result } = renderForm();

    act(() => {
      result.current.handleTriggerTransactionModalFromChecklist({
        description: "Luz", type: "despesa", category_id: "c1", amount: 150, date: "2026-03-10",
      });
    });

    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.categoryInput).toBe("Alimentação");
    expect(result.current.amount).toBe("150");
  });
});
