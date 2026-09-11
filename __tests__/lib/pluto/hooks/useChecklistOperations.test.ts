import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChecklistOperations, type ChecklistOperationsDeps } from "@/lib/pluto/hooks/useChecklistOperations";
import {
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItemCompletion,
} from "@/lib/pluto/db/checklist";
import { adjustBudgetItem } from "@/lib/pluto/db/budget";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { ChecklistItem } from "@/lib/pluto/types";

vi.mock("@/lib/pluto/db/checklist", () => ({
  getChecklistItemsByMonth: vi.fn(),
  createChecklistItem: vi.fn(),
  updateChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  toggleChecklistItemCompletion: vi.fn(),
  getGlobalChecklistItems: vi.fn(),
}));

vi.mock("@/lib/pluto/db/budget", () => ({
  getBudgets: vi.fn(),
  adjustBudgetItem: vi.fn(),
}));

const EMAIL = "teste@hestia.com";

function makeItem(overrides: Partial<ChecklistItem> & { id: string }): ChecklistItem {
  return {
    parent_id: null,
    month_id: "mes-1",
    day: 10,
    description: "Internet",
    type: "despesa",
    category_id: "cat-1",
    amount: 120,
    is_completed: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    created_by: EMAIL,
    category_name: "Contas",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ChecklistOperationsDeps> = {}): ChecklistOperationsDeps {
  return {
    db: {} as IDatabaseClient,
    selectedYear: 2026,
    selectedMonth: 10,
    openMonths: [
      { id: "mes-1", year: 2026, month: 10, status: "aberto", created_at: "2026-10-01T00:00:00Z", created_by: EMAIL },
    ],
    userEmail: EMAIL,
    categories: [{ id: "cat-1", name: "Contas", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: EMAIL }],
    budgetItems: [
      { category_id: "cat-1", category_name: "Contas", category_type: "despesa", amount: 100, start_month: 1 },
    ],
    checklistItems: [],
    globalChecklistItems: [
      makeItem({ id: "g1", month_id: null, amount: 80 }),
    ],
    setChecklistItems: vi.fn(),
    setErrorMsg: vi.fn(),
    fetchData: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe("useChecklistOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggle chama o repositório e atualiza a lista local", async () => {
    const setChecklistItems = vi.fn();
    const { result } = renderHook(() =>
      useChecklistOperations(makeDeps({
        checklistItems: [makeItem({ id: "i1" })],
        setChecklistItems,
      }))
    );

    await act(async () => {
      await result.current.handleToggleChecklistItem("i1", true);
    });

    expect(toggleChecklistItemCompletion).toHaveBeenCalledWith(expect.anything(), "i1", true);
    expect(setChecklistItems).toHaveBeenCalled();
  });

  it("add com estouro abre o modal com operação pendente (sem gravar)", async () => {
    const { result } = renderHook(() => useChecklistOperations(makeDeps()));

    await act(async () => {
      await result.current.handleAddChecklistItem(
        { day: 10, description: "Luz", type: "despesa", category_id: "cat-1", amount: 50, created_by: EMAIL },
        true
      );
    });

    expect(result.current.isOverflowModalOpen).toBe(true);
    expect(result.current.overflowData?.pendingOperation).toMatchObject({ type: "create", isGlobal: true });
    expect(createChecklistItem).not.toHaveBeenCalled();
  });

  it("add sem estouro grava e recarrega", async () => {
    const fetchData = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      useChecklistOperations(makeDeps({
        globalChecklistItems: [],
        fetchData,
      }))
    );

    await act(async () => {
      await result.current.handleAddChecklistItem(
        { day: 10, description: "Luz", type: "despesa", category_id: "cat-1", amount: 50, created_by: EMAIL },
        true
      );
    });

    expect(result.current.isOverflowModalOpen).toBe(false);
    expect(createChecklistItem).toHaveBeenCalled();
    expect(fetchData).toHaveBeenCalled();
  });

  it("confirm do overflow ajusta o orçamento e executa a operação pendente", async () => {
    const fetchData = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useChecklistOperations(makeDeps({ fetchData })));

    await act(async () => {
      await result.current.handleAddChecklistItem(
        { day: 10, description: "Luz", type: "despesa", category_id: "cat-1", amount: 50, created_by: EMAIL },
        true
      );
    });
    expect(result.current.isOverflowModalOpen).toBe(true);

    await act(async () => {
      await result.current.handleOverflowConfirm(150);
    });

    expect(adjustBudgetItem).toHaveBeenCalledWith(
      expect.anything(), 2026, 10, "Contas", "despesa", 150, EMAIL
    );
    expect(createChecklistItem).toHaveBeenCalled();
    expect(fetchData).toHaveBeenCalled();
  });

  it("cancel do overflow fecha sem gravar", async () => {
    const { result } = renderHook(() => useChecklistOperations(makeDeps()));

    await act(async () => {
      await result.current.handleAddChecklistItem(
        { day: 10, description: "Luz", type: "despesa", category_id: "cat-1", amount: 50, created_by: EMAIL },
        true
      );
    });
    expect(result.current.isOverflowModalOpen).toBe(true);

    await act(async () => {
      result.current.handleOverflowCancel();
    });

    expect(result.current.isOverflowModalOpen).toBe(false);
    expect(result.current.overflowData).toBeNull();
    expect(createChecklistItem).not.toHaveBeenCalled();
  });

  it("delete remove e recarrega", async () => {
    const fetchData = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useChecklistOperations(makeDeps({ fetchData })));

    await act(async () => {
      await result.current.handleDeleteChecklistItem("i1", false, null);
    });

    expect(deleteChecklistItem).toHaveBeenCalledWith(expect.anything(), "i1", false, null);
    expect(fetchData).toHaveBeenCalled();
  });

  it("edit sem estouro atualiza e recarrega", async () => {
    const fetchData = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useChecklistOperations(makeDeps({ fetchData })));

    await act(async () => {
      await result.current.handleEditChecklistItem("i1", { description: "Novo" }, false, null);
    });

    expect(updateChecklistItem).toHaveBeenCalledWith(
      expect.anything(), "i1", { description: "Novo" }, false, null
    );
    expect(fetchData).toHaveBeenCalled();
  });
});
