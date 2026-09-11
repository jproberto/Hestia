import { describe, it, expect, beforeEach } from "vitest";
import { FakeBudgetRepository } from "@/lib/pluto/repositories/fakes";
import type { Category, BudgetAdjustment, BudgetItem } from "@/lib/pluto/types";

describe("Serviço de Orçamento (Revisado por Ajustes)", () => {
  let repo: FakeBudgetRepository;

  beforeEach(() => {
    repo = new FakeBudgetRepository();
  });

  it("deve carregar o orçamento ativo da categoria respeitando a vigência acumulada", async () => {
    repo.seed({
      categories: [
        { id: "cat-1", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "user" },
        { id: "cat-2", name: "Lazer", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "user" },
      ],
      adjustments: [
        { id: "adj-1", year: 2026, start_month: 1, description: "Inicial", created_by: "user" },
        { id: "adj-4", year: 2026, start_month: 4, description: "Ajuste de Abril/2026", created_by: "user" },
      ],
    });

    await repo.addOrUpdateBudgetItem("adj-1", "cat-1", 500.0, "user");
    await repo.addOrUpdateBudgetItem("adj-1", "cat-2", 200.0, "user");
    await repo.addOrUpdateBudgetItem("adj-4", "cat-1", 1000.0, "user");

    const budgets = await repo.getBudgets(2026, 8);
    expect(budgets).toHaveLength(2);

    const alimentacao = budgets.find((b) => b.category_name === "Alimentação");
    expect(alimentacao).toBeDefined();
    expect(alimentacao?.amount).toBe(1000.0);
    expect(alimentacao?.start_month).toBe(4);

    const lazer = budgets.find((b) => b.category_name === "Lazer");
    expect(lazer).toBeDefined();
    expect(lazer?.amount).toBe(200.0);
    expect(lazer?.start_month).toBe(1);
  });

  describe("adjustBudgetItem", () => {
    it("deve criar uma nova revisão e inserir o item se o ajuste para o mês não existir", async () => {
      await repo.adjustBudgetItem(2026, 4, "Alimentação", "despesa", 800.0, "teste@hestia.com");

      const adjustments = await repo.getBudgetAdjustments(2026);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].start_month).toBe(4);
      expect(adjustments[0].description).toBe("Ajuste de Abril/2026");

      const budgets = await repo.getBudgets(2026, 4);
      expect(budgets).toHaveLength(1);
      expect(budgets[0].category_name).toBe("Alimentação");
      expect(budgets[0].amount).toBe(800.0);
    });

    it("deve usar o ajuste existente e apenas fazer upsert do item se o ajuste do mês já existir", async () => {
      await repo.adjustBudgetItem(2026, 4, "Alimentação", "despesa", 800.0, "teste@hestia.com");
      await repo.adjustBudgetItem(2026, 4, "Alimentação", "despesa", 950.0, "teste@hestia.com");

      const adjustments = await repo.getBudgetAdjustments(2026);
      expect(adjustments).toHaveLength(1);

      const budgets = await repo.getBudgets(2026, 4);
      expect(budgets[0].amount).toBe(950.0);
    });
  });

  describe("getBudgetAdjustments", () => {
    it("deve retornar todos os orcamentos/ajustes do ano ordenados por start_month", async () => {
      repo.seed({
        adjustments: [
          { id: "rev-1", year: 2026, start_month: 1, description: "Inicial", created_by: "user" },
          { id: "rev-2", year: 2026, start_month: 5, description: "Maio", created_by: "user" },
        ],
      });

      const adjustments = await repo.getBudgetAdjustments(2026);
      expect(adjustments).toHaveLength(2);
      expect(adjustments[0].start_month).toBe(1);
    });
  });

  describe("createBudgetAdjustment", () => {
    it("deve retornar o ID do ajuste existente se ele ja estiver cadastrado", async () => {
      repo.seed({
        adjustments: [
          { id: "existing-id", year: 2026, start_month: 8, description: "Ajuste de Agosto/2026", created_by: "user" },
        ],
      });

      const id = await repo.createBudgetAdjustment(2026, 8, "user@test.com");
      expect(id).toBe("existing-id");
    });
  });

  describe("getBudgetAdjustment", () => {
    it("deve buscar o ajuste de Janeiro do ano informado", async () => {
      repo.seed({
        adjustments: [
          { id: "adj-jan", year: 2026, start_month: 1, description: "Orçamento Inicial 2026", created_by: "user" },
        ],
      });

      const adj = await repo.getBudgetAdjustment(2026);
      expect(adj).toBeDefined();
      expect(adj?.id).toBe("adj-jan");
    });
  });
});