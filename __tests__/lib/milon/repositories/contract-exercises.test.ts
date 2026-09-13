import { describe, it, expect, beforeEach } from "vitest";
import type { IExerciseRepository } from "@/lib/milon/repositories/interfaces";
import { createFakeExerciseRepository } from "@/lib/milon/repositories/fakes/fakeExerciseRepository";
import { EXERCISE_DUPLICATE_MESSAGE } from "@/lib/milon/repositories/exercises";
import type { Exercise } from "@/lib/milon/types";

// Contrato fakes-only (decisão 57): nenhum teste aqui bate no banco real.
// Só o fake em memória é exercitado; o repository real é verificado por tsc
// (mesmas assinaturas) e pelo consumo via barrel em TASK-004/005.
function defineExerciseRepositoryContract(
  label: string,
  build: () => IExerciseRepository,
) {
  describe(`IExerciseRepository contract: ${label}`, () => {
    const EMAIL = "contrato@hestia.lan";
    let repo: IExerciseRepository;

    beforeEach(() => {
      repo = build();
    });

    it("lista vazio no início", async () => {
      expect(await repo.list()).toEqual([]);
    });

    it("cria exercício com id, link anulável e auditoria", async () => {
      const created = await repo.create(
        { name: "Supino reto", muscle: "peito" },
        EMAIL,
      );
      expect(created.id).toBeDefined();
      expect(created.name).toBe("Supino reto");
      expect(created.muscle).toBe("peito");
      expect(created.videoLink).toBeNull();
      expect(created.created_by).toBe(EMAIL);
      expect(await repo.list()).toHaveLength(1);
    });

    it("cria preservando link de vídeo informado", async () => {
      const created = await repo.create(
        {
          name: "Puxada aberta",
          muscle: "costas",
          videoLink: "https://example.com/video",
        },
        EMAIL,
      );
      expect(created.videoLink).toBe("https://example.com/video");
    });

    it("bloqueia duplicado exato com mensagem fixa", async () => {
      await repo.create({ name: "Supino reto", muscle: "peito" }, EMAIL);
      await expect(
        repo.create({ name: "Supino reto", muscle: "peito" }, EMAIL),
      ).rejects.toThrow(
        "Esse exercício já existe naquele músculo. Localize o item na lista para conferência ou edição.",
      );
    });

    it.each([
      ["SUPINO RETO", "PEITO"],
      ["  supino   rêto! ", "  peito "],
      ["Súpiño-Reto", "Pêito"],
      ["supino reto", "peito"],
    ])(
      "bloqueia duplicado com variação de caixa/acentos/especiais/espaços (%s / %s)",
      async (name, muscle) => {
        await repo.create({ name: "Supino reto", muscle: "peito" }, EMAIL);
        await expect(repo.create({ name, muscle }, EMAIL)).rejects.toThrow(
          EXERCISE_DUPLICATE_MESSAGE,
        );
      },
    );

    it("permite mesmo nome em músculos diferentes", async () => {
      await repo.create({ name: "Supino reto", muscle: "peito" }, EMAIL);
      const other = await repo.create(
        { name: "Supino reto", muscle: "perna" },
        EMAIL,
      );
      expect(other.id).toBeDefined();
      expect(await repo.list()).toHaveLength(2);
    });

    it("permite edição mantendo o próprio nome+músculo", async () => {
      const created = await repo.create(
        { name: "Supino reto", muscle: "peito" },
        EMAIL,
      );
      const updated = await repo.update(
        created.id,
        { name: "Supino reto", muscle: "peito", videoLink: null },
      );
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe("Supino reto");
    });

    it("bloqueia edição que colide com outro exercício existente", async () => {
      const first = await repo.create(
        { name: "Supino reto", muscle: "peito" },
        EMAIL,
      );
      const second = await repo.create(
        { name: "Crucifixo", muscle: "peito" },
        EMAIL,
      );
      expect(first.id).not.toBe(second.id);
      await expect(
        repo.update(second.id, {
          name: "  SUPINO rêto! ",
          muscle: "peito",
          videoLink: null,
        }),
      ).rejects.toThrow(EXERCISE_DUPLICATE_MESSAGE);
      // Lista permanece intacta após o bloqueio.
      expect(await repo.list()).toHaveLength(2);
    });

    it("atualiza nome, músculo e link de exercício sem colisão", async () => {
      const created = await repo.create(
        { name: "Supino reto", muscle: "peito" },
        EMAIL,
      );
      const updated = await repo.update(
        created.id,
        {
          name: "Supino inclinado",
          muscle: "peito",
          videoLink: "https://example.com/novo",
        },
      );
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe("Supino inclinado");
      expect(updated.videoLink).toBe("https://example.com/novo");
    });

    it("listagem retorna ordenada por músculo e depois por nome", async () => {
      await repo.create({ name: "Supino reto", muscle: "peito" }, EMAIL);
      await repo.create({ name: "Agachamento", muscle: "perna" }, EMAIL);
      await repo.create({ name: "Crucifixo", muscle: "peito" }, EMAIL);
      const listed = await repo.list();
      expect(listed.map((e) => e.name)).toEqual([
        "Crucifixo",
        "Supino reto",
        "Agachamento",
      ]);
    });

    it("remove por id e reflete na lista", async () => {
      const created = await repo.create(
        { name: "Supino reto", muscle: "peito" },
        EMAIL,
      );
      await repo.remove(created.id);
      expect(await repo.list()).toEqual([]);
    });

    it("remove de id inexistente não quebra a lista", async () => {
      await repo.create({ name: "Supino reto", muscle: "peito" }, EMAIL);
      await repo.remove("id-que-nao-existe");
      expect(await repo.list()).toHaveLength(1);
    });

    it("seed inicial aparece ordenado na listagem", async () => {
      const seeded = createFakeExerciseRepository([
        {
          id: "seed-1",
          name: "Supino reto",
          muscle: "peito",
          videoLink: null,
          createdAt: "2026-09-12T00:00:00.000Z",
          created_by: EMAIL,
        } satisfies Exercise,
        {
          id: "seed-2",
          name: "Agachamento",
          muscle: "perna",
          videoLink: null,
          createdAt: "2026-09-12T00:00:00.000Z",
          created_by: EMAIL,
        } satisfies Exercise,
      ]);
      const listed = await seeded.list();
      expect(listed.map((e) => e.id)).toEqual(["seed-1", "seed-2"]);
    });
  });
}

defineExerciseRepositoryContract(
  "fake em memória",
  () => createFakeExerciseRepository(),
);
