import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePlutoData } from "@/lib/pluto/hooks/usePlutoData";
import { getAllOpenMonthlyPeriods } from "@/lib/pluto/db/months";
import { getTransactionsByMonth } from "@/lib/pluto/db/transactions";
import { getAccounts } from "@/lib/pluto/db/accounts";
import { getCategories } from "@/lib/pluto/db/categories";
import { getBudgets } from "@/lib/pluto/db/budget";
import { getChecklistItemsByMonth, getGlobalChecklistItems } from "@/lib/pluto/db/checklist";

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

vi.mock("@/lib/pluto/db/months", () => ({
  getMonthlyPeriods: vi.fn(),
  getAllOpenMonthlyPeriods: vi.fn(),
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

vi.mock("@/lib/pluto/db/budget", () => ({
  getBudgets: vi.fn(),
}));

vi.mock("@/lib/pluto/db/checklist", () => ({
  getChecklistItemsByMonth: vi.fn(),
  createChecklistItem: vi.fn(),
  updateChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  toggleChecklistItemCompletion: vi.fn(),
  getGlobalChecklistItems: vi.fn(),
}));

describe("usePlutoData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAllOpenMonthlyPeriods).mockResolvedValue([
      { id: "p1", year: 2026, month: 3, status: "aberto", created_at: "2026-03-01T00:00:00Z", created_by: "t@t.com" },
    ]);
    vi.mocked(getTransactionsByMonth).mockResolvedValue([]);
    vi.mocked(getAccounts).mockResolvedValue([]);
    vi.mocked(getCategories).mockResolvedValue([]);
    vi.mocked(getBudgets).mockResolvedValue([]);
    vi.mocked(getChecklistItemsByMonth).mockResolvedValue([]);
    vi.mocked(getGlobalChecklistItems).mockResolvedValue([]);
  });

  it("carrega email, anos, meses e entidades; seleciona o mês aberto", async () => {
    const { result } = renderHook(() => usePlutoData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userEmail).toBe("teste@hestia.com");
    expect(result.current.availableYears).toEqual([2026]);
    expect(result.current.openMonths).toHaveLength(1);
    expect(result.current.selectedYear).toBe(2026);
    expect(result.current.selectedMonth).toBe(3);
    expect(result.current.errorMsg).toBeNull();
  });

  it("expõe delimitadores de data do mês selecionado", async () => {
    const { result } = renderHook(() => usePlutoData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.minDateStr).toBe("2026-03-01");
    expect(result.current.maxDateStr).toBe("2026-03-31");
  });

  it("estado vazio quando nenhum mês está aberto", async () => {
    vi.mocked(getAllOpenMonthlyPeriods).mockResolvedValue([]);

    const { result } = renderHook(() => usePlutoData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.availableYears).toEqual([]);
    expect(result.current.openMonths).toEqual([]);
    expect(result.current.transactions).toEqual([]);
  });

  it("expõe fetchData para recarregamento manual", async () => {
    const { result } = renderHook(() => usePlutoData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(vi.mocked(getAllOpenMonthlyPeriods).mock.calls.length).toBeGreaterThanOrEqual(1);
    await result.current.fetchData();
    expect(vi.mocked(getAllOpenMonthlyPeriods).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("faz um único fetch por mount mesmo quando a seleção inicial precisa de ajuste (single-flight)", async () => {
    const { result } = renderHook(() => usePlutoData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Seleção resolvida em memória no mesmo ciclo: exatamente 1 passe de rede.
    expect(vi.mocked(getAllOpenMonthlyPeriods)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getTransactionsByMonth)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getAccounts)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getCategories)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getBudgets)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getChecklistItemsByMonth)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getGlobalChecklistItems)).toHaveBeenCalledTimes(1);
    expect(result.current.selectedYear).toBe(2026);
    expect(result.current.selectedMonth).toBe(3);
  });
});
