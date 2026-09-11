import { describe, it, expect, beforeEach } from "vitest";
import { FakeMonthRepository } from "@/lib/pluto/repositories/fakes";

describe("FakeMonthRepository", () => {
  let repo: FakeMonthRepository;

  beforeEach(() => {
    repo = new FakeMonthRepository();
  });

  it("deve carregar períodos de um ano ordenados por mês", async () => {
    repo.seed([
      { id: "m-2", year: 2026, month: 2, status: "encerrado", created_at: "2026-02-01T00:00:00Z", created_by: "user@hestia.com" },
      { id: "m-1", year: 2026, month: 1, status: "aberto", created_at: "2026-01-01T00:00:00Z", created_by: "user@hestia.com" },
      { id: "m-3", year: 2025, month: 12, status: "encerrado", created_at: "2025-12-01T00:00:00Z", created_by: "user@hestia.com" },
    ]);

    const periods = await repo.getMonthlyPeriods(2026);
    expect(periods).toHaveLength(2);
    expect(periods[0].month).toBe(1);
    expect(periods[0].status).toBe("aberto");
    expect(periods[1].month).toBe(2);
    expect(periods[1].status).toBe("encerrado");
  });

  it("deve retornar apenas períodos abertos ordenados por ano e mês", async () => {
    repo.seed([
      { id: "m-1", year: 2026, month: 3, status: "encerrado", created_at: "2026-03-01T00:00:00Z", created_by: "user@hestia.com" },
      { id: "m-2", year: 2026, month: 1, status: "aberto", created_at: "2026-01-01T00:00:00Z", created_by: "user@hestia.com" },
      { id: "m-3", year: 2025, month: 12, status: "aberto", created_at: "2025-12-01T00:00:00Z", created_by: "user@hestia.com" },
      { id: "m-4", year: 2026, month: 5, status: "aberto", created_at: "2026-05-01T00:00:00Z", created_by: "user@hestia.com" },
    ]);

    const openPeriods = await repo.getAllOpenMonthlyPeriods();
    expect(openPeriods).toHaveLength(3);
    expect(openPeriods[0].year).toBe(2025);
    expect(openPeriods[0].month).toBe(12);
    expect(openPeriods[1].year).toBe(2026);
    expect(openPeriods[1].month).toBe(1);
    expect(openPeriods[2].year).toBe(2026);
    expect(openPeriods[2].month).toBe(5);
  });

  it("deve abrir um período utilizando upsert (cria se não existe)", async () => {
    await repo.openMonthlyPeriod(2026, 3, "user@hestia.com");

    const periods = await repo.getMonthlyPeriods(2026);
    expect(periods).toHaveLength(1);
    expect(periods[0].month).toBe(3);
    expect(periods[0].status).toBe("aberto");
    expect(periods[0].created_by).toBe("user@hestia.com");
  });

  it("deve abrir um período existente atualizando status e created_by", async () => {
    repo.seed([
      { id: "m-3", year: 2026, month: 3, status: "encerrado", created_at: "2026-03-01T00:00:00Z", created_by: "old@hestia.com" },
    ]);

    await repo.openMonthlyPeriod(2026, 3, "new@hestia.com");

    const periods = await repo.getMonthlyPeriods(2026);
    expect(periods).toHaveLength(1);
    expect(periods[0].status).toBe("aberto");
    expect(periods[0].created_by).toBe("new@hestia.com");
  });

  it("deve encerrar um período utilizando upsert (cria se não existe)", async () => {
    await repo.closeMonthlyPeriod(2026, 3, "user@hestia.com");

    const periods = await repo.getMonthlyPeriods(2026);
    expect(periods).toHaveLength(1);
    expect(periods[0].month).toBe(3);
    expect(periods[0].status).toBe("encerrado");
    expect(periods[0].created_by).toBe("user@hestia.com");
  });

  it("deve encerrar um período existente atualizando status e created_by", async () => {
    repo.seed([
      { id: "m-3", year: 2026, month: 3, status: "aberto", created_at: "2026-03-01T00:00:00Z", created_by: "old@hestia.com" },
    ]);

    await repo.closeMonthlyPeriod(2026, 3, "new@hestia.com");

    const periods = await repo.getMonthlyPeriods(2026);
    expect(periods).toHaveLength(1);
    expect(periods[0].status).toBe("encerrado");
    expect(periods[0].created_by).toBe("new@hestia.com");
  });

  it("reset deve limpar todos os dados", async () => {
    repo.seed([
      { id: "m-1", year: 2026, month: 1, status: "aberto", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    repo.reset();
    const periods = await repo.getMonthlyPeriods(2026);
    expect(periods).toHaveLength(0);
  });
});