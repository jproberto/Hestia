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

  it("deve buscar todas as contas cadastradas", async () => {
    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ id: "acc-1", name: "Itaú" }, { id: "acc-2", name: "Nubank" }],
          error: null,
        }),
      }),
    });

    const accounts = await getAccounts(mockSupabase);
    expect(accounts).toHaveLength(2);
    expect(accounts[0].name).toBe("Itaú");
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

    const id = await getOrCreateAccount(mockSupabase, "Itaú", "joao@email.com");
    expect(id).toBe("acc-123");
  });

  it("deve criar uma nova conta se nao existir no banco", async () => {
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
      if (table === "accounts") {
        return {
          select: selectMock,
          insert: insertMock,
        };
      }
      return {} as never;
    });

    const id = await getOrCreateAccount(mockSupabase, "Bradesco", "joao@email.com");
    expect(id).toBe("acc-789");
    expect(insertMock).toHaveBeenCalledWith({
      name: "Bradesco",
      created_by: "joao@email.com",
    });
  });
});
