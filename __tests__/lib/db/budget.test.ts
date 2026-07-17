import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBudgets, adjustBudgetItem } from "@/lib/db/budget";
import { SupabaseClient } from "@supabase/supabase-js";

const mockSupabase = {
  from: vi.fn(),
} as unknown as SupabaseClient;

describe("Serviço de Orçamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar o orçamento ativo da categoria respeitando a vigência acumulada", async () => {
    // Simulamos a estrutura retornada pelo join do Supabase com categories e budget_revisions
    const mockData = [
      {
        amount: 1000.0,
        category_id: "cat-1",
        categories: { name: "Alimentação", type: "despesa" },
        budget_revisions: { start_month: 4 }
      },
      {
        amount: 500.0,
        category_id: "cat-2",
        categories: { name: "Lazer", type: "despesa" },
        budget_revisions: { start_month: 1 }
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
    
    // Alimentação com start_month = 4
    const alimentacao = budgets.find((b) => b.category_name === "Alimentação");
    expect(alimentacao).toBeDefined();
    expect(alimentacao?.amount).toBe(1000.0);
    expect(alimentacao?.start_month).toBe(4);

    // Lazer com start_month = 1
    const lazer = budgets.find((b) => b.category_name === "Lazer");
    expect(lazer).toBeDefined();
    expect(lazer?.amount).toBe(500.0);
    expect(lazer?.start_month).toBe(1);
  });

  describe("adjustBudgetItem", () => {
    it("deve criar uma nova revisão e inserir o item se a revisão para o mês não existir", async () => {
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
        if (table === "budget_revisions") {
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

      // Verifica se tentou criar a revisão do mês 4
      expect(insertRevisionMock).toHaveBeenCalledWith({
        year: 2026,
        start_month: 4,
        description: "Ajuste de Orçamento - 4/2026",
        created_by: "teste@hestia.com"
      });

      // Verifica se inseriu o item apontando para a nova revisão
      expect(upsertItemMock).toHaveBeenCalledWith({
        revision_id: "new-rev-123",
        category_id: "cat-123",
        amount: 800.0,
        created_by: "teste@hestia.com"
      }, { onConflict: "revision_id,category_id" });
    });

    it("deve usar a revisão existente e apenas fazer upsert do item se a revisão do mês já existir", async () => {
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
        if (table === "budget_revisions") {
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

      // Não deve ter tentado criar nova revisão
      expect(insertRevisionMock).not.toHaveBeenCalled();

      // Deve ter feito o upsert com a revisão existente
      expect(upsertItemMock).toHaveBeenCalledWith({
        revision_id: "existing-rev-789",
        category_id: "cat-123",
        amount: 950.0,
        created_by: "teste@hestia.com"
      }, { onConflict: "revision_id,category_id" });
    });
  });
});

