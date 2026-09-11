import { describe, it, expect, beforeEach } from "vitest";
import { FakeAccountRepository } from "@/lib/pluto/repositories/fakes";

describe("Serviço de Contas (Accounts)", () => {
  let repo: FakeAccountRepository;

  beforeEach(() => {
    repo = new FakeAccountRepository();
  });

  it("deve buscar todas as contas e cartões cadastrados", async () => {
    repo.seed([
      { id: "acc-1", name: "Itaú Corrente", type: "conta", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
      { id: "acc-2", name: "Nubank Cartão", type: "cartao", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const accounts = await repo.getAccounts();
    expect(accounts).toHaveLength(2);
    expect(accounts[0].name).toBe("Itaú Corrente");
    expect(accounts[1].type).toBe("cartao");
  });

  it("deve retornar o ID se a conta ja existir no banco", async () => {
    repo.seed([
      { id: "acc-123", name: "Itaú Corrente", type: "conta", created_at: "2026-01-01T00:00:00Z", created_by: "test@test.com" },
    ]);

    const id = await repo.getOrCreateAccount("Itaú Corrente", "joao@email.com", "conta");
    expect(id).toBe("acc-123");
  });

  it("deve criar uma nova conta/cartão se nao existir no banco", async () => {
    const id = await repo.getOrCreateAccount("Bradesco Cartão", "joao@email.com", "cartao");
    expect(id).toBeDefined();
    expect(id).toContain("acc-");

    const accounts = await repo.getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("Bradesco Cartão");
    expect(accounts[0].type).toBe("cartao");
    expect(accounts[0].created_by).toBe("joao@email.com");
  });
});