import { describe, it, expect, beforeEach } from "vitest";
import { FakeBudgetRepository } from "@/lib/pluto/repositories/fakes";
import type { Category, BudgetAdjustment, BudgetItem } from "@/lib/pluto/types";

describe("FakeBudgetRepository", () => {
  let repo: FakeBudgetRepository;

  beforeEach(() => {
    repo = new FakeBudgetRepository();
  });

  describe("getBudgetAdjustment", () => {
    it("deve buscar o ajuste de Janeiro do ano informado", async () => {
      repo.seed({
        adjustments: [
          { id: "adj-jan", year: 2026, start_month: 1, description: "Orçamento Inicial 2026", created_by: "user" },
          { id: "adj-mai", year: 2026, start_month: 5, description: "Ajuste de Maio/2026", created_by: "user" },
        ],
      });

      const adj = await repo.getBudgetAdjustment(2026);
      expect(adj).toBeDefined();
      expect(adj?.id).toBe("adj-jan");
      expect(adj?.start_month).toBe(1);
    });

    it("deve retornar null se não houver ajuste de Janeiro", async () => {
      repo.seed({
        adjustments: [
          { id: "adj-mai", year: 2026, start_month: 5, description: "Ajuste de Maio/2026", created_by: "user" },
        ],
      });

      const adj = await repo.getBudgetAdjustment(2026);
      expect(adj).toBeNull();
    });
  });

  describe("initBudget", () => {
    it("deve criar orçamento inicial se não existir", async () => {
      const id = await repo.initBudget(2026, "user@test.com");
      expect(id).toBeDefined();

      const adj = await repo.getBudgetAdjustment(2026);
      expect(adj).toBeDefined();
      expect(adj?.id).toBe(id);
      expect(adj?.description).toBe("Orçamento Inicial 2026");
    });

    it("deve retornar ID existente se orçamento já inicializado", async () => {
      repo.seed({
        adjustments: [
          { id: "existing-id", year: 2026, start_month: 1, description: "Orçamento Inicial 2026", created_by: "user" },
        ],
      });

      const id = await repo.initBudget(2026, "user@test.com");
      expect(id).toBe("existing-id");
    });
  });

  describe("getBudgets", () => {
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
        budgetItems: [
          // Items don't have adjustment_id in BudgetItem type, so we need to use addOrUpdateBudgetItem
        ],
      });

      // Manually add budget items to specific adjustments
      await repo.addOrUpdateBudgetItem("adj-1", "cat-1", 500.0, "user");
      await repo.addOrUpdateBudgetItem("adj-1", "cat-2", 200.0, "user");
      await repo.addOrUpdateBudgetItem("adj-4", "cat-1", 1000.0, "user"); // Override for month 4+

      const budgets = await repo.getBudgets(2026, 8); // August - should get latest for each category
      expect(budgets).toHaveLength(2);

      const alimentacao = budgets.find((b) => b.category_name === "Alimentação");
      expect(alimentacao).toBeDefined();
      expect(alimentacao?.amount).toBe(1000.0); // From adjustment 4 (latest)
      expect(alimentacao?.start_month).toBe(4);

      const lazer = budgets.find((b) => b.category_name === "Lazer");
      expect(lazer).toBeDefined();
      expect(lazer?.amount).toBe(200.0); // From adjustment 1 (only one)
      expect(lazer?.start_month).toBe(1);
    });

    it("deve considerar apenas ajustes com start_month <= mês consultado", async () => {
      repo.seed({
        categories: [
          { id: "cat-1", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "user" },
        ],
        adjustments: [
          { id: "adj-1", year: 2026, start_month: 1, description: "Inicial", created_by: "user" },
          { id: "adj-6", year: 2026, start_month: 6, description: "Ajuste de Junho/2026", created_by: "user" },
        ],
      });

      await repo.addOrUpdateBudgetItem("adj-1", "cat-1", 500.0, "user");
      await repo.addOrUpdateBudgetItem("adj-6", "cat-1", 800.0, "user");

      // Query for month 3 (before June adjustment)
      const budgetsMar = await repo.getBudgets(2026, 3);
      expect(budgetsMar[0].amount).toBe(500.0);
      expect(budgetsMar[0].start_month).toBe(1);

      // Query for month 8 (after June adjustment)
      const budgetsAug = await repo.getBudgets(2026, 8);
      expect(budgetsAug[0].amount).toBe(800.0);
      expect(budgetsAug[0].start_month).toBe(6);
    });
  });

  describe("addOrUpdateBudgetItem", () => {
    it("deve adicionar ou atualizar item de orçamento", async () => {
      repo.seed({
        categories: [
          { id: "cat-1", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "user" },
        ],
        adjustments: [
          { id: "adj-1", year: 2026, start_month: 1, description: "Inicial", created_by: "user" },
        ],
      });

      await repo.addOrUpdateBudgetItem("adj-1", "cat-1", 500.0, "user");

      const budgets = await repo.getBudgets(2026, 1);
      expect(budgets[0].amount).toBe(500.0);
      expect(budgets[0].category_name).toBe("Alimentação");
    });

    it("deve lançar erro se adjustment não existir", async () => {
      await expect(
        repo.addOrUpdateBudgetItem("non-existent", "cat-1", 500.0, "user")
      ).rejects.toThrow("Adjustment non-existent not found");
    });
  });

  describe("getBudgetAdjustments", () => {
    it("deve retornar todos os orçamentos/ajustes do ano ordenados por start_month", async () => {
      repo.seed({
        adjustments: [
          { id: "adj-2", year: 2026, start_month: 5, description: "Maio", created_by: "user" },
          { id: "adj-1", year: 2026, start_month: 1, description: "Inicial", created_by: "user" },
        ],
      });

      const adjustments = await repo.getBudgetAdjustments(2026);
      expect(adjustments).toHaveLength(2);
      expect(adjustments[0].start_month).toBe(1);
      expect(adjustments[1].start_month).toBe(5);
    });
  });

  describe("createBudgetAdjustment", () => {
    it("deve retornar o ID do ajuste existente se ele já estiver cadastrado", async () => {
      repo.seed({
        adjustments: [
          { id: "existing-id", year: 2026, start_month: 8, description: "Ajuste de Agosto/2026", created_by: "user" },
        ],
      });

      const id = await repo.createBudgetAdjustment(2026, 8, "user@test.com");
      expect(id).toBe("existing-id");
    });

    it("deve criar novo ajuste se não existir para o mês", async () => {
      const id = await repo.createBudgetAdjustment(2026, 8, "user@test.com");
      expect(id).toBeDefined();

      const adjustments = await repo.getBudgetAdjustments(2026);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].id).toBe(id);
      expect(adjustments[0].start_month).toBe(8);
      expect(adjustments[0].description).toBe("Ajuste de Agosto/2026");
    });
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
      // First adjustment
      await repo.adjustBudgetItem(2026, 4, "Alimentação", "despesa", 800.0, "teste@hestia.com");

      // Second adjustment for same month
      await repo.adjustBudgetItem(2026, 4, "Alimentação", "despesa", 950.0, "teste@hestia.com");

      const adjustments = await repo.getBudgetAdjustments(2026);
      expect(adjustments).toHaveLength(1); // Still only one adjustment

      const budgets = await repo.getBudgets(2026, 4);
      expect(budgets[0].amount).toBe(950.0); // Updated value
    });

    it("deve criar categoria se não existir", async () => {
      await repo.adjustBudgetItem(2026, 4, "Nova Categoria", "receita", 1000.0, "teste@hestia.com");

      const budgets = await repo.getBudgets(2026, 4);
      expect(budgets[0].category_name).toBe("Nova Categoria");
      expect(budgets[0].category_type).toBe("receita");
    });
  });

  it("reset deve limpar todos os dados", async () => {
    await repo.adjustBudgetItem(2026, 1, "Teste", "despesa", 100.0, "user@test.com");

    repo.reset();
    const adjustments = await repo.getBudgetAdjustments(2026);
    expect(adjustments).toHaveLength(0);
  });
});