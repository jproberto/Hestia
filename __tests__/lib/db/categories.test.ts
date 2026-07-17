import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrCreateCategory, getCategories } from "@/lib/db/categories";

const mockSupabase = {
  from: vi.fn(),
} as any;

describe("Serviço de Categorias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar o ID se a categoria ja existir no banco", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cat-123" }, error: null })
        })
      })
    });

    const id = await getOrCreateCategory(mockSupabase, "Alimentação", "despesa", "teste@hestia.com");
    expect(id).toBe("cat-123");
  });

  it("deve criar uma nova categoria se nao existir no banco", async () => {
    // 1. Busca retorna null (não existe)
    // 2. Insere a nova e retorna o ID criado "cat-456"
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "cat-456" }, error: null })
      })
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "categories") {
        return {
          select: selectMock,
          insert: insertMock,
        };
      }
      return {} as any;
    });

    const id = await getOrCreateCategory(mockSupabase, "Saúde", "despesa", "teste@hestia.com");
    expect(id).toBe("cat-456");
    expect(insertMock).toHaveBeenCalledWith({
      name: "Saúde",
      type: "despesa",
      created_by: "teste@hestia.com"
    });
  });
});
