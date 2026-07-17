import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getBudgets, adjustBudgetItem, getBudgetAdjustments, createBudgetAdjustment, getBudgetAdjustment } from "@/lib/db/budget";
import { SupabaseClient } from "@supabase/supabase-js";

const mockSupabase = {
  from: vi.fn(),
} as unknown as SupabaseClient;

describe("Serviço de Orçamento (Revisado por Ajustes)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar o orçamento ativo da categoria respeitando a vigência acumulada", async () => {
    const mockData = [
      {
        amount: 1000.0,
        category_id: "cat-1",
        categories: { name: "Alimentação", type: "despesa" },
        budget_adjustments: { start_month: 4 }
      },
      {
        amount: 500.0,
        category_id: "cat-2",
        categories: { name: "Lazer", type: "despesa" },
        budget_adjustments: { start_month: 1 }
      }
    ];

    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockData, error: null })
            })
          })
        })
      })
    });

    const budgets = await getBudgets(mockSupabase, 2026, 8);
    expect(budgets).toHaveLength(2);
    
    const alimentacao = budgets.find((b) => b.category_name === "Alimentação");
    expect(alimentacao).toBeDefined();
    expect(alimentacao?.amount).toBe(1000.0);
    expect(alimentacao?.start_month).toBe(4);

    const lazer = budgets.find((b) => b.category_name === "Lazer");
    expect(lazer).toBeDefined();
    expect(lazer?.amount).toBe(500.0);
    expect(lazer?.start_month).toBe(1);
  });

  describe("adjustBudgetItem", () => {
    it("deve criar uma nova revisão e inserir o item se o ajuste para o mês não existir", async () => {
      const selectCategoryMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cat-123" }, error: null })
        })
      });

      const selectRevisionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      const insertRevisionMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "new-rev-123" }, error: null })
        })
      });

      const upsertItemMock = vi.fn().mockResolvedValue({ error: null });

      const fromMock = mockSupabase.from as unknown as {
        mockImplementation: (fn: (table: string) => unknown) => unknown;
      };

      fromMock.mockImplementation((table: string) => {
        if (table === "categories") {
          return { select: selectCategoryMock };
        }
        if (table === "budget_adjustments") {
          return {
            select: selectRevisionMock,
            insert: insertRevisionMock
          };
        }
        if (table === "budget_items") {
          return { upsert: upsertItemMock };
        }
        return {} as never;
      });

      await adjustBudgetItem(
        mockSupabase,
        2026,
        4,
        "Alimentação",
        "despesa",
        800.0,
        "teste@hestia.com"
      );

      expect(insertRevisionMock).toHaveBeenCalledWith({
        year: 2026,
        start_month: 4,
        description: "Ajuste de Abril/2026",
        created_by: "teste@hestia.com"
      });

      expect(upsertItemMock).toHaveBeenCalledWith({
        adjustment_id: "new-rev-123",
        category_id: "cat-123",
        amount: 800.0,
        created_by: "teste@hestia.com"
      }, { onConflict: "adjustment_id,category_id" });
    });

    it("deve usar o ajuste existente e apenas fazer upsert do item se o ajuste do mês já existir", async () => {
      const selectCategoryMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cat-123" }, error: null })
        })
      });

      const selectRevisionMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-rev-789" }, error: null })
          })
        })
      });

      const insertRevisionMock = vi.fn();
      const upsertItemMock = vi.fn().mockResolvedValue({ error: null });

      const fromMock = mockSupabase.from as unknown as {
        mockImplementation: (fn: (table: string) => unknown) => unknown;
      };

      fromMock.mockImplementation((table: string) => {
        if (table === "categories") {
          return { select: selectCategoryMock };
        }
        if (table === "budget_adjustments") {
          return {
            select: selectRevisionMock,
            insert: insertRevisionMock
          };
        }
        if (table === "budget_items") {
          return { upsert: upsertItemMock };
        }
        return {} as never;
      });

      await adjustBudgetItem(
        mockSupabase,
        2026,
        4,
        "Alimentação",
        "despesa",
        950.0,
        "teste@hestia.com"
      );

      expect(insertRevisionMock).not.toHaveBeenCalled();

      expect(upsertItemMock).toHaveBeenCalledWith({
        adjustment_id: "existing-rev-789",
        category_id: "cat-123",
        amount: 950.0,
        created_by: "teste@hestia.com"
      }, { onConflict: "adjustment_id,category_id" });
    });
  });

  describe("getBudgetAdjustments", () => {
    it("deve retornar todos os orcamentos/ajustes do ano ordenados por start_month", async () => {
      const mockData = [
        { id: "rev-1", year: 2026, start_month: 1, description: "Inicial", created_by: "user" },
        { id: "rev-2", year: 2026, start_month: 5, description: "Maio", created_by: "user" }
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null })
        })
      });

      (mockSupabase.from as Mock).mockReturnValue({ select: selectMock });

      const adjustments = await getBudgetAdjustments(mockSupabase, 2026);
      expect(adjustments).toHaveLength(2);
      expect(adjustments[0].start_month).toBe(1);
    });
  });

  describe("createBudgetAdjustment", () => {
    it("deve retornar o ID do ajuste existente se ele ja estiver cadastrado", async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-id" }, error: null })
          })
        })
      });

      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "budget_adjustments") {
          return { select: selectMock };
        }
        return {} as never;
      });

      const id = await createBudgetAdjustment(mockSupabase, 2026, 8, "user@test.com");
      expect(id).toBe("existing-id");
    });
  });

  describe("getBudgetAdjustment", () => {
    it("deve buscar o ajuste de Janeiro do ano informado", async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "adj-jan" }, error: null })
          })
        })
      });

      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "budget_adjustments") {
          return { select: selectMock };
        }
        return {} as never;
      });

      const adj = await getBudgetAdjustment(mockSupabase, 2026);
      expect(adj).toBeDefined();
      expect(adj?.id).toBe("adj-jan");
    });
  });
});
