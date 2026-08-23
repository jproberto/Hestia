import { describe, it, expect, vi, beforeEach } from "vitest";
import { openMonthlyPeriod } from "@/lib/pluto/db/months";
import * as checklistDb from "@/lib/pluto/db/checklist";
import { SupabaseClient } from "@supabase/supabase-js";

const mockSupabase = {
  from: vi.fn(),
} as unknown as SupabaseClient;

describe("Integração do Checklist na Abertura do Mês", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve invocar a instanciacao dos itens do checklist ao abrir um mes", async () => {
    const spyInstantiate = vi.spyOn(checklistDb, "instantiateGlobalChecklistItemsForMonth").mockResolvedValue();

    const upsertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "m-august" }, error: null }),
      }),
    });

    (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === "monthly_periods") {
        return {
          upsert: upsertMock,
        };
      }
      return {};
    });

    await openMonthlyPeriod(mockSupabase, 2026, 8, "user@test.com");

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2026,
        month: 8,
        status: "aberto",
      }),
      { onConflict: "year,month" }
    );

    expect(spyInstantiate).toHaveBeenCalledWith(mockSupabase, "m-august", "user@test.com");
  });
});
