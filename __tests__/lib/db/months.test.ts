import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod } from "@/lib/db/months";
import { SupabaseClient } from "@supabase/supabase-js";

const mockSupabase = {
  from: vi.fn(),
} as unknown as SupabaseClient;

describe("Serviço de Períodos Mensais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar periodos de um ano ordenados por mes", async () => {
    const mockData = [
      { id: "1", year: 2026, month: 1, status: "aberto", created_by: "user@hestia.com" },
      { id: "2", year: 2026, month: 2, status: "encerrado", created_by: "user@hestia.com" }
    ];

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null })
      })
    });

    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({ select: selectMock });

    const periods = await getMonthlyPeriods(mockSupabase, 2026);
    expect(periods).toHaveLength(2);
    expect(periods[0].month).toBe(1);
    expect(periods[1].status).toBe("encerrado");
  });

  it("deve abrir um periodo utilizando upsert", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({ upsert: upsertMock });

    await openMonthlyPeriod(mockSupabase, 2026, 3, "user@hestia.com");
    expect(upsertMock).toHaveBeenCalledWith({
      year: 2026,
      month: 3,
      status: "aberto",
      created_by: "user@hestia.com"
    }, { onConflict: "year,month" });
  });

  it("deve encerrar um periodo utilizando upsert", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({ upsert: upsertMock });

    await closeMonthlyPeriod(mockSupabase, 2026, 3, "user@hestia.com");
    expect(upsertMock).toHaveBeenCalledWith({
      year: 2026,
      month: 3,
      status: "encerrado",
      created_by: "user@hestia.com"
    }, { onConflict: "year,month" });
  });
});
