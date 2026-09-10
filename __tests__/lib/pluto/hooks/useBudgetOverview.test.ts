import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useBudgetOverview } from "@/lib/pluto/hooks/useBudgetOverview";
import { getBudgetAdjustment, getBudgetAdjustments, initBudget, createBudgetAdjustment } from "@/lib/pluto/db/budget";

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

vi.mock("@/lib/pluto/db/budget", () => ({
  initBudget: vi.fn(),
  createBudgetAdjustment: vi.fn(),
  getBudgetAdjustment: vi.fn(),
  getBudgetAdjustments: vi.fn(),
  adjustBudgetItem: vi.fn(),
  getBudgets: vi.fn().mockResolvedValue([]),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

const revision = { id: "r1", year: 2026, start_month: 1, description: "Orçamento Inicial 2026" };
const adjustments = [
  { id: "r1", year: 2026, start_month: 1, description: "Orçamento Inicial 2026" },
  { id: "a2", year: 2026, start_month: 3, description: "Ajuste Mar" },
];

describe("useBudgetOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBudgetAdjustment).mockResolvedValue(revision as never);
    vi.mocked(getBudgetAdjustments).mockResolvedValue(adjustments as never);
    vi.mocked(initBudget).mockResolvedValue("r1");
    vi.mocked(createBudgetAdjustment).mockResolvedValue("a3");
  });

  it("carrega revisão e ajustes do ano; sem seleção o ajuste ativo é nulo", async () => {
    const { result } = renderHook(() => useBudgetOverview());

    await waitFor(() => {
      expect(result.current.revision).toEqual(revision);
    });

    expect(result.current.adjustments).toEqual(adjustments);
    expect(result.current.activeAdjustment).toBeNull();
    expect(result.current.userEmail).toBe("teste@hestia.com");
    expect(result.current.isEditable).toBe(false);
  });

  it("ativa o ajuste selecionado", async () => {
    const { result } = renderHook(() => useBudgetOverview());

    await waitFor(() => {
      expect(result.current.revision).toEqual(revision);
    });

    act(() => { result.current.setSelectedAdjustmentId("a2"); });

    await waitFor(() => {
      expect(result.current.activeAdjustment).toEqual(adjustments[1]);
    });
  });

  it("inicia orçamento e recarrega", async () => {
    vi.mocked(getBudgetAdjustment).mockResolvedValue(null);
    const { result } = renderHook(() => useBudgetOverview());

    await waitFor(() => {
      expect(vi.mocked(getBudgetAdjustment)).toHaveBeenCalled();
    });

    await act(async () => { await result.current.handleStartBudget(); });

    expect(vi.mocked(initBudget)).toHaveBeenCalledWith(expect.any(Object), expect.any(Number), "teste@hestia.com");
  });

  it("cria ajuste, seleciona e recarrega", async () => {
    const { result } = renderHook(() => useBudgetOverview());

    await waitFor(() => {
      expect(result.current.revision).toEqual(revision);
    });

    await act(async () => { await result.current.handleCreateAdjustment(); });

    expect(vi.mocked(createBudgetAdjustment)).toHaveBeenCalled();
    expect(result.current.selectedAdjustmentId).toBe("a3");
  });

  it("trocar o ano limpa a seleção do ajuste", async () => {
    const { result } = renderHook(() => useBudgetOverview());

    await waitFor(() => {
      expect(result.current.revision).toEqual(revision);
    });

    act(() => { result.current.setSelectedAdjustmentId("a2"); });
    act(() => { result.current.handleSelectYear(2027); });

    expect(result.current.year).toBe(2027);
    expect(result.current.selectedAdjustmentId).toBeNull();
  });

  it("sem revisão limpa ajustes e ativo", async () => {
    vi.mocked(getBudgetAdjustment).mockResolvedValue(null);
    const { result } = renderHook(() => useBudgetOverview());

    // userEmail prova que a carga rodou até o fim
    await waitFor(() => {
      expect(result.current.userEmail).toBe("teste@hestia.com");
    });

    expect(vi.mocked(getBudgetAdjustments)).not.toHaveBeenCalled();
    expect(result.current.adjustments).toEqual([]);
    expect(result.current.activeAdjustment).toBeNull();
  });
});
