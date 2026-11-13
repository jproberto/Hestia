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

    // --- T2 RED (Pluto 11): identidade = (nome normalizado, tipo) — R1/R2 ---

    it("'Mercaria' e 'mercaria' no mesmo tipo devolvem o mesmo id (R1)", async () => {
      const id1 = await ctx.repo.getOrCreateCategory("Mercaria", "despesa", EMAIL);
      const id2 = await ctx.repo.getOrCreateCategory("mercaria", "despesa", EMAIL);

      expect(id2).toBe(id1);
      expect(await ctx.repo.getCategories("despesa")).toHaveLength(1);
    });

    it("'Alimentação', 'alimentacao' e 'ALIMENTAÇÃO' no mesmo tipo devolvem o mesmo id (R1)", async () => {
      const idOriginal = await ctx.repo.getOrCreateCategory("Alimentação", "despesa", EMAIL);
      const idSemAcento = await ctx.repo.getOrCreateCategory("alimentacao", "despesa", EMAIL);
      const idMaiusculo = await ctx.repo.getOrCreateCategory("ALIMENTAÇÃO", "despesa", EMAIL);

      expect(idSemAcento).toBe(idOriginal);
      expect(idMaiusculo).toBe(idOriginal);
      expect(await ctx.repo.getCategories("despesa")).toHaveLength(1);
    });

    it("o \"é\" colado em forma composta e decomposta devolve o mesmo id (R1)", async () => {
      const composto = "Alimentação"; // ca/ã em forma composta (NFC)
      const decomposto = composto.normalize("NFD");
      // fixture sanity: as duas formas precisam realmente ser diferentes
      expect(decomposto).not.toBe(composto);

      const id1 = await ctx.repo.getOrCreateCategory(composto, "despesa", EMAIL);
      const id2 = await ctx.repo.getOrCreateCategory(decomposto, "despesa", EMAIL);

      expect(id2).toBe(id1);
      expect(await ctx.repo.getCategories("despesa")).toHaveLength(1);
    });

    it("nome igual em tipo diferente cria linha nova — homônimas permitidas (R2)", async () => {
      const idReceita = await ctx.repo.getOrCreateCategory("Salário", "receita", EMAIL);
      const idDespesa = await ctx.repo.getOrCreateCategory("Salário", "despesa", EMAIL);

      expect(idDespesa).not.toBe(idReceita);
      expect(await ctx.repo.getCategories()).toHaveLength(2);
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
