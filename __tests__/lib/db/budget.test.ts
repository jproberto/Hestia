import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBudgets } from "@/lib/db/budget";
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

    mockSupabase.from.mockReturnValue({
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
});
