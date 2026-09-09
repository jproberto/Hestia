import { describe, it, expect, beforeEach } from "vitest";
import type { ICategoryRepository } from "@/lib/pluto/repositories/interfaces";
import { FakeCategoryRepository } from "@/lib/pluto/repositories/fakes";

export interface CategoryContractBuild {
  repo: ICategoryRepository;
  reset(): void;
}

/**
 * Shared contract for ICategoryRepository implementations.
 */
export function defineCategoryRepositoryContract(
  label: string,
  build: () => CategoryContractBuild
) {
  describe(`ICategoryRepository contract: ${label}`, () => {
    const EMAIL = "contrato@hestia.com";
    let ctx: CategoryContractBuild;

    beforeEach(() => {
      ctx = build();
      ctx.reset();
    });

    it("getOrCreate é idempotente para o mesmo nome", async () => {
      const id1 = await ctx.repo.getOrCreateCategory("Alimentação", "despesa", EMAIL);
      const id2 = await ctx.repo.getOrCreateCategory("Alimentação", "despesa", EMAIL);
      expect(id1).toBe(id2);
    });

    it("normaliza espaços no nome", async () => {
      const id1 = await ctx.repo.getOrCreateCategory("  Saúde  ", "despesa", EMAIL);
      const id2 = await ctx.repo.getOrCreateCategory("Saúde", "despesa", EMAIL);
      expect(id1).toBe(id2);
    });

    it("getCategories filtra por tipo", async () => {
      await ctx.repo.getOrCreateCategory("Salário", "receita", EMAIL);
      await ctx.repo.getOrCreateCategory("Aluguel", "despesa", EMAIL);

      const receitas = await ctx.repo.getCategories("receita");
      expect(receitas.map((c) => c.name)).toEqual(["Salário"]);

      const despesas = await ctx.repo.getCategories("despesa");
      expect(despesas.map((c) => c.name)).toEqual(["Aluguel"]);

      expect(await ctx.repo.getCategories()).toHaveLength(2);
    });

    it("getCategories ordena por nome", async () => {
      await ctx.repo.getOrCreateCategory("Zebra", "despesa", EMAIL);
      await ctx.repo.getOrCreateCategory("Abacate", "despesa", EMAIL);

      const all = await ctx.repo.getCategories("despesa");
      expect(all.map((c) => c.name)).toEqual(["Abacate", "Zebra"]);
    });
  });
}

defineCategoryRepositoryContract("FakeCategoryRepository", () => {
  const repo = new FakeCategoryRepository();
  return {
    repo,
    reset: () => repo.reset(),
  };
});
