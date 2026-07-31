import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getChecklistItemsByMonth,
  getGlobalChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItemCompletion,
  instantiateGlobalChecklistItemsForMonth,
  ChecklistItemInput,
} from "@/lib/db/checklist";
import { SupabaseClient } from "@supabase/supabase-js";

const mockSupabase = {
  from: vi.fn(),
} as unknown as SupabaseClient;

describe("Serviço de Checklist (Checklist DB)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve buscar itens do checklist para um mês específico ordenados por dia", async () => {
    const fromMock = mockSupabase.from as unknown as ReturnType<typeof vi.fn>;
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
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
                  categories: { name: "Moradia" },
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const items = await getChecklistItemsByMonth(mockSupabase, "m-1");
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("Aluguel");
    expect(items[0].category_name).toBe("Moradia");
  });

  it("deve buscar apenas modelos globais ativos (month_id IS NULL e is_active = true)", async () => {
    const fromMock = mockSupabase.from as unknown as ReturnType<typeof vi.fn>;
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
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
                  categories: { name: "Renda" },
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const items = await getGlobalChecklistItems(mockSupabase);
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("Salário");
  });

  it("deve criar item apenas no mês atual", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "chk-2",
            month_id: "m-1",
            day: 15,
            description: "Luz",
            type: "despesa",
            category_id: "cat-1",
            amount: 150,
            is_completed: false,
            is_active: true,
          },
          error: null,
        }),
      }),
    });

    (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: insertMock,
    });

    const input: ChecklistItemInput = {
      day: 15,
      description: "Luz",
      type: "despesa",
      category_id: "cat-1",
      amount: 150,
      created_by: "user@test.com",
    };

    const item = await createChecklistItem(mockSupabase, input, false, "m-1");
    expect(item.id).toBe("chk-2");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        month_id: "m-1",
        description: "Luz",
      })
    );
  });

  it("deve alternar estado de conclusão do item", async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      update: updateMock,
    });

    await toggleChecklistItemCompletion(mockSupabase, "chk-1", true);
    expect(updateMock).toHaveBeenCalledWith({ is_completed: true });
  });

  it("deve instanciar itens globais ativos para um novo mês aberto", async () => {
    const selectGlobalsMock = vi.fn().mockReturnValue({
      is: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: "global-1",
              day: 10,
              description: "Aluguel",
              type: "despesa",
              category_id: "cat-1",
              amount: 2000,
            },
          ],
          error: null,
        }),
      }),
    });

    const insertInstancesMock = vi.fn().mockResolvedValue({ error: null });

    (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === "checklist_items") {
        return {
          select: selectGlobalsMock,
          insert: insertInstancesMock,
        };
      }
      return {};
    });

    await instantiateGlobalChecklistItemsForMonth(mockSupabase, "m-new", "user@test.com");
    expect(insertInstancesMock).toHaveBeenCalledWith([
      expect.objectContaining({
        month_id: "m-new",
        parent_id: "global-1",
        description: "Aluguel",
        is_completed: false,
      }),
    ]);
  });
});
