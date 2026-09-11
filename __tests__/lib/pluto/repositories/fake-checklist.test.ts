import { describe, it, expect, beforeEach } from "vitest";
import { FakeChecklistRepository } from "@/lib/pluto/repositories/fakes";
import type { ChecklistItemInput } from "@/lib/pluto/types";

describe("FakeChecklistRepository", () => {
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
        {
          id: "global-2",
          month_id: null,
          day: 10,
          description: "Inativo",
          type: "despesa",
          category_id: "cat-1",
          amount: 100,
          is_completed: false,
          is_active: false,
          created_at: "2026-01-01T00:00:00Z",
          created_by: "user@test.com",
          category_name: "Moradia",
        },
        {
          id: "month-1",
          month_id: "m-1",
          day: 1,
          description: "Mensal",
          type: "despesa",
          category_id: "cat-1",
          amount: 100,
          is_completed: false,
          is_active: true,
          created_at: "2026-03-01T00:00:00Z",
          created_by: "user@test.com",
          category_name: "Moradia",
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
    expect(item.parent_id).toBeNull();
  });

  it("deve criar item global e instância no mês se isGlobal=true e currentMonthId fornecido", async () => {
    const input: ChecklistItemInput = {
      day: 5,
      description: "Aluguel",
      type: "despesa",
      category_id: "cat-1",
      amount: 2000,
      created_by: "user@test.com",
    };

    const item = await repo.createChecklistItem(input, true, "m-1");
    expect(item.id).toBeDefined();
    expect(item.month_id).toBe("m-1");
    expect(item.parent_id).toBeDefined();

    const globals = await repo.getGlobalChecklistItems();
    expect(globals).toHaveLength(1);
    expect(globals[0].id).toBe(item.parent_id);
    expect(globals[0].month_id).toBeNull();
  });

  it("deve criar apenas item global se isGlobal=true e currentMonthId não fornecido", async () => {
    const input: ChecklistItemInput = {
      day: 5,
      description: "Aluguel",
      type: "despesa",
      category_id: "cat-1",
      amount: 2000,
      created_by: "user@test.com",
    };

    const item = await repo.createChecklistItem(input, true);
    expect(item.month_id).toBeNull();
    expect(item.parent_id).toBeNull();
    expect(item.is_active).toBe(true);
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
    const items = await repo.getChecklistItemsByMonth("m-1");
    expect(items[0].is_completed).toBe(true);

    await repo.toggleChecklistItemCompletion("chk-1", false);
    const items2 = await repo.getChecklistItemsByMonth("m-1");
    expect(items2[0].is_completed).toBe(false);
  });

  it("deve atualizar item e opcionalmente o global pai", async () => {
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
        {
          id: "chk-1",
          month_id: "m-1",
          parent_id: "global-1",
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

    await repo.updateChecklistItem("chk-1", { description: "Aluguel Atualizado", amount: 2100 }, true, "global-1");

    const monthItems = await repo.getChecklistItemsByMonth("m-1");
    expect(monthItems[0].description).toBe("Aluguel Atualizado");
    expect(monthItems[0].amount).toBe(2100);

    const globals = await repo.getGlobalChecklistItems();
    expect(globals[0].description).toBe("Aluguel Atualizado");
    expect(globals[0].amount).toBe(2100);
  });

  it("deve excluir item e opcionalmente desativar global pai", async () => {
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
        {
          id: "chk-1",
          month_id: "m-1",
          parent_id: "global-1",
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

    await repo.deleteChecklistItem("chk-1", true, "global-1");

    const monthItems = await repo.getChecklistItemsByMonth("m-1");
    expect(monthItems).toHaveLength(0);

    const globals = await repo.getGlobalChecklistItems();
    expect(globals).toHaveLength(0); // global is inactive now
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
    expect(items[0].created_by).toBe("user@test.com");
  });

  it("não deve instanciar nada se não houver globais ativos", async () => {
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
          is_active: false, // inativo
          created_at: "2026-01-01T00:00:00Z",
          created_by: "user@test.com",
          category_name: "Moradia",
        },
      ],
    });

    await repo.instantiateGlobalChecklistItemsForMonth("m-new", "user@test.com");

    const items = await repo.getChecklistItemsByMonth("m-new");
    expect(items).toHaveLength(0);
  });

  it("reset deve limpar todos os dados", async () => {
    repo.seed({
      items: [
        {
          id: "chk-1",
          month_id: "m-1",
          day: 10,
          description: "Teste",
          type: "despesa",
          category_id: "cat-1",
          amount: 100,
          is_completed: false,
          is_active: true,
          created_at: "2026-03-01T00:00:00Z",
          created_by: "user@test.com",
          category_name: "Moradia",
        },
      ],
    });

    repo.reset();
    const items = await repo.getChecklistItemsByMonth("m-1");
    expect(items).toHaveLength(0);
  });
});