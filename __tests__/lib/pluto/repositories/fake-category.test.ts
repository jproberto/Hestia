import { describe, it, expect, beforeEach } from "vitest";
import { FakeCategoryRepository } from "@/lib/pluto/repositories/fakes";

describe("FakeCategoryRepository", () => {
  let repo: FakeCategoryRepository;

  beforeEach(() => {
    repo = new FakeCategoryRepository();
  });

  it("deve retornar o ID se a categoria já existir no banco", async () => {
    repo.seed([
      { id: "cat-123", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const id = await repo.getOrCreateCategory("Alimentação", "despesa", "teste@hestia.com");
    expect(id).toBe("cat-123");
  });

  it("deve criar uma nova categoria se não existir no banco", async () => {
    const id = await repo.getOrCreateCategory("Saúde", "despesa", "teste@hestia.com");
    expect(id).toBeDefined();
    expect(id).toContain("cat-");

    const categories = await repo.getCategories("despesa");
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe("Saúde");
    expect(categories[0].type).toBe("despesa");
    expect(categories[0].created_by).toBe("teste@hestia.com");
  });

  it("deve retornar categorias filtradas por tipo", async () => {
    repo.seed([
      { id: "cat-1", name: "Salário", type: "receita", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
      { id: "cat-2", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
      { id: "cat-3", name: "Transporte", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const receitas = await repo.getCategories("receita");
    expect(receitas).toHaveLength(1);
    expect(receitas[0].name).toBe("Salário");

    const despesas = await repo.getCategories("despesa");
    expect(despesas).toHaveLength(2);
    expect(despesas.map((c) => c.name).sort()).toEqual(["Alimentação", "Transporte"]);
  });

  it("deve retornar todas as categorias se nenhum tipo for especificado", async () => {
    repo.seed([
      { id: "cat-1", name: "Salário", type: "receita", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
      { id: "cat-2", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const all = await repo.getCategories();
    expect(all).toHaveLength(2);
  });

  it("deve normalizar nome da categoria (trim)", async () => {
    const id = await repo.getOrCreateCategory("  Lazer  ", "despesa", "teste@hestia.com");
    const categories = await repo.getCategories("despesa");
    expect(categories[0].name).toBe("Lazer");
  });

  it("deve ser case-insensitive ao buscar categoria existente", async () => {
    repo.seed([
      { id: "cat-1", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const id1 = await repo.getOrCreateCategory("ALIMENTAÇÃO", "despesa", "teste@hestia.com");
    const id2 = await repo.getOrCreateCategory("alimentação", "despesa", "teste@hestia.com");
    expect(id1).toBe("cat-1");
    expect(id2).toBe("cat-1");
  });

  it("reset deve limpar todos os dados", async () => {
    repo.seed([
      { id: "cat-1", name: "Teste", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    repo.reset();
    const categories = await repo.getCategories();
    expect(categories).toHaveLength(0);
  });
});