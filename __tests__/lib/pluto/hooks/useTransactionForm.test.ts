import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactionForm } from "@/lib/pluto/hooks/useTransactionForm";
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

function renderForm() {
  const fetchData = vi.fn(() => Promise.resolve());
  const setErrorMsg = vi.fn();
  const hook = renderHook(() =>
    useTransactionForm({
      db: {} as IDatabaseClient,
      userEmail: EMAIL,
      categories,
      minDateStr: "2026-03-01",
      fetchData,
      setErrorMsg,
    })
  );
  return { ...hook, fetchData, setErrorMsg };
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

describe("useTransactionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrCreateAccount).mockResolvedValue("a1");
    vi.mocked(getOrCreateCategory).mockResolvedValue("c1");
    vi.mocked(createTransaction).mockResolvedValue({} as never);
    vi.mocked(updateTransaction).mockResolvedValue({} as never);
  });

  it("abre nova transação pré-fixando conta e data mínima", () => {
    const { result } = renderForm();

    act(() => {
      result.current.handleOpenTxModal(acc);
    });

    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.accountInput).toBe("Itaú");
    expect(result.current.date).toBe("2026-03-01");
    expect(result.current.editingTransaction).toBeNull();
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

  it("edita transação existente via updateTransaction", async () => {
    const { result } = renderForm();

    act(() => {
      result.current.handleOpenEditModal({
        id: "t1", description: "Supermercado", amount: 200, type: "despesa",
        is_refund: false, date: "2026-03-15", category_id: "c1", account_id: "a1",
        category_name: "Alimentação", account_name: "Itaú",
        created_at: "2026-03-15T00:00:00Z", created_by: EMAIL,
      });
    });
    expect(result.current.editingTransaction?.id).toBe("t1");

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(updateTransaction).toHaveBeenCalledWith(expect.anything(), "t1", expect.objectContaining({ amount: 200 }));
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("salvar e adicionar mantém aberto com mensagem de sucesso", async () => {
    const { result } = renderForm();
    fillValid(result);

    await act(async () => {
      await result.current.handleSaveTransactionAndAddAnother({ preventDefault: () => {} } as never);
    });

    expect(createTransaction).toHaveBeenCalled();
    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.txSuccessMsg).toBe("Transação salva com sucesso!");
    expect(result.current.description).toBe("");
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
