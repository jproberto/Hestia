import { describe, it, expect, beforeEach } from "vitest";
import type { IWorkoutExecutionRepository } from "@/lib/milon/repositories/interfaces";
import { createFakeWorkoutExecutionRepository } from "@/lib/milon/repositories/fakes/fakeWorkoutExecutionRepository";
import type {
  WorkoutExecution,
  WorkoutExecutionSeries,
  MarkExecutionSeriesInput,
} from "@/lib/milon/types";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-001 (Mílon #5, replano 2ª volta) — foto congelada.
// Fonte: plan.md §2 (Modify: fake espelha setExecutionSnapshot e a snapshot
// no findOpenExecutionByWorkout) + §3 (contratos WorkoutExecutionSnapshot e
// setExecutionSnapshot) + tasks.json TASK-001 (casos novos de
// setExecutionSnapshot e snapshot — Expected: FAIL porque
// lib/milon/repositories/executions.ts e o fake ainda não implementam).
//
// Estrutura do snapshot (contrato textual do plan.md §3): um campo `entries`
// com a lista de entries do template no momento da foto — cada entry com
// entryId, exerciseId, position, restSeconds, exerciseName, exerciseMuscle,
// exerciseVideoLink, loadUnit e series (seriesId, position, reps,
// durationSeconds, load). A foto é imutável após a primeira marcação.
// ---------------------------------------------------------------------------

// REMOÇÃO da foto (Mílon #5 — RED da remoção): helper de snapshot excluído.
// A foto (coluna JSONB + setExecutionSnapshot + frozenEntries) foi removida da
// spec alinhada (template ao vivo + marcadores; valores reais ficam p/ #7).
// Nenhum teste aqui deve exigir foto — ver blocos "sem foto" abaixo.

// ---------------------------------------------------------------------------
// Contrato RED da TASK-001 (Mílon #5) — consumido pela TASK-002.
// Contrato fakes-only (decisão 57): só o fake em memória é exercitado; o
// repository real é verificado por tsc (mesmas assinaturas) e pelas cadeias
// de query em `db/executions.test.ts`.
//
// Fonte: plan.md §3 (Operações do repository de execuções) + tasks.json
// TASK-001 (contract exigindo no fake as mesmas operações com abertura
// reusando a existente sem trocar o início, cascata da exclusão sobre as
// realizadas e retrato gravado na marcação).
//
// O fake lib/milon/repositories/fakes/fakeWorkoutExecutionRepository.ts ainda
// NÃO existe: este arquivo falha na coleta até Hefesto entregá-lo.
// Seed do fake: `{ executions?, doneSeries? }` (execuções abertas + séries
// realizadas), no padrão de seed controlado das fakes do módulo.
// ---------------------------------------------------------------------------

const EMAIL = "contrato-execucao@hestia.lan";
const WORKOUT_ID = "w-1";
const PROGRAM_ID = "prog-a";

interface ExecutionSeed {
  executions?: WorkoutExecution[];
  doneSeries?: WorkoutExecutionSeries[];
}

function makeExecution(
  id: string,
  workoutId: string,
  startedAt = "2026-10-08T10:00:00.000Z",
): WorkoutExecution {
  return {
    id,
    workoutId,
    programId: PROGRAM_ID,
    startedAt,
    finishedAt: null,
    createdAt: startedAt,
    created_by: EMAIL,
  };
}

function makeMarkInput(
  executionId: string,
  seriesId: string,
  position: number,
  fields: { reps?: number | null; durationSeconds?: number | null; load?: number | null } = {},
): MarkExecutionSeriesInput {
  return {
    executionId,
    entryId: "e-1",
    seriesId,
    position,
    reps: fields.reps ?? null,
    durationSeconds: fields.durationSeconds ?? null,
    load: fields.load ?? null,
  };
}

function defineWorkoutExecutionRepositoryContract(
  label: string,
  build: (seed?: ExecutionSeed) => IWorkoutExecutionRepository,
) {
  describe(`IWorkoutExecutionRepository contract: ${label}`, () => {
    let repo: IWorkoutExecutionRepository;

    beforeEach(() => {
      repo = build();
    });

    describe("findOpenExecutionByWorkout", () => {
      it("devolve null quando não há execução aberta para o treino", async () => {
        await expect(repo.findOpenExecutionByWorkout(WORKOUT_ID)).resolves.toBeNull();
        await expect(repo.findOpenExecutionByWorkout("treino-inexistente")).resolves.toBeNull();
      });

      it("devolve a execução aberta do treino com início preenchido e fim nulo", async () => {
        const seeded = build({ executions: [makeExecution("exec-1", WORKOUT_ID)] });

        const found = await seeded.findOpenExecutionByWorkout(WORKOUT_ID);

        expect(found).toMatchObject({ id: "exec-1", workoutId: WORKOUT_ID, finishedAt: null });
        expect(found?.startedAt).toBe("2026-10-08T10:00:00.000Z");
      });

      it("não mistura execuções de outro treino", async () => {
        const seeded = build({ executions: [makeExecution("exec-1", "w-outro")] });

        await expect(seeded.findOpenExecutionByWorkout(WORKOUT_ID)).resolves.toBeNull();
        await expect(seeded.findOpenExecutionByWorkout("w-outro")).resolves.not.toBeNull();
      });
    });

    describe("startExecution", () => {
      it("abre a execução gravando o início uma vez com fim nulo", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);

        expect(execution.id).toBeDefined();
        expect(execution.workoutId).toBe(WORKOUT_ID);
        expect(execution.programId).toBe(PROGRAM_ID);
        expect(execution.startedAt).toBeDefined();
        expect(execution.finishedAt).toBeNull();
        expect(await repo.findOpenExecutionByWorkout(WORKOUT_ID)).toMatchObject({
          id: execution.id,
        });
      });

      it("abertura idempotente reusa a existente SEM trocar o início", async () => {
        const primeira = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);
        const segunda = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);

        expect(segunda.id).toBe(primeira.id);
        expect(segunda.startedAt).toBe(primeira.startedAt);
      });

      it("treinos diferentes ganham execuções distintas", async () => {
        const uma = await repo.startExecution("w-1", PROGRAM_ID, EMAIL);
        const outra = await repo.startExecution("w-2", PROGRAM_ID, EMAIL);

        expect(outra.id).not.toBe(uma.id);
      });
    });

    describe("clearExecution", () => {
      it("exclui a execução aberta e a busca volta a null (início desaparece)", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);

        await repo.clearExecution(execution.id);

        await expect(repo.findOpenExecutionByWorkout(WORKOUT_ID)).resolves.toBeNull();
      });

      it("exclusão em cascata remove as realizadas da execução", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);
        await repo.markSeriesDone(makeMarkInput(execution.id, "s-1", 1, { reps: 10 }), EMAIL);
        await repo.markSeriesDone(makeMarkInput(execution.id, "s-2", 2, { reps: 12 }), EMAIL);
        expect(await repo.listDoneByExecution(execution.id)).toHaveLength(2);

        await repo.clearExecution(execution.id);

        expect(await repo.listDoneByExecution(execution.id)).toEqual([]);
      });

      it("excluir execução inexistente é idempotente (não lança)", async () => {
        await expect(repo.clearExecution("id-que-nao-existe")).resolves.toBeUndefined();
      });

      it("excluir uma execução não afeta as realizadas de outra execução", async () => {
        const uma = await repo.startExecution("w-1", PROGRAM_ID, EMAIL);
        const outra = await repo.startExecution("w-2", PROGRAM_ID, EMAIL);
        await repo.markSeriesDone(makeMarkInput(uma.id, "s-1", 1, { reps: 10 }), EMAIL);
        await repo.markSeriesDone(makeMarkInput(outra.id, "s-9", 1, { reps: 8 }), EMAIL);

        await repo.clearExecution(uma.id);

        expect(await repo.listDoneByExecution(outra.id)).toHaveLength(1);
      });
    });

    describe("listDoneByExecution", () => {
      it("lista vazia quando nada foi marcado", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);

        await expect(repo.listDoneByExecution(execution.id)).resolves.toEqual([]);
      });

      it("lista as realizadas ordenadas por position asc", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);
        await repo.markSeriesDone(makeMarkInput(execution.id, "s-2", 2, { reps: 12 }), EMAIL);
        await repo.markSeriesDone(makeMarkInput(execution.id, "s-1", 1, { reps: 10 }), EMAIL);

        const listed = await repo.listDoneByExecution(execution.id);

        expect(listed.map((d: { seriesId: string }) => d.seriesId)).toEqual(["s-1", "s-2"]);
        expect(listed.map((d: { position: number }) => d.position)).toEqual([1, 2]);
      });
    });

    describe("markSeriesDone", () => {
      it("grava o retrato dos valores do template na realizada", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);

        const done = await repo.markSeriesDone(
          makeMarkInput(execution.id, "s-1", 1, { reps: 10, durationSeconds: 45, load: 40 }),
          EMAIL,
        );

        expect(done).toMatchObject({
          executionId: execution.id,
          entryId: "e-1",
          seriesId: "s-1",
          position: 1,
          reps: 10,
          durationSeconds: 45,
          load: 40,
        });
        expect(await repo.listDoneByExecution(execution.id)).toHaveLength(1);
      });

      it("toque duplo não duplica (idempotente por execução mais série)", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);

        await repo.markSeriesDone(makeMarkInput(execution.id, "s-1", 1, { reps: 10 }), EMAIL);
        await repo.markSeriesDone(makeMarkInput(execution.id, "s-1", 1, { reps: 10 }), EMAIL);

        expect(await repo.listDoneByExecution(execution.id)).toHaveLength(1);
      });
    });

    describe("unmarkSeries", () => {
      it("remove só a realizada da série informada mantendo as demais", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);
        await repo.markSeriesDone(makeMarkInput(execution.id, "s-1", 1, { reps: 10 }), EMAIL);
        await repo.markSeriesDone(makeMarkInput(execution.id, "s-2", 2, { reps: 12 }), EMAIL);

        await repo.unmarkSeries(execution.id, "s-1");

        expect(
          (await repo.listDoneByExecution(execution.id)).map((d: { seriesId: string }) => d.seriesId),
        ).toEqual(["s-2"]);
      });

      it("desmarcar série ausente é sem operação (não lança, nada muda)", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);
        await repo.markSeriesDone(makeMarkInput(execution.id, "s-1", 1, { reps: 10 }), EMAIL);

        await expect(repo.unmarkSeries(execution.id, "s-inexistente")).resolves.toBeUndefined();

        expect(await repo.listDoneByExecution(execution.id)).toHaveLength(1);
      });
    });

    // -----------------------------------------------------------------------
    // REMOÇÃO da foto (RED da remoção): o repository NÃO expõe foto.
    // Fonte: spec alinhada §3 (template ao vivo + marcadores; bloqueio por
    // treino garante escrita única) + §4 YAGNI (foto/valores reais ficam p/ #7).
    // Expected: FAIL enquanto o fake ainda expõe setExecutionSnapshot/snapshot.
    // Hefesto fará GREEN removendo a foto sem mudar estes testes.
    // -----------------------------------------------------------------------
    describe("sem foto (remoção — RED)", () => {
      it("não expõe setExecutionSnapshot no contrato", () => {
        expect(
          (repo as unknown as Record<string, unknown>).setExecutionSnapshot,
        ).toBeUndefined();
      });

      it("execução aberta não carrega foto: sem campo snapshot", async () => {
        const execution = await repo.startExecution(WORKOUT_ID, PROGRAM_ID, EMAIL);
        expect(execution).toMatchObject({ workoutId: WORKOUT_ID, finishedAt: null });
        expect("snapshot" in execution).toBe(false);
        expect(
          (execution as unknown as Record<string, unknown>).snapshot,
        ).toBeUndefined();

        const found = await repo.findOpenExecutionByWorkout(WORKOUT_ID);
        expect(found).not.toBeNull();
        expect("snapshot" in (found as object)).toBe(false);
      });
    });
  });
}

defineWorkoutExecutionRepositoryContract(
  "fake em memória",
  (seed: ExecutionSeed = {}) => createFakeWorkoutExecutionRepository(seed),
);
