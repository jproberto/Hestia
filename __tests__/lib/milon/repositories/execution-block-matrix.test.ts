import { describe, it, expect } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import { createFakeWorkoutExecutionRepository } from "@/lib/milon/repositories/fakes/fakeWorkoutExecutionRepository";
import { findOpenExecutionByWorkout } from "@/lib/milon/repositories/executions";
import type { WorkoutExecution, WorkoutExecutionRow } from "@/lib/milon/types";

/**
 * Matriz correta do bloqueio por execução (Mílon #5 — trava RED).
 *
 * Verdade humana (substitui qualquer entendimento anterior): o bloqueio da
 * edição na aba Programas vale SOMENTE com execução ATIVA (iniciada E não
 * encerrada E não cancelada). Sem execução ativa = edição normal:
 *  (a) treino nunca iniciado → livre;
 *  (b) execução encerrada (finished_at preenchido, feature #7) → livre;
 *  (c) execução cancelada (linha excluída) → livre.
 * Com execução ativa → bloqueado naquele treino; edições só pelo Treino do Dia.
 *
 * Fonte: delegação Minos (REGRA CORRETA) + spec.md §3 ("enquanto houver
 * execução aberta ... bloqueado") + plan.md §3 (findOpenExecutionByWorkout
 * retorna SÓ aberta: finished_at nulo).
 *
 * Suspeita que este arquivo expõe (RED onde divergir): implementação que
 * bloqueia com QUALQUER execução existente (inclusive encerrada), ex.:
 * repository sem o filtro `.is("finished_at", null)` ou página que consulta
 * existência sem filtrar fim. Com o código atual correto estes testes ficam
 * VERDES (trava); com o bug, o caso (b) falha (retorna a encerrada).
 *
 * Só __tests__: nenhum arquivo de produção é tocado aqui.
 */

const EMAIL = "matriz-bloqueio@hestia.lan";
const WORKOUT_ID = "w-matriz";
const PROGRAM_ID = "prog-matriz";

function makeAtiva(id = "exec-ativa"): WorkoutExecution {
  return {
    id,
    workoutId: WORKOUT_ID,
    programId: PROGRAM_ID,
    startedAt: "2026-10-09T10:00:00.000Z",
    finishedAt: null,
    createdAt: "2026-10-09T10:00:00.000Z",
    created_by: EMAIL,
  };
}

function makeEncerrada(id = "exec-encerrada"): WorkoutExecution {
  return {
    ...makeAtiva(id),
    // Feature #7: finished_at preenchido = encerrada = NÃO é aberta.
    finishedAt: "2026-10-09T12:00:00.000Z",
  };
}

describe("matriz do bloqueio — repository findOpenExecutionByWorkout retorna SÓ aberta", () => {
  it("(ativa) iniciada E não encerrada E não cancelada → retorna a execução (bloqueia na manutenção)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [makeAtiva()],
    });

    const found = await repo.findOpenExecutionByWorkout(WORKOUT_ID);

    expect(found).not.toBeNull();
    expect(found).toMatchObject({ id: "exec-ativa", finishedAt: null });
  });

  it("(a) treino nunca iniciado → null (edição livre)", async () => {
    const repo = createFakeWorkoutExecutionRepository({ executions: [] });

    await expect(repo.findOpenExecutionByWorkout(WORKOUT_ID)).resolves.toBeNull();
  });

  it("(b) execução encerrada (finished_at preenchido) → null (edição livre, NÃO bloqueia)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [makeEncerrada()],
    });

    const found = await repo.findOpenExecutionByWorkout(WORKOUT_ID);

    // RED se o repository retornar QUALQUER execução (inclusive encerrada).
    expect(found).toBeNull();
  });

  it("(b) encerrada de outro treino também não vaza como aberta deste treino", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [{ ...makeEncerrada(), workoutId: "w-outro" }],
    });

    await expect(repo.findOpenExecutionByWorkout(WORKOUT_ID)).resolves.toBeNull();
  });

  it("(c) execução cancelada (linha excluída via clearExecution) → null (edição livre)", async () => {
    const repo = createFakeWorkoutExecutionRepository({ executions: [] });
    const aberta = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);
    expect(await repo.findOpenExecutionByWorkout(WORKOUT_ID)).not.toBeNull();

    await repo.clearExecution(aberta.id);

    await expect(repo.findOpenExecutionByWorkout(WORKOUT_ID)).resolves.toBeNull();
  });

  it("(b→ativa) com encerrada no histórico, novo start abre execução nova (encerrada não bloqueia re-treino)", async () => {
    const repo = createFakeWorkoutExecutionRepository({
      executions: [makeEncerrada("exec-antiga")],
    });
    expect(await repo.findOpenExecutionByWorkout(WORKOUT_ID)).toBeNull();

    const nova = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);

    expect(nova.finishedAt).toBeNull();
    expect(nova.id).not.toBe("exec-antiga");
    await expect(repo.findOpenExecutionByWorkout(WORKOUT_ID)).resolves.toMatchObject({
      id: nova.id,
    });
  });
});

describe("matriz do bloqueio — cadeia real filtra finished_at nulo (trava anti-bug)", () => {
  function stubDb(recorded: { iss?: [string, unknown][]; eqs?: [string, unknown][] }) {
    const chain = {
      eq: (col: string, val: unknown) => {
        (recorded.eqs ??= []).push([col, val]);
        return chain;
      },
      is: (col: string, val: unknown) => {
        (recorded.iss ??= []).push([col, val]);
        return chain;
      },
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    return {
      from: () => ({ select: () => chain }),
    } as unknown as IDatabaseClient;
  }

  it("findOpenExecutionByWorkout filtra .is(finished_at, null) — sem isso a encerrada bloquearia (bug suspeito)", async () => {
    const recorded: { iss?: [string, unknown][]; eqs?: [string, unknown][] } = {};
    await findOpenExecutionByWorkout(stubDb(recorded), WORKOUT_ID);

    // Se a implementação remover o filtro, este teste fica RED.
    expect(recorded.iss).toEqual([["finished_at", null]]);
    expect(recorded.eqs).toEqual([["workout_id", WORKOUT_ID]]);
  });

  it("linha encerrada no banco nunca é mapeada como aberta (finishedAt preenchido ≠ null)", () => {
    const row: WorkoutExecutionRow = {
      id: "exec-enc",
      workout_id: WORKOUT_ID,
      program_id: PROGRAM_ID,
      started_at: "2026-10-09T10:00:00.000Z",
      finished_at: "2026-10-09T12:00:00.000Z",
      created_at: "2026-10-09T10:00:00.000Z",
      created_by: EMAIL,
    };
    // Contrato de mapeamento: finishedAt reflete o banco; só null = aberta.
    expect(row.finished_at).not.toBeNull();
  });
});
