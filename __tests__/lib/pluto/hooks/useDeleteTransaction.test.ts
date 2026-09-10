import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeleteTransaction } from "@/lib/pluto/hooks/useDeleteTransaction";
import { deleteTransaction } from "@/lib/pluto/db/transactions";
import type { IDatabaseClient } from "@/lib/shared/database";

vi.mock("@/lib/pluto/db/transactions", () => ({
  getTransactionsByMonth: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

const tx = { id: "t1", description: "Supermercado" } as never;

function renderFlow() {
  const fetchData = vi.fn(() => Promise.resolve());
  const setErrorMsg = vi.fn();
  const hook = renderHook(() =>
    useDeleteTransaction({ db: {} as IDatabaseClient, fetchData, setErrorMsg })
  );
  return { ...hook, fetchData, setErrorMsg };
}

describe("useDeleteTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteTransaction).mockResolvedValue(undefined);
  });

  it("abre e fecha o modal de exclusão", () => {
    const { result } = renderFlow();

    act(() => {
      result.current.handleOpenDeleteModal(tx);
    });
    expect(result.current.isDeleteModalOpen).toBe(true);
    expect(result.current.deletingTransaction).toEqual(tx);

    act(() => {
      result.current.handleCloseDeleteModal();
    });
    expect(result.current.isDeleteModalOpen).toBe(false);
    expect(result.current.deletingTransaction).toBeNull();
  });

  it("confirma exclusão, fecha e recarrega", async () => {
    const { result, fetchData } = renderFlow();

    act(() => {
      result.current.handleOpenDeleteModal(tx);
    });

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(deleteTransaction).toHaveBeenCalledWith(expect.anything(), "t1");
    expect(result.current.isDeleteModalOpen).toBe(false);
    expect(fetchData).toHaveBeenCalled();
  });

  it("ignora confirmar sem seleção", async () => {
    const { result } = renderFlow();

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(deleteTransaction).not.toHaveBeenCalled();
  });
});
