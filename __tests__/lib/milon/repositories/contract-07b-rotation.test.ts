// Contrato RED — Mílon 07b Rotação do Treino do Dia (TASK-001): repositórios.
// Fonte: `.agents/modules/milon/07b-rotacao-treino-dia/spec.md` §3/§5
// (D1/D2 ordem própria + reordenação, D6 guarda de exclusão com execução,
// D10 aberta por programa) + `plan.md` §3 (listWorkoutsByProgram ordenada por
// position, createWorkout numerado, reorderWorkouts, deleteWorkout com
// MSG_TREINO_COM_EXECUCOES, findLastSealedExecutionByProgram,
// findOpenExecutionByProgram, interfaces e fakes) + `tasks.json` TASK-001.
// Contrato fakes-only (decisão 57): só os fakes em memória são exercitados; o
// repository real é verificado por tsc (mesmas assinaturas via export check)
// e pelas cadeias de query em `db/*.test.ts`.
// Escrito ANTES da implementação (outside-in). Expected: FAIL —
// `reorderWorkouts`, última selada por programa e aberta por programa ainda
// não existem nos repositórios nem nos fakes, a ordenação por posição não
// existe e a guarda de exclusão com execução não existe (motivos certos:
// método ausente/ordem errada/exclusão indevida, nunca sintaxe). Hefesto fará
// GREEN na TASK-002 sem mudar estes testes.
// Convenção tsc: acessos novos via cast `as unknown as` (tipos ainda não têm
// o contrato); a falha é em runtime, não em tipo.
import { describe, it, expect } from "vitest";
import { createFakeWorkoutRepository } from "@/lib/milon/repositories/fakes/fakeWorkoutRepository";
import { createFakeWorkoutExecutionRepository } from "@/lib/milon/repositories/fakes/fakeWorkoutExecutionRepository";
import * as WorkoutsRepo from "@/lib/milon/repositories/workouts";
import * as ExecutionsRepo from "@/lib/milon/repositories/executions";
import * as WorkoutUtils from "@/lib/milon/workout-utils";
import type {
  Workout,
  WorkoutExecution,
} from "@/lib/milon/types";

const EMAIL = "contrato-07b@hestia.lan";
const PROGRAM_A = "prog-07b-a";
const PROGRAM_B = "prog-07b-b";

const MSG_EXECUCOES =
  "Este treino possui execuções registradas. O histórico é preservado e o treino não pode ser excluído.";
const MSG_ORDEM_TREINOS =
  "A ordem informada não corresponde aos treinos do programa.";

// ---------------------------------------------------------------------------
// Helpers (só observam; nunca reimplementam regra de produção)
// ---------------------------------------------------------------------------

type WorkoutComPosicao = Workout & { position?: number | null };

function treino(
  id: string,
  programId: string,
  name: string,
  createdAt: string,
  position?: number | null,
): Workout {
  return {
    id,
    programId,
    name,
    createdAt,
    created_by: EMAIL,
    ...(position === undefined ? {} : { position }),
  } as unknown as Workout;
}

function posicaoDe(w: Workout): number | null {
  return (w as unknown as Record<string, unknown>).position as number | null;
}

function execucao(
  id: string,
  workoutId: string,
  programId: string,
  startedAt: string,
  finishedAt: string | null,
  createdAt?: string,
): WorkoutExecution {
  return {
    id,
    workoutId,
    programId,
    startedAt,
    finishedAt,
    createdAt: createdAt ?? startedAt,
    created_by: EMAIL,
  };
}

function comoRegistro(v: unknown): Record<string, unknown> {
  return v as unknown as Record<string, unknown>;
}

// Acesso via cast às operações novas do fake de treinos (tsc verde no RED).
function apiTreinos(repo: unknown): {
  reorderWorkouts: (programId: string, ids: string[]) => Promise<void>;
  listWorkoutsByProgram: (programId: string) => Promise<Workout[]>;
  createWorkout: (
    programId: string,
    input: { name: string },
    email: string,
  ) => Promise<Workout>;
  deleteWorkout: (workoutId: string) => Promise<void>;
} {
  const r = comoRegistro(repo);
  expect(typeof r.reorderWorkouts).toBe("function");
  return r as unknown as {
    reorderWorkouts: (programId: string, ids: string[]) => Promise<void>;
    listWorkoutsByProgram: (programId: string) => Promise<Workout[]>;
    createWorkout: (
      programId: string,
      input: { name: string },
      email: string,
    ) => Promise<Workout>;
    deleteWorkout: (workoutId: string) => Promise<void>;
  };
}

// Acesso via cast às consultas novas do fake de execuções (tsc verde no RED).
function apiExecucoes(repo: unknown): {
  findLastSealedExecutionByProgram: (
    programId: string,
  ) => Promise<WorkoutExecution | null>;
  findOpenExecutionByProgram: (
    programId: string,
  ) => Promise<WorkoutExecution | null>;
} {
  const r = comoRegistro(repo);
  expect(typeof r.findLastSealedExecutionByProgram).toBe("function");
  expect(typeof r.findOpenExecutionByProgram).toBe("function");
  return r as unknown as {
    findLastSealedExecutionByProgram: (
      programId: string,
    ) => Promise<WorkoutExecution | null>;
    findOpenExecutionByProgram: (
      programId: string,
    ) => Promise<WorkoutExecution | null>;
  };
}

// ---------------------------------------------------------------------------
// Exports reais (repository modules) — mesma assinatura do contrato textual
// ---------------------------------------------------------------------------

describe("Milon 07b TASK-001 RED — exports dos repositórios reais (plan §3)", () => {
  it("workouts.ts expõe reorderWorkouts + standalone (D2)", () => {
    const m = comoRegistro(WorkoutsRepo);
    expect(typeof m.reorderWorkouts).toBe("function");
    expect(typeof m.reorderWorkoutsStandalone).toBe("function");
  });

  it("executions.ts expõe as duas consultas por programa + standalones (D1/D10)", () => {
    const m = comoRegistro(ExecutionsRepo);
    expect(typeof m.findLastSealedExecutionByProgram).toBe("function");
    expect(typeof m.findLastSealedExecutionByProgramStandalone).toBe(
      "function",
    );
    expect(typeof m.findOpenExecutionByProgram).toBe("function");
    expect(typeof m.findOpenExecutionByProgramStandalone).toBe("function");
  });

  it("workout-utils expõe MSG_TREINO_COM_EXECUCOES com o texto exato (D6)", () => {
    expect(comoRegistro(WorkoutUtils).MSG_TREINO_COM_EXECUCOES).toBe(
      MSG_EXECUCOES,
    );
  });
});

// ---------------------------------------------------------------------------
// IWorkoutRepository: posição, reorder e guarda com execução (D2/D6)
// ---------------------------------------------------------------------------

describe("Milon 07b TASK-001 RED — ordenação por position (D2, plan §3)", () => {
  it("lista ordena por position asc com nulos por último, depois created_at e id", async () => {
    const repo = createFakeWorkoutRepository({
      workouts: [
        treino("w-nulo", PROGRAM_A, "Nulo", "2026-01-01T10:00:00.000Z", null),
        treino("w-2", PROGRAM_A, "B", "2026-03-01T10:00:00.000Z", 2),
        treino("w-1", PROGRAM_A, "A", "2026-05-01T10:00:00.000Z", 1),
      ],
    } as unknown as Parameters<typeof createFakeWorkoutRepository>[0]);

    const ids = (await repo.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id);
    expect(ids).toEqual(["w-1", "w-2", "w-nulo"]);
  });

  it("desempata position igual por created_at e depois id", async () => {
    const empatado = "2026-10-01T10:00:00.000Z";
    const repo = createFakeWorkoutRepository({
      workouts: [
        treino("w-b", PROGRAM_A, "B", empatado, 1),
        treino("w-a", PROGRAM_A, "A", empatado, 1),
      ],
    } as unknown as Parameters<typeof createFakeWorkoutRepository>[0]);

    const ids = (await repo.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id);
    expect(ids).toEqual(["w-a", "w-b"]);
  });
});

describe("Milon 07b TASK-001 RED — createWorkout numerado (D2, plan §3)", () => {
  it("primeiro treino do programa nasce com position 1", async () => {
    const repo = createFakeWorkoutRepository();
    const api = apiTreinos(repo);

    const criado = await api.createWorkout(PROGRAM_A, { name: "A" }, EMAIL);
    expect(posicaoDe(criado)).toBe(1);
  });

  it("próximos nascem em max+1 da ordem vigente", async () => {
    const repo = createFakeWorkoutRepository({
      workouts: [
        treino("w-1", PROGRAM_A, "A", "2026-01-01T10:00:00.000Z", 1),
        treino("w-2", PROGRAM_A, "B", "2026-02-01T10:00:00.000Z", 2),
      ],
    } as unknown as Parameters<typeof createFakeWorkoutRepository>[0]);
    const api = apiTreinos(repo);

    const criado = await api.createWorkout(PROGRAM_A, { name: "C" }, EMAIL);
    expect(posicaoDe(criado)).toBe(3);
  });
});

describe("Milon 07b TASK-001 RED — reorderWorkouts (D2, plan §3)", () => {
  it("persiste positions 1..n na ordem recebida", async () => {
    const repo = createFakeWorkoutRepository({
      workouts: [
        treino("w-1", PROGRAM_A, "A", "2026-01-01T10:00:00.000Z", 1),
        treino("w-2", PROGRAM_A, "B", "2026-02-01T10:00:00.000Z", 2),
        treino("w-3", PROGRAM_A, "C", "2026-03-01T10:00:00.000Z", 3),
      ],
    } as unknown as Parameters<typeof createFakeWorkoutRepository>[0]);
    const api = apiTreinos(repo);

    await api.reorderWorkouts(PROGRAM_A, ["w-3", "w-1", "w-2"]);

    const lista = await repo.listWorkoutsByProgram(PROGRAM_A);
    expect(lista.map((w) => w.id)).toEqual(["w-3", "w-1", "w-2"]);
    expect(lista.map((w) => posicaoDe(w))).toEqual([1, 2, 3]);
  });

  it("rejeita conjunto divergente com a mensagem exata e nada muda", async () => {
    const repo = createFakeWorkoutRepository({
      workouts: [
        treino("w-1", PROGRAM_A, "A", "2026-01-01T10:00:00.000Z", 1),
        treino("w-2", PROGRAM_A, "B", "2026-02-01T10:00:00.000Z", 2),
        treino("w-3", PROGRAM_B, "Outro", "2026-01-15T10:00:00.000Z", 1),
      ],
    } as unknown as Parameters<typeof createFakeWorkoutRepository>[0]);
    const api = apiTreinos(repo);

    // id de OUTRO programa na lista → rejeita.
    await expect(
      api.reorderWorkouts(PROGRAM_A, ["w-2", "w-1", "w-3"]),
    ).rejects.toThrow(MSG_ORDEM_TREINOS);
    // conjunto incompleto → rejeita.
    await expect(api.reorderWorkouts(PROGRAM_A, ["w-1"])).rejects.toThrow(
      MSG_ORDEM_TREINOS,
    );

    expect((await repo.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id)).toEqual([
      "w-1",
      "w-2",
    ]);
    expect((await repo.listWorkoutsByProgram(PROGRAM_B)).map((w) => w.id)).toEqual([
      "w-3",
    ]);
  });
});

describe("Milon 07b TASK-001 RED — deleteWorkout com execução (D6, plan §3)", () => {
  function seedComExecucao() {
    return {
      workouts: [
        treino("w-1", PROGRAM_A, "Com histórico", "2026-10-01T09:00:00.000Z", 1),
        treino("w-2", PROGRAM_A, "Outro", "2026-10-01T09:05:00.000Z", 2),
      ],
      executions: [
        execucao(
          "exec-1",
          "w-1",
          PROGRAM_A,
          "2026-10-12T10:00:00.000Z",
          "2026-10-12T11:00:00.000Z",
        ),
      ],
    } as unknown as Parameters<typeof createFakeWorkoutRepository>[0];
  }

  it("lança MSG_TREINO_COM_EXECUCOES quando há execução selada e NADA remove", async () => {
    const repo = createFakeWorkoutRepository(seedComExecucao());
    const api = apiTreinos(repo);

    await expect(api.deleteWorkout("w-1")).rejects.toThrow(MSG_EXECUCOES);

    expect((await repo.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id)).toEqual([
      "w-1",
      "w-2",
    ]);
  });

  it("lança MSG_TREINO_COM_EXECUCOES quando há execução aberta e NADA remove", async () => {
    const repo = createFakeWorkoutRepository({
      workouts: [
        treino("w-1", PROGRAM_A, "Em execução", "2026-10-01T09:00:00.000Z", 1),
      ],
      executions: [
        execucao("exec-aberta", "w-1", PROGRAM_A, "2026-10-12T10:00:00.000Z", null),
      ],
    } as unknown as Parameters<typeof createFakeWorkoutRepository>[0]);
    const api = apiTreinos(repo);

    await expect(api.deleteWorkout("w-1")).rejects.toThrow(MSG_EXECUCOES);
    expect(await repo.listWorkoutsByProgram(PROGRAM_A)).toHaveLength(1);
  });

  it("treino sem exercícios nem execuções continua removível", async () => {
    const repo = createFakeWorkoutRepository(seedComExecucao());
    const api = apiTreinos(repo);

    await api.deleteWorkout("w-2");

    expect((await repo.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id)).toEqual([
      "w-1",
    ]);
  });
});

// ---------------------------------------------------------------------------
// IWorkoutExecutionRepository: última selada + aberta por programa (D1/D10)
// ---------------------------------------------------------------------------

describe("Milon 07b TASK-001 RED — findLastSealedExecutionByProgram (D1, plan §3)", () => {
  it("devolve null sem selada (só aberta ou vazio)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [
        execucao("exec-aberta", "w-1", PROGRAM_A, "2026-10-12T10:00:00.000Z", null),
      ],
    });
    const api = apiExecucoes(repo);

    await expect(api.findLastSealedExecutionByProgram(PROGRAM_A)).resolves.toBeNull();
  });

  it("devolve a selada mais recente por finished_at (D1: B selado → próximo é C)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [
        execucao("exec-a", "w-a", PROGRAM_A, "2026-10-10T10:00:00.000Z", "2026-10-10T11:00:00.000Z"),
        execucao("exec-b", "w-b", PROGRAM_A, "2026-10-11T10:00:00.000Z", "2026-10-11T11:00:00.000Z"),
      ],
    });
    const api = apiExecucoes(repo);

    const ultima = await api.findLastSealedExecutionByProgram(PROGRAM_A);
    expect(ultima).toMatchObject({ id: "exec-b", workoutId: "w-b" });
  });

  it("desempata finished_at igual por created_at desc e depois id desc", async () => {
    const fim = "2026-10-11T11:00:00.000Z";
    const repo = createFakeWorkoutExecutionRepository({
      executions: [
        execucao("exec-a", "w-a", PROGRAM_A, "2026-10-11T10:00:00.000Z", fim, "2026-10-11T10:00:00.000Z"),
        execucao("exec-b", "w-b", PROGRAM_A, "2026-10-11T10:05:00.000Z", fim, "2026-10-11T10:05:00.000Z"),
      ],
    });
    const api = apiExecucoes(repo);

    const ultima = await api.findLastSealedExecutionByProgram(PROGRAM_A);
    expect(ultima?.id).toBe("exec-b");
  });

  it("ignora programa alheio (D5a: histórico da ficha antiga nunca atravessa)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [
        execucao("exec-b", "w-b", PROGRAM_B, "2026-10-11T10:00:00.000Z", "2026-10-11T11:00:00.000Z"),
      ],
    });
    const api = apiExecucoes(repo);

    await expect(api.findLastSealedExecutionByProgram(PROGRAM_A)).resolves.toBeNull();
    await expect(
      api.findLastSealedExecutionByProgram(PROGRAM_B),
    ).resolves.toMatchObject({ id: "exec-b" });
  });

  it("execução cancelada por exclusão não conta (vale a selada anterior)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [
        execucao("exec-antiga", "w-a", PROGRAM_A, "2026-10-10T10:00:00.000Z", "2026-10-10T11:00:00.000Z"),
        execucao("exec-canc", "w-b", PROGRAM_A, "2026-10-11T10:00:00.000Z", null),
      ],
    });
    const api = apiExecucoes(repo);

    await repo.clearExecution("exec-canc");

    const ultima = await api.findLastSealedExecutionByProgram(PROGRAM_A);
    expect(ultima).toMatchObject({ id: "exec-antiga" });
  });
});

describe("Milon 07b TASK-001 RED — findOpenExecutionByProgram (D10, plan §3)", () => {
  it("devolve null sem aberta (só seladas ou vazio)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [
        execucao("exec-s", "w-1", PROGRAM_A, "2026-10-11T10:00:00.000Z", "2026-10-11T11:00:00.000Z"),
      ],
    });
    const api = apiExecucoes(repo);

    await expect(api.findOpenExecutionByProgram(PROGRAM_A)).resolves.toBeNull();
  });

  it("devolve a aberta do programa (D10: volta ao treino da aberta)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [
        execucao("exec-aberta", "w-b", PROGRAM_A, "2026-10-12T10:00:00.000Z", null),
        execucao("exec-sel", "w-a", PROGRAM_A, "2026-10-11T10:00:00.000Z", "2026-10-11T11:00:00.000Z"),
      ],
    });
    const api = apiExecucoes(repo);

    const aberta = await api.findOpenExecutionByProgram(PROGRAM_A);
    expect(aberta).toMatchObject({ id: "exec-aberta", workoutId: "w-b", finishedAt: null });
  });

  it("ignora aberta de outro programa (separação por dono, spec §3)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [
        execucao("exec-outro", "w-x", PROGRAM_B, "2026-10-12T10:00:00.000Z", null),
      ],
    });
    const api = apiExecucoes(repo);

    await expect(api.findOpenExecutionByProgram(PROGRAM_A)).resolves.toBeNull();
    await expect(api.findOpenExecutionByProgram(PROGRAM_B)).resolves.toMatchObject({
      id: "exec-outro",
    });
  });

  it("múltiplas abertas no programa resolvem para a mais recente por started_at (DABT1)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [
        execucao("exec-antiga", "w-a", PROGRAM_A, "2026-10-12T09:00:00.000Z", null),
        execucao("exec-nova", "w-b", PROGRAM_A, "2026-10-12T10:00:00.000Z", null),
      ],
    });
    const api = apiExecucoes(repo);

    const aberta = await api.findOpenExecutionByProgram(PROGRAM_A);
    expect(aberta?.id).toBe("exec-nova");
  });
});
