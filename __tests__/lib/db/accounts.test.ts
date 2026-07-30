import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAccounts, getOrCreateAccount } from "@/lib/db/accounts";
import { SupabaseClient } from "@supabase/supabase-js";

const mockSupabase = {
  from: vi.fn(),
} as unknown as SupabaseClient;

describe("Serviço de Contas (Accounts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve buscar todas as contas e cartões cadastrados", async () => {
    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: "acc-1", name: "Itaú Corrente", type: "conta" },
            { id: "acc-2", name: "Nubank Cartão", type: "cartao" },
          ],
          error: null,
        }),
      }),
    });

    const accounts = await getAccounts(mockSupabase);
    expect(accounts).toHaveLength(2);
    expect(accounts[0].name).toBe("Itaú Corrente");
    expect(accounts[1].type).toBe("cartao");
  });

  it("deve retornar o ID se a conta ja existir no banco", async () => {
    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "acc-123" }, error: null }),
        }),
      }),
    });

    const id = await getOrCreateAccount(mockSupabase, "Itaú Corrente", "joao@email.com", "conta");
    expect(id).toBe("acc-123");
  });

  it("deve criar uma nova conta/cartão se nao existir no banco", async () => {
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "acc-789" }, error: null }),
      }),
    });

    const fromMock = mockSupabase.from as unknown as {
      mockImplementation: (fn: (table: string) => unknown) => unknown;
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "financial_accounts") {
        return {
          select: selectMock,
          insert: insertMock,
        };
      }
      return {} as never;
    });

    const id = await getOrCreateAccount(mockSupabase, "Bradesco Cartão", "joao@email.com", "cartao");
    expect(id).toBe("acc-789");
    expect(insertMock).toHaveBeenCalledWith({
      name: "Bradesco Cartão",
      type: "cartao",
      created_by: "joao@email.com",
    });
  });
});
