import { describe, it, expect, beforeEach } from "vitest";
import { FakeTransactionRepository } from "@/lib/pluto/repositories/fakes";
import type { TransactionInput } from "@/lib/pluto/types";

describe("FakeTransactionRepository", () => {
  let repo: FakeTransactionRepository;

  beforeEach(() => {
    repo = new FakeTransactionRepository();
    // Seed with open period for March 2026
    repo.seed({
      monthlyPeriods: [
        { id: "m-1", year: 2026, month: 3, status: "aberto", created_at: "2026-03-01T00:00:00Z", created_by: "test@test.com" },
        { id: "m-2", year: 2026, month: 4, status: "encerrado", created_at: "2026-04-01T00:00:00Z", created_by: "test@test.com" },
      ],
      categories: [
        { id: "cat-1", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
        { id: "cat-2", name: "Saúde", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
      ],
      accounts: [
        { id: "acc-1", name: "Itaú", type: "conta", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
        { id: "acc-2", name: "Nubank", type: "cartao", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
      ],
    });
  });

  it("deve buscar transações do mês específico", async () => {
    // Seed transactions
    repo.seed({
      transactions: [
        {
          id: "tx-1",
          description: "Supermercado",
          amount: 150,
          type: "despesa",
          is_refund: false,
          date: "2026-03-15",
          category_id: "cat-1",
          account_id: "acc-1",
          created_at: "2026-03-15T10:00:00Z",
          created_by: "joao@email.com",
          category_name: "Alimentação",
          account_name: "Itaú",
        },
      ],
    });

    const txs = await repo.getTransactionsByMonth(2026, 3);
    expect(txs).toHaveLength(1);
    expect(txs[0].description).toBe("Supermercado");
    expect(txs[0].category_name).toBe("Alimentação");
  });

  it("deve lançar erro se o mês da data da transação não estiver aberto", async () => {
    const input: TransactionInput = {
      description: "Aluguel",
      amount: 1200,
      type: "despesa",
      is_refund: false,
      date: "2026-04-10", // April is closed
      category_id: "cat-1",
      account_id: "acc-1",
    };

    await expect(repo.createTransaction(input, "joao@email.com")).rejects.toThrow(
      "Não é possível registrar transações no período 4/2026 pois ele não está aberto."
    );
  });

  it("deve criar transação com sucesso se o mês estiver aberto", async () => {
    const input: TransactionInput = {
      description: "Reembolso Consulta",
      amount: 50,
      type: "despesa",
      is_refund: true,
      date: "2026-03-20",
      category_id: "cat-2",
      account_id: "acc-2",
    };

    const result = await repo.createTransaction(input, "joao@email.com");

    expect(result.id).toBeDefined();
    expect(result.is_refund).toBe(true);
    expect(result.category_name).toBe("Saúde");
    expect(result.account_name).toBe("Nubank");
    expect(result.description).toBe("Reembolso Consulta");
    expect(result.amount).toBe(50);
  });

  it("deve atualizar transação com sucesso se o mês estiver aberto", async () => {
    // First create a transaction
    const created = await repo.createTransaction(
      {
        description: "Supermercado",
        amount: 150,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "cat-1",
        account_id: "acc-1",
      },
      "joao@email.com"
    );

    const result = await repo.updateTransaction(created.id, {
      description: "Supermercado Editado",
      amount: 200,
      type: "despesa",
      is_refund: false,
      date: "2026-03-15",
      category_id: "cat-1",
      account_id: "acc-1",
    });

    expect(result.id).toBe(created.id);
    expect(result.description).toBe("Supermercado Editado");
    expect(result.amount).toBe(200);
  });

  it("deve lançar erro ao tentar atualizar transação se o mês não estiver aberto", async () => {
    // Create transaction in open month
    const created = await repo.createTransaction(
      {
        description: "Supermercado",
        amount: 150,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "cat-1",
        account_id: "acc-1",
      },
      "joao@email.com"
    );

    // Try to update with date in closed month
    await expect(
      repo.updateTransaction(created.id, {
        description: "Supermercado Editado",
        amount: 200,
        type: "despesa",
        is_refund: false,
        date: "2026-04-15", // April is closed
        category_id: "cat-1",
        account_id: "acc-1",
      })
    ).rejects.toThrow("Não é possível alterar transações no período 4/2026 pois ele não está aberto.");
  });

  it("deve excluir transação com sucesso se o mês estiver aberto", async () => {
    const created = await repo.createTransaction(
      {
        description: "Supermercado",
        amount: 150,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "cat-1",
        account_id: "acc-1",
      },
      "joao@email.com"
    );

    await expect(repo.deleteTransaction(created.id)).resolves.not.toThrow();

    const txs = await repo.getTransactionsByMonth(2026, 3);
    expect(txs).toHaveLength(0);
  });

  it("deve lançar erro ao tentar excluir transação de mês não aberto", async () => {
    // Create transaction in open month
    const created = await repo.createTransaction(
      {
        description: "Supermercado",
        amount: 150,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "cat-1",
        account_id: "acc-1",
      },
      "joao@email.com"
    );

    // Close the month
    repo.seed({
      monthlyPeriods: [
        { id: "m-1", year: 2026, month: 3, status: "encerrado", created_at: "2026-03-01T00:00:00Z", created_by: "test@test.com" },
      ],
      transactions: [created],
    });

    await expect(repo.deleteTransaction(created.id)).rejects.toThrow(
      "Não é possível excluir transações no período 3/2026 pois ele não está aberto."
    );
  });

  it("deve ordenar transações por data e id", async () => {
    await repo.createTransaction(
      {
        description: "B",
        amount: 100,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "cat-1",
        account_id: "acc-1",
      },
      "joao@email.com"
    );
    await repo.createTransaction(
      {
        description: "A",
        amount: 100,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "cat-1",
        account_id: "acc-1",
      },
      "joao@email.com"
    );
    await repo.createTransaction(
      {
        description: "C",
        amount: 100,
        type: "despesa",
        is_refund: false,
        date: "2026-03-10",
        category_id: "cat-1",
        account_id: "acc-1",
      },
      "joao@email.com"
    );

    const txs = await repo.getTransactionsByMonth(2026, 3);
    expect(txs[0].date).toBe("2026-03-10");
    expect(txs[1].description).toBe("B"); // Same date, ordered by ID (B created first)
    expect(txs[2].description).toBe("A");
  });
});