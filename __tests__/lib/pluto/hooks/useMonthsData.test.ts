import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useMonthsData } from "@/lib/pluto/hooks/useMonthsData";
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod } from "@/lib/pluto/db/months";
import type { MonthlyPeriod } from "@/lib/pluto/types";

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

vi.mock("@/lib/pluto/db/months", () => ({
  getMonthlyPeriods: vi.fn(),
  openMonthlyPeriod: vi.fn(),
  closeMonthlyPeriod: vi.fn(),
  getAllOpenMonthlyPeriods: vi.fn(),
}));

const period2026: MonthlyPeriod = { id: "p1", year: 2026, month: 1, status: "aberto", created_at: "2026-01-01T00:00:00Z", created_by: "t@t.com" };

describe("useMonthsData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMonthlyPeriods).mockResolvedValue([period2026]);
    vi.mocked(openMonthlyPeriod).mockResolvedValue(undefined);
    vi.mocked(closeMonthlyPeriod).mockResolvedValue(undefined);
  });

  it("carrega períodos do ano e calcula o resumo", async () => {
    const { result } = renderHook(() => useMonthsData(2026));

    await waitFor(() => {
      expect(result.current.periods).toHaveLength(1);
    });

    expect(vi.mocked(getMonthlyPeriods)).toHaveBeenCalledTimes(1);
    expect(result.current.userEmail).toBe("teste@hestia.com");
    expect(result.current.totalOpen).toBe(1);
    expect(result.current.totalClosed).toBe(0);
    expect(result.current.totalNotStarted).toBe(11);
    expect(result.current.errorMessage).toBeNull();
  });

  it("recarrega ao trocar o ano", async () => {
    const { result, rerender } = renderHook(({ year }) => useMonthsData(year), {
      initialProps: { year: 2026 },
    });

    await waitFor(() => {
      expect(result.current.periods).toHaveLength(1);
    });

    rerender({ year: 2027 });

    await waitFor(() => {
      expect(vi.mocked(getMonthlyPeriods)).toHaveBeenCalledTimes(2);
    });
    expect(vi.mocked(getMonthlyPeriods)).toHaveBeenLastCalledWith(expect.any(Object), 2027);
  });

  it("abre mês e recarrega a lista", async () => {
    const { result } = renderHook(() => useMonthsData(2026));

    await waitFor(() => {
      expect(result.current.periods).toHaveLength(1);
    });

    await act(async () => {
      await result.current.handleOpenMonth(2);
    });

    expect(vi.mocked(openMonthlyPeriod)).toHaveBeenCalledWith(expect.any(Object), 2026, 2, "teste@hestia.com");
    expect(vi.mocked(getMonthlyPeriods)).toHaveBeenCalledTimes(2);
    expect(result.current.actionLoading[2]).toBe(false);
  });

  it("encerra mês e recarrega a lista", async () => {
    const { result } = renderHook(() => useMonthsData(2026));

    await waitFor(() => {
      expect(result.current.periods).toHaveLength(1);
    });

    await act(async () => {
      await result.current.handleCloseMonth(1);
    });

    expect(vi.mocked(closeMonthlyPeriod)).toHaveBeenCalledWith(expect.any(Object), 2026, 1, "teste@hestia.com");
    expect(vi.mocked(getMonthlyPeriods)).toHaveBeenCalledTimes(2);
  });

  it("mapeia erro de tabela ausente para a dica de migração", async () => {
    vi.mocked(getMonthlyPeriods).mockRejectedValue(new Error('relation "monthly_periods" does not exist'));

    const { result } = renderHook(() => useMonthsData(2026));

    await waitFor(() => {
      expect(result.current.errorMessage).toContain("não existe no Supabase");
    });
  });

  it("avisa quando o usuário não está autenticado ao abrir mês", async () => {
    const { createBrowserDatabaseClient } = await import("@/lib/shared/supabaseClient");
    vi.mocked(createBrowserDatabaseClient).mockReturnValueOnce({
      from: () => { throw new Error("use mocked db barrels in tests"); },
      getUserEmail: () => Promise.resolve(null),
    } as never);
    vi.mocked(getMonthlyPeriods).mockResolvedValue([]);

    const { result } = renderHook(() => useMonthsData(2026));

    await waitFor(() => {
      expect(vi.mocked(getMonthlyPeriods)).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleOpenMonth(2);
    });

    expect(result.current.errorMessage).toContain("Não foi possível identificar o usuário autenticado");
    expect(vi.mocked(openMonthlyPeriod)).not.toHaveBeenCalled();
  });
});
