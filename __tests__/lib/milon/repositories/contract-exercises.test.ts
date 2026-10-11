import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
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
          loadUnit: null,
          deletedAt: null,
          createdAt: "2026-09-12T00:00:00.000Z",
          created_by: EMAIL,
        } satisfies Exercise,
        {
          id: "seed-2",
          name: "Agachamento",
          muscle: "perna",
          videoLink: null,
          loadUnit: null,
          deletedAt: null,
          createdAt: "2026-09-12T00:00:00.000Z",
          created_by: EMAIL,
        } satisfies Exercise,
      ]);
      const listed = await seeded.list();
      expect(listed.map((e) => e.id)).toEqual(["seed-1", "seed-2"]);
    });
  });
}

// ---------------------------------------------------------------------------
// Contrato RED da TASK-001 (Mílon #3) — soft delete + unidade de carga.
// Fonte: plan.md §3 "Repositório de exercícios" e "Fake do repositório"
// ("espelha soft delete + filtros novos") + tasks.json TASK-001/002.
//
// A fake ganha dois comportamentos espelhados do repository real:
//   - `list()` devolve SÓ os ativos; `listAll()` devolve todos (inclui os
//     soft-deletados, para renderização de contexto de treino);
//   - `remove()` passa a ser SOFT DELETE (grava `deletedAt`, não apaga);
//   - a anti-duplicata considera apenas linhas não excluídas.
// (D33, reversão biblioteca: `setExerciseLoadUnit` REMOVIDO — ausência
// asserida no bloco TASK-010 abaixo; este bloco não o referencia.)
// Testada na classe concreta (createFakeExerciseRepository) — não exige
// mudança na interface IExerciseRepository.
// ---------------------------------------------------------------------------
describe("fake em memória: soft delete e unidade de carga (contrato TASK-001)", () => {
  const EMAIL = "contrato@hestia.lan";

  function ativo(id: string, name: string, muscle: string): Exercise {
    return {
      id,
      name,
      muscle,
      videoLink: null,
      loadUnit: null,
      deletedAt: null,
      createdAt: "2026-09-12T00:00:00.000Z",
      created_by: EMAIL,
    } satisfies Exercise;
  }

  it("list() devolve só os ativos e listAll() devolve todos", async () => {
    const fake = createFakeExerciseRepository([
      ativo("seed-1", "Supino reto", "peito"),
      { ...ativo("seed-2", "Agachamento", "perna"), deletedAt: "2026-10-01T12:00:00.000Z" },
    ]);

    expect((await fake.list()).map((e) => e.id)).toEqual(["seed-1"]);
    expect((await fake.listAll()).map((e) => e.id)).toEqual(["seed-1", "seed-2"]);
  });

  it("remove() vira soft delete: sai da listagem mas permanece em listAll()", async () => {
    const fake = createFakeExerciseRepository([ativo("ex-1", "Supino reto", "peito")]);

    await fake.remove("ex-1");

    expect(await fake.list()).toEqual([]);
    const preservado = await fake.listAll();
    expect(preservado).toHaveLength(1);
    expect(preservado[0].id).toBe("ex-1");
    expect(preservado[0].deletedAt).not.toBeNull();
    expect(typeof preservado[0].deletedAt).toBe("string");
  });

  it("remove() de id inexistente não quebra list() nem listAll()", async () => {
    const fake = createFakeExerciseRepository([ativo("ex-1", "Supino reto", "peito")]);

    await fake.remove("id-que-nao-existe");

    expect(await fake.list()).toHaveLength(1);
    expect(await fake.listAll()).toHaveLength(1);
  });

  it("recria nome removido: a anti-duplicata só conta ativos", async () => {
    const fake = createFakeExerciseRepository();
    const created = await fake.create({ name: "Supino reto", muscle: "peito" }, EMAIL);
    await fake.remove(created.id);

    // Sem soft delete considerando todos, esta criação seria bloqueada como duplicado.
    const recriado = await fake.create({ name: "supino reto", muscle: "PEITO" }, EMAIL);
    expect(recriado.id).not.toBe(created.id);
    expect(await fake.list()).toHaveLength(1);
    expect(await fake.listAll()).toHaveLength(2);
  });

  // D33 (reversão biblioteca): `setExerciseLoadUnit` removido do fake e da
  // interface — ausência asserida no bloco TASK-010 abaixo ("não expõe ajuste
  // de unidade da biblioteca"). Sem teste de persistência de unidade aqui.
});

defineExerciseRepositoryContract(
  "fake em memória",
  () => createFakeExerciseRepository(),
);

// ---------------------------------------------------------------------------
// Contrato RED da TASK-010 (Mílon #5, Aditamento 2026-10-09 "0012 CORRETA").
// SUBSTITUI o bloco TASK-006 (modo/unidade na biblioteca, superseded pela
// reversão D33 — removido, não apenas comentado).
//
// Fonte: tasks.json TASK-010 (contract-exercises: somente nome/músculo/vídeo
// + ausência do ajuste de modo da biblioteca) + plan.md Aditamento 0012
// CORRETA §1 Mudança B + §3 (Modal da biblioteca + Biblioteca legada) + D30/D33.
//
// Contrato fixado aqui (o que a TASK-011 deve implementar):
// - CreateExerciseInput/UpdateExerciseInput voltam a ter SÓ nome, músculo e
//   vídeo; modo e unidade extras são IGNORADOS na criação/atualização;
// - Exercise (domínio) PERDE `mode`; mantém `loadUnit` como leitura legada
//   (D30 — lida, ignorada no treino; sem escrita pelo caminho do treino);
// - REMOVIDOS do repository, do fake e da interface: `setExerciseMode` (+
//   standalone) e `setExerciseLoadUnit` (+ standalone) — os ajustes vivem
//   na entry (setEntryMode/setEntryLoadUnit do repositório de treinos).
//
// Expected: FAIL — o repository e o fake ainda persistem modo/unidade e
// ainda têm os ajustes. Hefesto fará GREEN na TASK-011 sem mudar estes
// testes. Casts `as unknown as` mantêm o tsc verde no RED.
// ---------------------------------------------------------------------------
describe("biblioteca somente nome/músculo/vídeo (TASK-010 — RED)", () => {
  const EMAIL = "biblioteca@hestia.lan";

  it("cria exercício ignorando modo e unidade extras (só nome, músculo e vídeo)", async () => {
    const fake = createFakeExerciseRepository();
    const created = (await fake.create(
      {
        name: "Supino reto",
        muscle: "peito",
        videoLink: null,
        mode: "tempo",
        loadUnit: "libra",
      } as unknown as Parameters<typeof fake.create>[0],
      EMAIL,
    )) as unknown as Record<string, unknown>;

    expect(created.name).toBe("Supino reto");
    expect(created.muscle).toBe("peito");
    expect(created.videoLink).toBeNull();
    // Modo removido do exercício (D33): nem a chave existe na resposta.
    expect(created.mode).toBeUndefined();
    // Unidade extra ignorada na criação (D30: sem escrita pela biblioteca).
    expect(created.loadUnit).toBeNull();
  });

  it("atualiza exercício ignorando modo e unidade extras", async () => {
    const fake = createFakeExerciseRepository();
    const created = await fake.create(
      { name: "Supino reto", muscle: "peito" },
      EMAIL,
    );

    const updated = (await fake.update(created.id, {
      name: "Supino inclinado",
      muscle: "peito",
      videoLink: "https://example.com/novo",
      mode: "tempo",
      loadUnit: "libra",
    } as unknown as Parameters<typeof fake.update>[1])) as unknown as Record<
      string,
      unknown
    >;

    expect(updated.name).toBe("Supino inclinado");
    expect(updated.videoLink).toBe("https://example.com/novo");
    expect(updated.mode).toBeUndefined();
    expect(updated.loadUnit).toBeNull();
  });

  it("não expõe ajuste de modo da biblioteca (removido, D33)", async () => {
    const fake = createFakeExerciseRepository();
    await fake.create({ name: "Supino reto", muscle: "peito" }, EMAIL);

    expect(
      (fake as unknown as Record<string, unknown>).setExerciseMode,
    ).toBeUndefined();
  });

  it("não expõe ajuste de unidade da biblioteca (removido, D33)", async () => {
    const fake = createFakeExerciseRepository();
    await fake.create({ name: "Supino reto", muscle: "peito" }, EMAIL);

    expect(
      (fake as unknown as Record<string, unknown>).setExerciseLoadUnit,
    ).toBeUndefined();
  });

  it("código vivo sem os ajustes da biblioteca (substituição, D33)", () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../../../lib/milon/repositories/exercises.ts",
      ),
      "utf8",
    );
    expect(src).not.toMatch(/setExerciseMode/);
    expect(src).not.toMatch(/export async function setExerciseLoadUnit/);
    expect(src).not.toMatch(
      /export async function setExerciseLoadUnitStandalone/,
    );
  });
});
