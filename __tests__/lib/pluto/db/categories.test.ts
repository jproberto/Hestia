import { describe, it, expect, beforeEach } from "vitest";
import { FakeCategoryRepository } from "@/lib/pluto/repositories/fakes";

describe("Serviço de Categorias", () => {
  let repo: FakeCategoryRepository;

  beforeEach(() => {
    repo = new FakeCategoryRepository();
  });

  it("deve retornar o ID se a categoria ja existir no banco", async () => {
    repo.seed([
      { id: "cat-123", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const id = await repo.getOrCreateCategory("Alimentação", "despesa", "teste@hestia.com");
    expect(id).toBe("cat-123");
  });

  it("deve criar uma nova categoria se nao existir no banco", async () => {
    const id = await repo.getOrCreateCategory("Saúde", "despesa", "teste@hestia.com");
    expect(id).toBeDefined();
    expect(id).toContain("cat-");

    const categories = await repo.getCategories("despesa");
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe("Saúde");
    expect(categories[0].type).toBe("despesa");
    expect(categories[0].created_by).toBe("teste@hestia.com");
  });
});