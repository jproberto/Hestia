import { describe, it, expect, beforeEach } from "vitest";
import { FakeChecklistRepository } from "@/lib/pluto/repositories/fakes";
import type { ChecklistItemInput } from "@/lib/pluto/types";

describe("Serviço de Checklist (Checklist DB)", () => {
  let repo: FakeChecklistRepository;

  beforeEach(() => {
    repo = new FakeChecklistRepository();
    repo.seed({
      categories: [
        { id: "cat-1", name: "Moradia", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
        { id: "cat-2", name: "Renda", type: "receita", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
      ],
    });
  });

  it("deve buscar itens do checklist para um mês específico ordenados por dia", async () => {
    repo.seed({
      items: [
        {
          id: "chk-1",
          month_id: "m-1",
          day: 10,
          description: "Aluguel",
          type: "despesa",
          category_id: "cat-1",
          amount: 2000,
          is_completed: false,
          is_active: true,
          created_at: "2026-03-01T00:00:00Z",
          created_by: "user@test.com",
          category_name: "Moradia",
        },
      ],
    });

    const items = await repo.getChecklistItemsByMonth("m-1");
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("Aluguel");
    expect(items[0].category_name).toBe("Moradia");
  });

  it("deve buscar apenas modelos globais ativos (month_id IS NULL e is_active = true)", async () => {
    repo.seed({
      items: [
        {
          id: "global-1",
          month_id: null,
          day: 5,
          description: "Salário",
          type: "receita",
          category_id: "cat-2",
          amount: 5000,
          is_completed: false,
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
          created_by: "user@test.com",
          category_name: "Renda",
        },
      ],
    });

    const items = await repo.getGlobalChecklistItems();
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("Salário");
  });

  it("deve criar item apenas no mês atual", async () => {
    const input: ChecklistItemInput = {
      day: 15,
      description: "Luz",
      type: "despesa",
      category_id: "cat-1",
      amount: 150,
      created_by: "user@test.com",
    };

    const item = await repo.createChecklistItem(input, false, "m-1");
    expect(item.id).toBeDefined();
    expect(item.month_id).toBe("m-1");
    expect(item.description).toBe("Luz");
  });

  it("deve alternar estado de conclusão do item", async () => {
    repo.seed({
      items: [
        {
          id: "chk-1",
          month_id: "m-1",
          day: 10,
          description: "Aluguel",
          type: "despesa",
          category_id: "cat-1",
          amount: 2000,
          is_completed: false,
          is_active: true,
          created_at: "2026-03-01T00:00:00Z",
          created_by: "user@test.com",
          category_name: "Moradia",
        },
      ],
    });

    await repo.toggleChecklistItemCompletion("chk-1", true);
    expect((await repo.getChecklistItemsByMonth("m-1"))[0].is_completed).toBe(true);
  });

  it("deve instanciar itens globais ativos para um novo mês aberto", async () => {
    repo.seed({
      items: [
        {
          id: "global-1",
          month_id: null,
          day: 10,
          description: "Aluguel",
          type: "despesa",
          category_id: "cat-1",
          amount: 2000,
          is_completed: false,
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
          created_by: "user@test.com",
          category_name: "Moradia",
        },
      ],
    });

    await repo.instantiateGlobalChecklistItemsForMonth("m-new", "user@test.com");
    const items = await repo.getChecklistItemsByMonth("m-new");
    expect(items).toHaveLength(1);
    expect(items[0].month_id).toBe("m-new");
    expect(items[0].parent_id).toBe("global-1");
    expect(items[0].description).toBe("Aluguel");
    expect(items[0].is_completed).toBe(false);
  });
});