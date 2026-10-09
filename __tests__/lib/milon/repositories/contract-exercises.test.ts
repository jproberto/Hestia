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
//   - `setExerciseLoadUnit(id, unit)` persiste a unidade por exercício (D10);
//   - a anti-duplicata considera apenas linhas não excluídas.
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

  it("setExerciseLoadUnit persiste a unidade no exercício", async () => {
    const fake = createFakeExerciseRepository([ativo("ex-1", "Supino reto", "peito")]);

    await fake.setExerciseLoadUnit("ex-1", "kg");

    const [exercicio] = await fake.list();
    expect(exercicio.loadUnit).toBe("kg");
    // A escolha é do casal: o mesmo registro visto por listAll também muda.
    expect((await fake.listAll())[0].loadUnit).toBe("kg");
  });

  it("setExerciseLoadUnit aceita libra e não mexe em deletedAt", async () => {
    const fake = createFakeExerciseRepository([ativo("ex-1", "Supino reto", "peito")]);

    await fake.setExerciseLoadUnit("ex-1", "libra");

    const exercicio = (await fake.list())[0];
    expect(exercicio.loadUnit).toBe("libra");
    expect(exercicio.deletedAt).toBeNull();
  });
});

defineExerciseRepositoryContract(
  "fake em memória",
  () => createFakeExerciseRepository(),
);

// ---------------------------------------------------------------------------
// Contrato RED da TASK-006 (Mílon #5, aditamento 2026-10-09 dos 3 achados).
// Fonte: tasks.json TASK-006 (contract-exercises: criação e atualização
// persistindo modo e unidade + ajuste de modo) + plan.md Aditamento §1
// Mudança A + §3 (Modo do exercício + Ajuste de modo do exercício) + D25/D26.
//
// Contrato fixado aqui (nomes que a TASK-007 deve implementar):
// - CreateExerciseInput/UpdateExerciseInput ganham `mode` (ExerciseMode |
//   null/undefined; "repeticao" | "tempo") e `loadUnit` (LoadUnit |
//   null/undefined); create/update persistem ambos;
// - Exercise (domínio) ganha `mode: ExerciseMode | null` (nulo = linha
//   antiga, leitura com fallback repetição) e mantém loadUnit;
// - nova operação `setExerciseMode(id, mode)` + standalone
//   `setExerciseModeStandalone(id, mode)`, espelhada no fake (mesmo padrão
//   do setExerciseLoadUnit vigente);
// - sem coluna nova nas séries (D26 — nada aqui toca em séries).
//
// Expected: FAIL — o repository e o fake ainda ignoram modo/unidade no
// create/update e ainda não têm setExerciseMode. Hefesto fará GREEN na
// TASK-007 sem mudar estes testes. Casts `as unknown as` mantêm o tsc
// verde no RED (a falha é em runtime, não em tipo).
// ---------------------------------------------------------------------------
describe("modo e unidade do exercício (TASK-006 — RED)", () => {
  const EMAIL = "modo@hestia.lan";

  type WithMode<T> = T & {
    mode?: "repeticao" | "tempo" | null;
    loadUnit?: "kg" | "libra" | null;
  };

  it("cria exercício persistindo modo tempo e unidade kg", async () => {
    const fake = createFakeExerciseRepository();
    const created = (await fake.create(
      {
        name: "Supino reto",
        muscle: "peito",
        mode: "tempo",
        loadUnit: "kg",
      } as WithMode<Parameters<typeof fake.create>[0]>,
      EMAIL,
    )) as unknown as WithMode<Exercise>;

    expect(created.mode).toBe("tempo");
    expect(created.loadUnit).toBe("kg");
  });

  it("cria exercício persistindo modo repeticao e unidade libra", async () => {
    const fake = createFakeExerciseRepository();
    const created = (await fake.create(
      {
        name: "Agachamento",
        muscle: "perna",
        mode: "repeticao",
        loadUnit: "libra",
      } as WithMode<Parameters<typeof fake.create>[0]>,
      EMAIL,
    )) as unknown as WithMode<Exercise>;

    expect(created.mode).toBe("repeticao");
    expect(created.loadUnit).toBe("libra");
  });

  it("cria sem modo nem unidade deixa ambos nulos (linhas antigas)", async () => {
    const fake = createFakeExerciseRepository();
    const created = (await fake.create(
      { name: "Rosca direta", muscle: "braço" },
      EMAIL,
    )) as unknown as WithMode<Exercise>;

    expect(created.mode).toBeNull();
    expect(created.loadUnit).toBeNull();
  });

  it("atualiza exercício persistindo modo e unidade novos", async () => {
    const fake = createFakeExerciseRepository();
    const created = await fake.create(
      { name: "Supino reto", muscle: "peito" },
      EMAIL,
    );

    const updated = (await fake.update(created.id, {
      name: "Supino reto",
      muscle: "peito",
      videoLink: null,
      mode: "tempo",
      loadUnit: "libra",
    } as WithMode<Parameters<typeof fake.update>[1]>)) as unknown as WithMode<Exercise>;

    expect(updated.mode).toBe("tempo");
    expect(updated.loadUnit).toBe("libra");
    const [lido] = (await fake.list()) as unknown as WithMode<Exercise>[];
    expect(lido.mode).toBe("tempo");
    expect(lido.loadUnit).toBe("libra");
  });

  it("ajuste de modo altera exercício existente sem mexer em nome/músculo/unidade", async () => {
    const fake = createFakeExerciseRepository();
    const created = (await fake.create(
      {
        name: "Supino reto",
        muscle: "peito",
        mode: "repeticao",
        loadUnit: "kg",
      } as WithMode<Parameters<typeof fake.create>[0]>,
      EMAIL,
    )) as unknown as WithMode<Exercise>;

    const api = fake as unknown as {
      setExerciseMode: (
        id: string,
        mode: "repeticao" | "tempo",
      ) => Promise<void>;
    };
    expect(typeof api.setExerciseMode).toBe("function");
    await api.setExerciseMode(created.id, "tempo");

    const [lido] = (await fake.list()) as unknown as WithMode<Exercise>[];
    expect(lido.mode).toBe("tempo");
    expect(lido.name).toBe("Supino reto");
    expect(lido.muscle).toBe("peito");
    expect(lido.loadUnit).toBe("kg");
  });

  it("ajuste de modo aparece também em listAll (mesmo registro)", async () => {
    const fake = createFakeExerciseRepository();
    const created = await fake.create(
      { name: "Supino reto", muscle: "peito" },
      EMAIL,
    );
    const api = fake as unknown as {
      setExerciseMode: (
        id: string,
        mode: "repeticao" | "tempo",
      ) => Promise<void>;
    };
    await api.setExerciseMode(created.id, "tempo");

    const todos = (await fake.listAll()) as unknown as WithMode<Exercise>[];
    expect(todos).toHaveLength(1);
    expect(todos[0].mode).toBe("tempo");
  });
});
