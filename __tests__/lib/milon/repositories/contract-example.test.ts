import { describe, it, expect, beforeEach } from "vitest";
import type { IMilonRepository } from "@/lib/milon/repositories/interfaces";
import { createFakeMilonRepository } from "@/lib/milon/repositories/fakes/example";

function defineMilonRepositoryContract(label: string, build: () => IMilonRepository) {
  describe(`IMilonRepository contract: ${label}`, () => {
    let repo: IMilonRepository;

    beforeEach(() => {
      repo = build();
    });

    it("lista vazio no início e cria itens", async () => {
      expect(await repo.list()).toEqual([]);
      const created = await repo.create({ name: "Primeiro" });
      expect(created.id).toBeDefined();
      expect(created.name).toBe("Primeiro");
      expect(await repo.list()).toHaveLength(1);
    });

    it("trim no nome ao criar", async () => {
      const created = await repo.create({ name: "  Espaços  " });
      expect(created.name).toBe("Espaços");
    });
  });
}

defineMilonRepositoryContract("fake em memória", () => createFakeMilonRepository());
