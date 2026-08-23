import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTransactionsByMonth, createTransaction, updateTransaction, deleteTransaction } from "@/lib/pluto/db/transactions";
import { SupabaseClient } from "@supabase/supabase-js";

const mockSupabase = {
  from: vi.fn(),
} as unknown as SupabaseClient;

describe("Serviço de Transações (Transactions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve buscar transações do mês especifico", async () => {
    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "tx-1",
                    description: "Supermercado",
                    amount: 150,
                    type: "despesa",
                    is_refund: false,
                    date: "2026-03-15",
                    categories: { name: "Alimentação" },
                    accounts: { name: "Itaú" },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const txs = await getTransactionsByMonth(mockSupabase, 2026, 3);
    expect(txs).toHaveLength(1);
    expect(txs[0].description).toBe("Supermercado");
    expect(txs[0].category_name).toBe("Alimentação");
  });

  it("deve lancar erro se o mês da data da transação nao estiver aberto", async () => {
    const fromMock = mockSupabase.from as unknown as {
      mockImplementation: (fn: (table: string) => unknown) => unknown;
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "monthly_periods") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {} as never;
    });

    await expect(
      createTransaction(
        mockSupabase,
        {
          description: "Aluguel",
          amount: 1200,
          type: "despesa",
          is_refund: false,
          date: "2026-03-10",
          category_id: "cat-1",
          account_id: "acc-1",
        },
        "joao@email.com"
      )
    ).rejects.toThrow("Não é possível registrar transações no período 3/2026 pois ele não está aberto.");
  });

  it("deve criar transação com sucesso se o mês estiver aberto", async () => {
    const monthlyPeriodsMock = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { status: "aberto" }, error: null }),
          }),
        }),
      }),
    };

    const insertMock = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tx-99",
              description: "Reembolso Consulta",
              amount: 50,
              type: "despesa",
              is_refund: true,
              date: "2026-03-20",
              created_by: "joao@email.com",
              categories: { name: "Saúde" },
              accounts: { name: "Nubank" },
            },
            error: null,
          }),
        }),
      }),
    };

    const fromMock = mockSupabase.from as unknown as {
      mockImplementation: (fn: (table: string) => unknown) => unknown;
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "monthly_periods") return monthlyPeriodsMock;
      if (table === "transactions") return insertMock;
      return {} as never;
    });

    const result = await createTransaction(
      mockSupabase,
      {
        description: "Reembolso Consulta",
        amount: 50,
        type: "despesa",
        is_refund: true,
        date: "2026-03-20",
        category_id: "cat-2",
        account_id: "acc-2",
      },
      "joao@email.com"
    );

    expect(result.id).toBe("tx-99");
    expect(result.is_refund).toBe(true);
    expect(result.category_name).toBe("Saúde");
  });

  it("deve atualizar transação com sucesso se o mês estiver aberto", async () => {
    const monthlyPeriodsMock = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { status: "aberto" }, error: null }),
          }),
        }),
      }),
    };

    const updateMock = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "tx-1",
                description: "Supermercado Editado",
                amount: 200,
                type: "despesa",
                is_refund: false,
                date: "2026-03-15",
                created_by: "joao@email.com",
                categories: { name: "Alimentação" },
                financial_accounts: { name: "Itaú" },
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const fromMock = mockSupabase.from as unknown as {
      mockImplementation: (fn: (table: string) => unknown) => unknown;
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "monthly_periods") return monthlyPeriodsMock;
      if (table === "transactions") return updateMock;
      return {} as never;
    });

    const result = await updateTransaction(
      mockSupabase,
      "tx-1",
      {
        description: "Supermercado Editado",
        amount: 200,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "cat-1",
        account_id: "acc-1",
      }
    );

    expect(result.id).toBe("tx-1");
    expect(result.description).toBe("Supermercado Editado");
    expect(result.amount).toBe(200);
  });

  it("deve lancar erro ao tentar atualizar transação se o mês não estiver aberto", async () => {
    const monthlyPeriodsMock = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { status: "encerrado" }, error: null }),
          }),
        }),
      }),
    };

    const fromMock = mockSupabase.from as unknown as {
      mockImplementation: (fn: (table: string) => unknown) => unknown;
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "monthly_periods") return monthlyPeriodsMock;
      return {} as never;
    });

    await expect(
      updateTransaction(
        mockSupabase,
        "tx-1",
        {
          description: "Supermercado Editado",
          amount: 200,
          type: "despesa",
          is_refund: false,
          date: "2026-03-15",
          category_id: "cat-1",
          account_id: "acc-1",
        }
      )
    ).rejects.toThrow("Não é possível alterar transações no período 3/2026 pois ele não está aberto.");
  });

  it("deve excluir transação com sucesso se o mês estiver aberto", async () => {
    const monthlyPeriodsMock = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { status: "aberto" }, error: null }),
          }),
        }),
      }),
    };

    const deleteMock = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tx-1", date: "2026-03-15" },
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    const fromMock = mockSupabase.from as unknown as {
      mockImplementation: (fn: (table: string) => unknown) => unknown;
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "monthly_periods") return monthlyPeriodsMock;
      if (table === "transactions") return deleteMock;
      return {} as never;
    });

    await expect(deleteTransaction(mockSupabase, "tx-1")).resolves.not.toThrow();
  });

  it("deve lancar erro ao tentar excluir transação de mês não aberto", async () => {
    const monthlyPeriodsMock = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    };

    const selectMock = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tx-1", date: "2026-03-15" },
            error: null,
          }),
        }),
      }),
    };

    const fromMock = mockSupabase.from as unknown as {
      mockImplementation: (fn: (table: string) => unknown) => unknown;
    };
    fromMock.mockImplementation((table: string) => {
      if (table === "monthly_periods") return monthlyPeriodsMock;
      if (table === "transactions") return selectMock;
      return {} as never;
    });

    await expect(deleteTransaction(mockSupabase, "tx-1")).rejects.toThrow(
      "Não é possível excluir transações no período 3/2026 pois ele não está aberto."
    );
  });
});

