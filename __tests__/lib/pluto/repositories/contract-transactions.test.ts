import { describe, it, expect, beforeEach } from "vitest";
import type { ITransactionRepository } from "@/lib/pluto/repositories/interfaces";
import type {
  Account,
  Category,
  MonthlyPeriod,
  TransactionInput,
} from "@/lib/pluto/types";
import { FakeTransactionRepository } from "@/lib/pluto/repositories/fakes";

export interface TransactionContractSeed {
  categories: Category[];
  accounts: Account[];
  monthlyPeriods: MonthlyPeriod[];
}

export interface TransactionContractBuild {
  repo: ITransactionRepository;
  seed(data: TransactionContractSeed): void;
  reset(): void;
}

/**
 * Shared contract for ITransactionRepository implementations.
 * Any implementation (in-memory fake today, Supabase-backed tomorrow)
 * must satisfy these behavioral assertions.
 */
export function defineTransactionRepositoryContract(
  label: string,
  build: () => TransactionContractBuild
) {
  describe(`ITransactionRepository contract: ${label}`, () => {
    const EMAIL = "contrato@hestia.com";
    let ctx: TransactionContractBuild;

    const baseInput: TransactionInput = {
      description: "Supermercado",
      amount: 150,
      type: "despesa",
      is_refund: false,
      date: "2026-03-15",
      category_id: "cat-1",
      account_id: "acc-1",
    };

    beforeEach(() => {
      ctx = build();
      ctx.reset();
      ctx.seed({
        categories: [
          { id: "cat-1", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: EMAIL },
        ],
        accounts: [
          { id: "acc-1", name: "Itaú", type: "conta", created_at: null, created_by: null },
        ],
        monthlyPeriods: [
          { id: "per-2026-3", year: 2026, month: 3, status: "aberto", created_at: "2026-03-01T00:00:00Z", created_by: EMAIL },
          { id: "per-2026-4", year: 2026, month: 4, status: "encerrado", created_at: "2026-04-01T00:00:00Z", created_by: EMAIL },
        ],
      });
    });

    it("create + getByMonth roundtrip preserva campos e enriquece nomes", async () => {
      const created = await ctx.repo.createTransaction(baseInput, EMAIL);
      expect(created.id).toBeTruthy();
      expect(created.description).toBe("Supermercado");
      expect(created.category_name).toBe("Alimentação");
      expect(created.account_name).toBe("Itaú");

      const txs = await ctx.repo.getTransactionsByMonth(2026, 3);
      expect(txs).toHaveLength(1);
      expect(txs[0].id).toBe(created.id);
    });

    it("rejeita create em período encerrado", async () => {
      await expect(
        ctx.repo.createTransaction({ ...baseInput, date: "2026-04-10" }, EMAIL)
      ).rejects.toThrow(/não está aberto/);
    });

    it("rejeita create em período inexistente", async () => {
      await expect(
        ctx.repo.createTransaction({ ...baseInput, date: "2026-05-10" }, EMAIL)
      ).rejects.toThrow(/não está aberto/);
    });

    it("update altera campos em período aberto", async () => {
      const created = await ctx.repo.createTransaction(baseInput, EMAIL);
      const updated = await ctx.repo.updateTransaction(created.id, {
        ...baseInput,
        description: "Supermercado Editado",
        amount: 200,
      });
      expect(updated.description).toBe("Supermercado Editado");
      expect(updated.amount).toBe(200);
    });

    it("rejeita update em período encerrado", async () => {
      const created = await ctx.repo.createTransaction(baseInput, EMAIL);
      await expect(
        ctx.repo.updateTransaction(created.id, { ...baseInput, date: "2026-04-10" })
      ).rejects.toThrow(/não está aberto/);
    });

    it("delete remove; delete de id inexistente rejeita", async () => {
      const created = await ctx.repo.createTransaction(baseInput, EMAIL);
      await ctx.repo.deleteTransaction(created.id);
      expect(await ctx.repo.getTransactionsByMonth(2026, 3)).toHaveLength(0);

      await expect(ctx.repo.deleteTransaction("inexistente")).rejects.toThrow();
    });

    it("ordena por data crescente e, em empate, por id crescente", async () => {
      await ctx.repo.createTransaction({ ...baseInput, description: "B", date: "2026-03-15" }, EMAIL);
      await ctx.repo.createTransaction({ ...baseInput, description: "A", date: "2026-03-15" }, EMAIL);
      await ctx.repo.createTransaction({ ...baseInput, description: "C", date: "2026-03-10" }, EMAIL);

      const txs = await ctx.repo.getTransactionsByMonth(2026, 3);
      expect(txs).toHaveLength(3);
      expect(txs[0].description).toBe("C");
      for (let i = 1; i < txs.length; i++) {
        expect(txs[i].date.localeCompare(txs[i - 1].date)).toBeGreaterThanOrEqual(0);
        if (txs[i].date === txs[i - 1].date) {
          expect(txs[i].id.localeCompare(txs[i - 1].id)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("filtra estritamente pelo mês consultado", async () => {
      await ctx.repo.createTransaction(baseInput, EMAIL);
      expect(await ctx.repo.getTransactionsByMonth(2026, 4)).toHaveLength(0);
      expect(await ctx.repo.getTransactionsByMonth(2026, 3)).toHaveLength(1);
    });
  });
}

defineTransactionRepositoryContract("FakeTransactionRepository", () => {
  const repo = new FakeTransactionRepository();
  return {
    repo,
    reset: () => repo.reset(),
    seed: (data: TransactionContractSeed) => repo.seed(data),
  };
});
