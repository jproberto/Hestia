import { describe, it, expect, beforeEach } from "vitest";
import { FakeAccountRepository } from "@/lib/pluto/repositories/fakes";

describe("FakeAccountRepository", () => {
  let repo: FakeAccountRepository;

  beforeEach(() => {
    repo = new FakeAccountRepository();
  });

  it("deve buscar todas as contas e cartões cadastrados ordenados por nome", async () => {
    repo.seed([
      { id: "acc-2", name: "Nubank Cartão", type: "cartao", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
      { id: "acc-1", name: "Itaú Corrente", type: "conta", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const accounts = await repo.getAccounts();
    expect(accounts).toHaveLength(2);
    expect(accounts[0].name).toBe("Itaú Corrente");
    expect(accounts[0].type).toBe("conta");
    expect(accounts[1].name).toBe("Nubank Cartão");
    expect(accounts[1].type).toBe("cartao");
  });

  it("deve retornar o ID se a conta já existir no banco", async () => {
    repo.seed([
      { id: "acc-123", name: "Itaú Corrente", type: "conta", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const id = await repo.getOrCreateAccount("Itaú Corrente", "joao@email.com", "conta");
    expect(id).toBe("acc-123");
  });

  it("deve criar uma nova conta/cartão se não existir no banco", async () => {
    const id = await repo.getOrCreateAccount("Bradesco Cartão", "joao@email.com", "cartao");
    expect(id).toBeDefined();
    expect(id).toContain("acc-");

    const accounts = await repo.getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("Bradesco Cartão");
    expect(accounts[0].type).toBe("cartao");
    expect(accounts[0].created_by).toBe("joao@email.com");
  });

  it("deve normalizar nome da conta (trim)", async () => {
    const id = await repo.getOrCreateAccount("  Santander  ", "joao@email.com", "conta");
    const accounts = await repo.getAccounts();
    expect(accounts[0].name).toBe("Santander");
  });

  it("deve ser case-insensitive ao buscar conta existente", async () => {
    repo.seed([
      { id: "acc-1", name: "Itau", type: "conta", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const id1 = await repo.getOrCreateAccount("ITAU", "joao@email.com", "conta");
    const id2 = await repo.getOrCreateAccount("itau", "joao@email.com", "conta");
    expect(id1).toBe("acc-1");
    expect(id2).toBe("acc-1");
  });

  it("reset deve limpar todos os dados", async () => {
    repo.seed([
      { id: "acc-1", name: "Teste", type: "conta", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    repo.reset();
    const accounts = await repo.getAccounts();
    expect(accounts).toHaveLength(0);
  });
});