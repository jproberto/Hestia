import { describe, it, expect, beforeEach, vi, type MockInstance } from "vitest";
import { FakeMonthRepository } from "@/lib/pluto/repositories/fakes";
import { FakeChecklistRepository } from "@/lib/pluto/repositories/fakes";

describe("Serviço de Períodos Mensais", () => {
  let monthRepo: FakeMonthRepository;
  let checklistRepo: FakeChecklistRepository;
  let instantiateSpy: MockInstance<(monthId: string, email: string) => Promise<void>>;

  beforeEach(() => {
    monthRepo = new FakeMonthRepository();
    checklistRepo = new FakeChecklistRepository();
    instantiateSpy = vi.spyOn(checklistRepo, "instantiateGlobalChecklistItemsForMonth").mockResolvedValue();
  });

  it("deve carregar periodos de um ano ordenados por mes", async () => {
    monthRepo.seed([
      { id: "1", year: 2026, month: 1, status: "aberto", created_at: "2026-01-01T00:00:00Z", created_by: "user@hestia.com" },
      { id: "2", year: 2026, month: 2, status: "encerrado", created_at: "2026-02-01T00:00:00Z", created_by: "user@hestia.com" },
    ]);

    const periods = await monthRepo.getMonthlyPeriods(2026);
    expect(periods).toHaveLength(2);
    expect(periods[0].month).toBe(1);
    expect(periods[1].status).toBe("encerrado");
  });

  it("deve abrir um periodo utilizando upsert e instanciar checklist global", async () => {
    await monthRepo.openMonthlyPeriod(2026, 3, "user@hestia.com");

    const periods = await monthRepo.getMonthlyPeriods(2026);
    expect(periods).toHaveLength(1);
    expect(periods[0].month).toBe(3);
    expect(periods[0].status).toBe("aberto");
    expect(periods[0].created_by).toBe("user@hestia.com");

    // Note: The actual instantiation is tested in months-checklist.test.ts
    // Here we just verify the period was created
  });

  it("deve encerrar um periodo utilizando upsert", async () => {
    await monthRepo.closeMonthlyPeriod(2026, 3, "user@hestia.com");

    const periods = await monthRepo.getMonthlyPeriods(2026);
    expect(periods).toHaveLength(1);
    expect(periods[0].month).toBe(3);
    expect(periods[0].status).toBe("encerrado");
    expect(periods[0].created_by).toBe("user@hestia.com");
  });
});