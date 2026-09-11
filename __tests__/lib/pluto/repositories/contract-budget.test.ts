import { describe, it, expect, beforeEach } from "vitest";
import type { IBudgetRepository } from "@/lib/pluto/repositories/interfaces";
import { FakeBudgetRepository } from "@/lib/pluto/repositories/fakes";

export interface BudgetContractBuild {
  repo: IBudgetRepository;
  reset(): void;
}

/**
 * Shared contract for IBudgetRepository implementations.
 */
export function defineBudgetRepositoryContract(
  label: string,
  build: () => BudgetContractBuild
) {
  describe(`IBudgetRepository contract: ${label}`, () => {
    const EMAIL = "contrato@hestia.com";
    let ctx: BudgetContractBuild;

    beforeEach(() => {
      ctx = build();
      ctx.reset();
    });

    it("getBudgetAdjustment retorna null antes do init", async () => {
      expect(await ctx.repo.getBudgetAdjustment(2026)).toBeNull();
    });

    it("initBudget cria revisão de janeiro e é idempotente", async () => {
      const id1 = await ctx.repo.initBudget(2026, EMAIL);
      const id2 = await ctx.repo.initBudget(2026, EMAIL);
      expect(id1).toBe(id2);

      const revision = await ctx.repo.getBudgetAdjustment(2026);
      expect(revision).toMatchObject({ year: 2026, start_month: 1 });
    });

    it("createBudgetAdjustment retorna id existente para mesmo ano/mês", async () => {
      const id1 = await ctx.repo.createBudgetAdjustment(2026, 3, EMAIL);
      const id2 = await ctx.repo.createBudgetAdjustment(2026, 3, EMAIL);
      expect(id1).toBe(id2);
    });

    it("getBudgetAdjustments ordena por start_month", async () => {
      await ctx.repo.createBudgetAdjustment(2026, 5, EMAIL);
      await ctx.repo.createBudgetAdjustment(2026, 2, EMAIL);

      const adjs = await ctx.repo.getBudgetAdjustments(2026);
      expect(adjs.map((a) => a.start_month)).toEqual([2, 5]);
    });

    it("adjustBudgetItem + getBudgets refletem o valor vigente", async () => {
      await ctx.repo.adjustBudgetItem(2026, 1, "Alimentação", "despesa", 1000, EMAIL);

      const items = await ctx.repo.getBudgets(2026, 1);
      const food = items.find((i) => i.category_name === "Alimentação");
      expect(food?.amount).toBe(1000);
      expect(food?.category_type).toBe("despesa");
    });

    it("ajuste mais recente da categoria prevalece em getBudgets", async () => {
      await ctx.repo.adjustBudgetItem(2026, 3, "Transporte", "despesa", 300, EMAIL);
      await ctx.repo.adjustBudgetItem(2026, 5, "Transporte", "despesa", 500, EMAIL);

      const atMonth3 = await ctx.repo.getBudgets(2026, 3);
      expect(atMonth3.find((i) => i.category_name === "Transporte")?.amount).toBe(300);

      const atMonth5 = await ctx.repo.getBudgets(2026, 5);
      const transporte = atMonth5.find((i) => i.category_name === "Transporte");
      expect(transporte?.amount).toBe(500);
      expect(transporte?.start_month).toBe(5);
    });

    it("getBudgets considera apenas ajustes com start_month <= mês", async () => {
      await ctx.repo.adjustBudgetItem(2026, 5, "Lazer", "despesa", 200, EMAIL);

      expect(await ctx.repo.getBudgets(2026, 3)).toHaveLength(0);
      expect(await ctx.repo.getBudgets(2026, 5)).toHaveLength(1);
    });
  });
}

defineBudgetRepositoryContract("FakeBudgetRepository", () => {
  const repo = new FakeBudgetRepository();
  return {
    repo,
    reset: () => repo.reset(),
  };
});
