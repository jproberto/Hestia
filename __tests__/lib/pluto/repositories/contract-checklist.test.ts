import { describe, it, expect, beforeEach } from "vitest";
import type { IChecklistRepository } from "@/lib/pluto/repositories/interfaces";
import type { Category } from "@/lib/pluto/types";
import { FakeChecklistRepository } from "@/lib/pluto/repositories/fakes";

export interface ChecklistContractBuild {
  repo: IChecklistRepository;
  reset(): void;
  seedCategories(categories: Category[]): void;
}

/**
 * Shared contract for IChecklistRepository implementations.
 */
export function defineChecklistRepositoryContract(
  label: string,
  build: () => ChecklistContractBuild
) {
  describe(`IChecklistRepository contract: ${label}`, () => {
    const EMAIL = "contrato@hestia.com";
    const MONTH_ID = "mes-2026-03";
    let ctx: ChecklistContractBuild;

    const baseInput = {
      day: 10,
      description: "Internet",
      type: "despesa" as const,
      category_id: "cat-1",
      amount: 120 as number | null,
      created_by: EMAIL,
    };

    beforeEach(() => {
      ctx = build();
      ctx.reset();
      ctx.seedCategories([
        { id: "cat-1", name: "Contas", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: EMAIL },
      ]);
    });

    it("create mensal + getByMonth roundtrip enriquece category_name", async () => {
      const created = await ctx.repo.createChecklistItem(baseInput, false, MONTH_ID);
      expect(created.month_id).toBe(MONTH_ID);
      expect(created.parent_id).toBeNull();
      expect(created.category_name).toBe("Contas");

      const items = await ctx.repo.getChecklistItemsByMonth(MONTH_ID);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(created.id);
    });

    it("create global aparece em getGlobalChecklistItems mas não no mês", async () => {
      const created = await ctx.repo.createChecklistItem(baseInput, true);
      expect(created.month_id).toBeNull();

      expect(await ctx.repo.getGlobalChecklistItems()).toHaveLength(1);
      expect(await ctx.repo.getChecklistItemsByMonth(MONTH_ID)).toHaveLength(0);
    });

    it("create global com currentMonthId instancia cópia no mês", async () => {
      const monthItem = await ctx.repo.createChecklistItem(baseInput, true, MONTH_ID);

      expect(monthItem.month_id).toBe(MONTH_ID);
      expect(monthItem.parent_id).not.toBeNull();

      expect(await ctx.repo.getGlobalChecklistItems()).toHaveLength(1);
      expect(await ctx.repo.getChecklistItemsByMonth(MONTH_ID)).toHaveLength(1);
    });

    it("toggle alterna is_completed", async () => {
      const created = await ctx.repo.createChecklistItem(baseInput, false, MONTH_ID);
      expect(created.is_completed).toBe(false);

      await ctx.repo.toggleChecklistItemCompletion(created.id, true);
      const items = await ctx.repo.getChecklistItemsByMonth(MONTH_ID);
      expect(items[0].is_completed).toBe(true);
    });

    it("update parcial altera só os campos informados", async () => {
      const created = await ctx.repo.createChecklistItem(baseInput, false, MONTH_ID);
      await ctx.repo.updateChecklistItem(created.id, { description: "Internet Fibra" }, false, null);

      const items = await ctx.repo.getChecklistItemsByMonth(MONTH_ID);
      expect(items[0].description).toBe("Internet Fibra");
      expect(items[0].amount).toBe(120);
    });

    it("delete mensal remove o item", async () => {
      const created = await ctx.repo.createChecklistItem(baseInput, false, MONTH_ID);
      await ctx.repo.deleteChecklistItem(created.id, false, null);
      expect(await ctx.repo.getChecklistItemsByMonth(MONTH_ID)).toHaveLength(0);
    });

    it("delete global desativa o pai e remove o filho", async () => {
      const monthItem = await ctx.repo.createChecklistItem(baseInput, true, MONTH_ID);
      const parentId = monthItem.parent_id;
      expect(parentId).not.toBeNull();

      await ctx.repo.deleteChecklistItem(monthItem.id, true, parentId);

      expect(await ctx.repo.getChecklistItemsByMonth(MONTH_ID)).toHaveLength(0);
      // pai desativado não aparece mais nos globais ativos
      expect(await ctx.repo.getGlobalChecklistItems()).toHaveLength(0);
    });

    it("instantiateGlobalChecklistItemsForMonth copia globais para o mês", async () => {
      await ctx.repo.createChecklistItem(baseInput, true);
      await ctx.repo.instantiateGlobalChecklistItemsForMonth(MONTH_ID, EMAIL);

      const items = await ctx.repo.getChecklistItemsByMonth(MONTH_ID);
      expect(items).toHaveLength(1);
      expect(items[0].parent_id).not.toBeNull();
      expect(items[0].description).toBe("Internet");
    });

    it("getByMonth ordena por dia", async () => {
      await ctx.repo.createChecklistItem({ ...baseInput, day: 20, description: "B" }, false, MONTH_ID);
      await ctx.repo.createChecklistItem({ ...baseInput, day: 5, description: "A" }, false, MONTH_ID);

      const items = await ctx.repo.getChecklistItemsByMonth(MONTH_ID);
      expect(items.map((i) => i.day)).toEqual([5, 20]);
    });
  });
}

defineChecklistRepositoryContract("FakeChecklistRepository", () => {
  const repo = new FakeChecklistRepository();
  return {
    repo,
    reset: () => repo.reset(),
    seedCategories: (categories: Category[]) => repo.setCategories(categories),
  };
});
