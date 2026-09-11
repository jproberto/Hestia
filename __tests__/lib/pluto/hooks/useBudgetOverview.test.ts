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

let mockMonthParam: string | null = null;

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "mockMonth" ? mockMonthParam : null) }),
}));

const revision = { id: "r1", year: 2026, start_month: 1, description: "Orçamento Inicial 2026" };
const adjustments = [
  { id: "r1", year: 2026, start_month: 1, description: "Orçamento Inicial 2026" },
  { id: "a2", year: 2026, start_month: 3, description: "Ajuste Mar" },
];

describe("useBudgetOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMonthParam = null;
    vi.mocked(getBudgetAdjustment).mockResolvedValue(revision as never);
    vi.mocked(getBudgetAdjustments).mockResolvedValue(adjustments as never);
    vi.mocked(initBudget).mockResolvedValue("r1");
    vi.mocked(createBudgetAdjustment).mockResolvedValue("a3");
  });

  it("seleciona por padrão o ajuste vigente do mês corrente (maior start_month <= mês)", async () => {
    mockMonthParam = "9";
    const { result } = renderHook(() => useBudgetOverview());

    await waitFor(() => {
      expect(result.current.revision).toEqual(revision);
    });

    await waitFor(() => {
      expect(result.current.selectedAdjustmentId).toBe("a2");
    });

    expect(result.current.adjustments).toEqual(adjustments);
    expect(result.current.activeAdjustment).toEqual(adjustments[1]);
    expect(result.current.userEmail).toBe("teste@hestia.com");
  });

  it("usa o ajuste mais recente quando nenhum iniciou ainda", async () => {
    mockMonthParam = "1";
    vi.mocked(getBudgetAdjustments).mockResolvedValue([
      { id: "a5", year: 2026, start_month: 5, description: "Ajuste Mai" },
      { id: "a8", year: 2026, start_month: 8, description: "Ajuste Ago" },
    ] as never);
    const { result } = renderHook(() => useBudgetOverview());

    await waitFor(() => {
      expect(result.current.selectedAdjustmentId).toBe("a8");
    });

    expect(result.current.activeAdjustment).toEqual(
      expect.objectContaining({ id: "a8" })
    );
  });

  it("seleção manual prevalece sobre o padrão", async () => {
    mockMonthParam = "9";
    const { result } = renderHook(() => useBudgetOverview());

    await waitFor(() => {
      expect(result.current.selectedAdjustmentId).toBe("a2");
    });

    act(() => { result.current.setSelectedAdjustmentId("r1"); });

    await waitFor(() => {
      expect(result.current.activeAdjustment).toEqual(adjustments[0]);
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

  it("trocar o ano limpa a seleção e aplica o padrão do novo ano", async () => {
    mockMonthParam = "9";
    const { result } = renderHook(() => useBudgetOverview());

    await waitFor(() => {
      expect(result.current.selectedAdjustmentId).toBe("a2");
    });

    act(() => { result.current.handleSelectYear(2027); });

    expect(result.current.year).toBe(2027);

    await waitFor(() => {
      expect(result.current.selectedAdjustmentId).toBe("a2");
    });
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
