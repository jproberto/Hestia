import { describe, it, expect } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { ExerciseRow } from "@/lib/milon/types";
import * as dbBarrel from "@/lib/milon/db/exercises";
import * as exerciseRepository from "@/lib/milon/repositories/exercises";
import {
  listExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  EXERCISE_DUPLICATE_MESSAGE,
} from "@/lib/milon/db/exercises";

const EMAIL = "barrel@hestia.lan";

const ROW: ExerciseRow = {
  id: "ex-1",
  name: "Supino reto",
  muscle: "peito",
  video_link: null,
  created_at: "2026-09-12T00:00:00.000Z",
  created_by: EMAIL,
};

// Stub mínimo do IDatabaseClient no estilo de checklist-create.test.ts:
// cada helper cobre só o caminho usado pela operação sob teste.
function stubListDb(rows: ExerciseRow[], orders: string[]): IDatabaseClient {
  const chain = {
    order: (col: string): unknown => {
      orders.push(col);
      return chain;
    },
    then: (onfulfilled: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(onfulfilled),
  };
  return {
    from: () => ({ select: () => chain }),
  } as unknown as IDatabaseClient;
}

function stubCreateDb(
  existing: ExerciseRow[],
  inserted: ExerciseRow,
  recorded: { payload?: Record<string, unknown> },
): IDatabaseClient {
  return {
    from: () => ({
      select: () => ({
        then: (onfulfilled: (value: unknown) => unknown) =>
          Promise.resolve({ data: existing, error: null }).then(onfulfilled),
      }),
      insert: (payload: Record<string, unknown>) => {
        recorded.payload = payload;
        return {
          select: () => ({
            single: () => Promise.resolve({ data: inserted, error: null }),
          }),
        };
      },
    }),
  } as unknown as IDatabaseClient;
}

function stubUpdateDb(
  existing: ExerciseRow[],
  updated: ExerciseRow,
  recorded: { payload?: Record<string, unknown>; eq?: [string, unknown] },
): IDatabaseClient {
  return {
    from: () => ({
      select: () => ({
        then: (onfulfilled: (value: unknown) => unknown) =>
          Promise.resolve({ data: existing, error: null }).then(onfulfilled),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: (col: string, val: unknown) => {
          recorded.payload = payload;
          recorded.eq = [col, val];
          return {
            select: () => ({
              single: () => Promise.resolve({ data: updated, error: null }),
            }),
          };
        },
      }),
    }),
  } as unknown as IDatabaseClient;
}

function stubDeleteDb(recorded: { eq?: [string, unknown] }): IDatabaseClient {
  return {
    from: () => ({
      delete: () => ({
        eq: (col: string, val: unknown) => {
          recorded.eq = [col, val];
          return {
            then: (onfulfilled: (value: unknown) => unknown) =>
              Promise.resolve({ data: null, error: null }).then(onfulfilled),
          };
        },
      }),
    }),
  } as unknown as IDatabaseClient;
}

describe("lib/milon/db/exercises (barrel oficial da UI, TASK-004)", () => {
  it("re-exporta o repository (mesmas referências, sem lógica própria)", () => {
    expect(dbBarrel.listExercises).toBe(exerciseRepository.listExercises);
    expect(dbBarrel.createExercise).toBe(exerciseRepository.createExercise);
    expect(dbBarrel.updateExercise).toBe(exerciseRepository.updateExercise);
    expect(dbBarrel.deleteExercise).toBe(exerciseRepository.deleteExercise);
    expect(dbBarrel.listExercisesStandalone).toBe(exerciseRepository.listExercisesStandalone);
    expect(dbBarrel.createExerciseStandalone).toBe(exerciseRepository.createExerciseStandalone);
    expect(dbBarrel.updateExerciseStandalone).toBe(exerciseRepository.updateExerciseStandalone);
    expect(dbBarrel.deleteExerciseStandalone).toBe(exerciseRepository.deleteExerciseStandalone);
    expect(dbBarrel.EXERCISE_DUPLICATE_MESSAGE).toBe(
      exerciseRepository.EXERCISE_DUPLICATE_MESSAGE,
    );
  });

  it("lista via barrel ordenando por músculo e depois por nome no banco", async () => {
    const orders: string[] = [];
    const listed = await listExercises(stubListDb([ROW], orders));

    expect(orders).toEqual(["muscle", "name"]);
    expect(listed).toEqual([
      {
        id: "ex-1",
        name: "Supino reto",
        muscle: "peito",
        videoLink: null,
        createdAt: "2026-09-12T00:00:00.000Z",
        created_by: EMAIL,
      },
    ]);
  });

  it("cria via barrel com trim e auditoria de criador", async () => {
    const recorded: { payload?: Record<string, unknown> } = {};
    const created = await createExercise(
      stubCreateDb([], ROW, recorded),
      { name: "  Supino reto ", muscle: " peito " },
      EMAIL,
    );

    expect(created.id).toBe("ex-1");
    expect(created.videoLink).toBeNull();
    expect(created.created_by).toBe(EMAIL);
    expect(recorded.payload).toMatchObject({
      name: "Supino reto",
      muscle: "peito",
      video_link: null,
      created_by: EMAIL,
    });
  });

  it("atualiza via barrel pelo id", async () => {
    const updated: ExerciseRow = {
      ...ROW,
      name: "Supino inclinado",
      video_link: "https://example.com/novo",
    };
    const recorded: { payload?: Record<string, unknown>; eq?: [string, unknown] } = {};
    const result = await updateExercise(
      stubUpdateDb([], updated, recorded),
      "ex-1",
      { name: "Supino inclinado", muscle: "peito", videoLink: "https://example.com/novo" },
    );

    expect(result.id).toBe("ex-1");
    expect(result.name).toBe("Supino inclinado");
    expect(result.videoLink).toBe("https://example.com/novo");
    expect(recorded.eq).toEqual(["id", "ex-1"]);
  });

  it("remove via barrel pelo id", async () => {
    const recorded: { eq?: [string, unknown] } = {};
    await expect(deleteExercise(stubDeleteDb(recorded), "ex-1")).resolves.toBeUndefined();
    expect(recorded.eq).toEqual(["id", "ex-1"]);
  });

  it("bloqueia duplicado via barrel com a mensagem fixa do repository", async () => {
    const recorded: { payload?: Record<string, unknown> } = {};
    await expect(
      createExercise(
        stubCreateDb([ROW], ROW, recorded),
        { name: "SUPINO RETO", muscle: "PEITO" },
        EMAIL,
      ),
    ).rejects.toThrow(EXERCISE_DUPLICATE_MESSAGE);
    expect(recorded.payload).toBeUndefined();
  });
});
