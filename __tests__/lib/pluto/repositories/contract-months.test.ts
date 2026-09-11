import { describe, it, expect, beforeEach } from "vitest";
import type { IMonthRepository } from "@/lib/pluto/repositories/interfaces";
import { FakeMonthRepository } from "@/lib/pluto/repositories/fakes";

export interface MonthContractBuild {
  repo: IMonthRepository;
  reset(): void;
}

/**
 * Shared contract for IMonthRepository implementations.
 */
export function defineMonthRepositoryContract(
  label: string,
  build: () => MonthContractBuild
) {
  describe(`IMonthRepository contract: ${label}`, () => {
    const EMAIL = "contrato@hestia.com";
    let ctx: MonthContractBuild;

    beforeEach(() => {
      ctx = build();
      ctx.reset();
    });

    it("open cria período aberto; getMonthlyPeriods ordena por mês", async () => {
      await ctx.repo.openMonthlyPeriod(2026, 3, EMAIL);
      await ctx.repo.openMonthlyPeriod(2026, 1, EMAIL);

      const periods = await ctx.repo.getMonthlyPeriods(2026);
      expect(periods.map((p) => p.month)).toEqual([1, 3]);
      expect(periods.every((p) => p.status === "aberto")).toBe(true);
    });

    it("open é idempotente para o mesmo ano/mês", async () => {
      await ctx.repo.openMonthlyPeriod(2026, 3, EMAIL);
      await ctx.repo.openMonthlyPeriod(2026, 3, EMAIL);

      const periods = await ctx.repo.getMonthlyPeriods(2026);
      expect(periods.filter((p) => p.month === 3)).toHaveLength(1);
    });

    it("close alterna o status para encerrado", async () => {
      await ctx.repo.openMonthlyPeriod(2026, 3, EMAIL);
      await ctx.repo.closeMonthlyPeriod(2026, 3, EMAIL);

      const periods = await ctx.repo.getMonthlyPeriods(2026);
      expect(periods.find((p) => p.month === 3)?.status).toBe("encerrado");
    });

    it("getAllOpenMonthlyPeriods retorna apenas abertos", async () => {
      await ctx.repo.openMonthlyPeriod(2026, 1, EMAIL);
      await ctx.repo.openMonthlyPeriod(2026, 2, EMAIL);
      await ctx.repo.closeMonthlyPeriod(2026, 2, EMAIL);

      const open = await ctx.repo.getAllOpenMonthlyPeriods();
      expect(open.map((p) => p.month)).toEqual([1]);
    });

    it("reopen alterna de volta para aberto", async () => {
      await ctx.repo.openMonthlyPeriod(2026, 5, EMAIL);
      await ctx.repo.closeMonthlyPeriod(2026, 5, EMAIL);
      await ctx.repo.openMonthlyPeriod(2026, 5, EMAIL);

      const periods = await ctx.repo.getMonthlyPeriods(2026);
      expect(periods.find((p) => p.month === 5)?.status).toBe("aberto");
    });

    it("getMonthlyPeriods filtra pelo ano", async () => {
      await ctx.repo.openMonthlyPeriod(2026, 1, EMAIL);
      await ctx.repo.openMonthlyPeriod(2027, 1, EMAIL);

      expect(await ctx.repo.getMonthlyPeriods(2026)).toHaveLength(1);
      expect(await ctx.repo.getMonthlyPeriods(2027)).toHaveLength(1);
    });
  });
}

defineMonthRepositoryContract("FakeMonthRepository", () => {
  const repo = new FakeMonthRepository();
  return {
    repo,
    reset: () => repo.reset(),
  };
});
