import { describe, it, expect, beforeEach } from "vitest";
import type { IAccountRepository } from "@/lib/pluto/repositories/interfaces";
import { FakeAccountRepository } from "@/lib/pluto/repositories/fakes";

export interface AccountContractBuild {
  repo: IAccountRepository;
  reset(): void;
}

/**
 * Shared contract for IAccountRepository implementations.
 */
export function defineAccountRepositoryContract(
  label: string,
  build: () => AccountContractBuild
) {
  describe(`IAccountRepository contract: ${label}`, () => {
    const EMAIL = "contrato@hestia.com";
    let ctx: AccountContractBuild;

    beforeEach(() => {
      ctx = build();
      ctx.reset();
    });

    it("getOrCreate é idempotente para o mesmo nome", async () => {
      const id1 = await ctx.repo.getOrCreateAccount("Itaú", EMAIL, "conta");
      const id2 = await ctx.repo.getOrCreateAccount("Itaú", EMAIL, "conta");
      expect(id1).toBe(id2);
    });

    it("preserva o tipo conta/cartão", async () => {
      await ctx.repo.getOrCreateAccount("Nubank", EMAIL, "cartao");
      const all = await ctx.repo.getAccounts();
      expect(all.find((a) => a.name === "Nubank")?.type).toBe("cartao");
    });

    it("getAccounts ordena por nome", async () => {
      await ctx.repo.getOrCreateAccount("Zebra Bank", EMAIL, "conta");
      await ctx.repo.getOrCreateAccount("Abacate Bank", EMAIL, "conta");

      const all = await ctx.repo.getAccounts();
      expect(all.map((a) => a.name)).toEqual(["Abacate Bank", "Zebra Bank"]);
    });

    it("usa 'conta' como tipo padrão", async () => {
      await ctx.repo.getOrCreateAccount("Padrão", EMAIL, "conta");
      const all = await ctx.repo.getAccounts();
      expect(all.find((a) => a.name === "Padrão")?.type).toBe("conta");
    });
  });
}

defineAccountRepositoryContract("FakeAccountRepository", () => {
  const repo = new FakeAccountRepository();
  return {
    repo,
    reset: () => repo.reset(),
  };
});
