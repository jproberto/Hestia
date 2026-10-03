import { describe, it, expect } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import type {
  WorkoutRow,
  WorkoutEntryRow,
  WorkoutSeriesRow,
} from "@/lib/milon/types";
import * as dbBarrel from "@/lib/milon/db/workouts";
import * as workoutRepository from "@/lib/milon/repositories/workouts";
import {
  listWorkoutsByProgram,
  listEntriesByWorkout,
  listEntriesByProgram,
  listSeriesByEntry,
  deleteWorkout,
  removeEntry,
  reorderEntries,
  setEntryRestSeconds,
} from "@/lib/milon/db/workouts";
import { MSG_TREINO_COM_EXERCICIOS } from "@/lib/milon/workout-utils";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-005 (Mílon #3) — consumido pela TASK-006.
// Fonte: plan.md §3 (IWorkoutRepository + barrel `export *` sobre
// `repositories/workouts`, mesmo padrão de db/exercises.ts) + tasks.json
// TASK-005(description item b).
//
// Cadeias cobertas (IQueryBuilder só tem select/insert/update/delete/eq/order/
// is/single/maybeSingle — ver lib/shared/database.ts):
//   - listagem de treinos: `.eq("program_id")` + `.order("created_at", asc)`
//     + `.order("id", asc)` (desempate determinístico);
//   - entradas: `.eq("workout_id")` / `.eq("program_id")`, ordem `position` asc;
//   - séries: `.eq("entry_id")`, ordem `position` asc;
//   - removeEntry: DELETE das séries `.eq("entry_id")` primeiro e depois
//     DELETE da entrada `.eq("id")` (dois passos explícitos, plan.md §3);
//   - deleteWorkout: lê as entradas e só então apaga `.eq("id")`;
//   - reorderEntries: UPDATE `{ position: 1..n }` `.eq("id", ...)` na ordem
//     recebida; conjunto diferente do treino → rejeita sem gravar;
//   - setEntryRestSeconds: UPDATE `{ rest_seconds }` `.eq("id", ...)`.
// ---------------------------------------------------------------------------

const EMAIL = "barrel@hestia.lan";
const PROGRAM_A = "prog-a";

const WORKOUT_ROW: WorkoutRow = {
  id: "w-1",
  program_id: PROGRAM_A,
  name: "Push",
  created_at: "2026-10-01T09:00:00.000Z",
  created_by: EMAIL,
};

const ENTRY_ROW: WorkoutEntryRow = {
  id: "e-1",
  workout_id: "w-1",
  program_id: PROGRAM_A,
  exercise_id: "ex-1",
  position: 1,
  rest_seconds: null,
  created_at: "2026-10-01T09:00:00.000Z",
  created_by: EMAIL,
};

const SERIES_ROW: WorkoutSeriesRow = {
  id: "s-1",
  entry_id: "e-1",
  position: 1,
  reps: 10,
  duration_seconds: null,
  load: 40,
  created_at: "2026-10-01T09:00:00.000Z",
  created_by: EMAIL,
};

type Recorded = {
  table?: string;
  eqs?: [string, unknown][];
  orders?: [string, unknown][];
  ops?: {
    table: string;
    op: string;
    payload?: Record<string, unknown>;
    eq?: [string, unknown];
  }[];
};

// ---------------------------------------------------------------------------
// Stubs mínimos do IDatabaseClient no estilo de exercises.test.ts: cada helper
// cobre só o caminho usado pela operação sob teste e registra as chamadas que
// o teste afirma (tabela, `.eq`, `.order`, UPDATE/DELETE + payload).
// ---------------------------------------------------------------------------

function stubListDb(
  rows: WorkoutRow[] | WorkoutEntryRow[] | WorkoutSeriesRow[],
  recorded: Recorded,
): IDatabaseClient {
  const chain = {
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return chain;
    },
    order: (col: string, opts?: { ascending?: boolean }): unknown => {
      (recorded.orders ??= []).push([col, opts?.ascending]);
      return chain;
    },
    then: (onfulfilled: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(onfulfilled),
  };
  return {
    from: (table: string) => {
      recorded.table = table;
      return { select: () => chain };
    },
  } as unknown as IDatabaseClient;
}

// Leitura (select) + gravação (delete) — usado por deleteWorkout e removeEntry.
function stubReadWriteDb(
  rows: WorkoutEntryRow[] | WorkoutSeriesRow[],
  recorded: Recorded,
): IDatabaseClient {
  const OK = { data: null, error: null };
  const readChain = {
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return readChain;
    },
    order: (col: string, opts?: { ascending?: boolean }): unknown => {
      (recorded.orders ??= []).push([col, opts?.ascending]);
      return readChain;
    },
    then: (onfulfilled: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(onfulfilled),
  };
  return {
    from: (table: string) => ({
      select: () => readChain,
      delete: () => ({
        eq: (col: string, val: unknown) => {
          (recorded.ops ??= []).push({ table, op: "delete", eq: [col, val] });
          return {
            then: (onfulfilled: (value: unknown) => unknown) =>
              Promise.resolve(OK).then(onfulfilled),
          };
        },
      }),
    }),
  } as unknown as IDatabaseClient;
}

// Leitura (select das entradas do treino) + UPDATE por linha — reorderEntries.
function stubUpdateDb(
  rows: WorkoutEntryRow[],
  recorded: Recorded,
): IDatabaseClient {
  const OK = { data: null, error: null };
  const readChain = {
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return readChain;
    },
    order: (col: string, opts?: { ascending?: boolean }): unknown => {
      (recorded.orders ??= []).push([col, opts?.ascending]);
      return readChain;
    },
    then: (onfulfilled: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(onfulfilled),
  };
  return {
    from: (table: string) => {
      recorded.table = table;
      return {
        select: () => readChain,
        update: (payload: Record<string, unknown>) => ({
          eq: (col: string, val: unknown) => {
            (recorded.ops ??= []).push({ table, op: "update", payload, eq: [col, val] });
            return {
              then: (onfulfilled: (value: unknown) => unknown) =>
                Promise.resolve(OK).then(onfulfilled),
            };
          },
        }),
      };
    },
  } as unknown as IDatabaseClient;
}

// Gravação simples (setEntryRestSeconds): UPDATE payload + `.eq("id")`.
function stubWriteDb(recorded: Recorded): IDatabaseClient {
  const OK = { data: null, error: null };
  return {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => ({
        eq: (col: string, val: unknown) => {
          (recorded.ops ??= []).push({ table, op: "update", payload, eq: [col, val] });
          return {
            then: (onfulfilled: (value: unknown) => unknown) =>
              Promise.resolve(OK).then(onfulfilled),
          };
        },
      }),
    }),
  } as unknown as IDatabaseClient;
}

describe("lib/milon/db/workouts (barrel oficial da UI, TASK-006)", () => {
  it("re-exporta o repository (mesmas referências, sem lógica própria)", () => {
    expect(dbBarrel.listWorkoutsByProgram).toBe(workoutRepository.listWorkoutsByProgram);
    expect(dbBarrel.findWorkoutById).toBe(workoutRepository.findWorkoutById);
    expect(dbBarrel.createWorkout).toBe(workoutRepository.createWorkout);
    expect(dbBarrel.updateWorkoutName).toBe(workoutRepository.updateWorkoutName);
    expect(dbBarrel.deleteWorkout).toBe(workoutRepository.deleteWorkout);
    expect(dbBarrel.hasWorkouts).toBe(workoutRepository.hasWorkouts);
    expect(dbBarrel.hasWorkoutWithExercise).toBe(workoutRepository.hasWorkoutWithExercise);
    expect(dbBarrel.listEntriesByWorkout).toBe(workoutRepository.listEntriesByWorkout);
    expect(dbBarrel.listEntriesByProgram).toBe(workoutRepository.listEntriesByProgram);
    expect(dbBarrel.addEntry).toBe(workoutRepository.addEntry);
    expect(dbBarrel.removeEntry).toBe(workoutRepository.removeEntry);
    expect(dbBarrel.reorderEntries).toBe(workoutRepository.reorderEntries);
    expect(dbBarrel.setEntryRestSeconds).toBe(workoutRepository.setEntryRestSeconds);
    expect(dbBarrel.listSeriesByEntry).toBe(workoutRepository.listSeriesByEntry);
    expect(dbBarrel.setSeriesQuantity).toBe(workoutRepository.setSeriesQuantity);
    expect(dbBarrel.updateSeriesFields).toBe(workoutRepository.updateSeriesFields);
    expect(dbBarrel.applySeriesToAll).toBe(workoutRepository.applySeriesToAll);
  });

  it("lista treinos do Programa ordenando por created_at asc com id como desempate", async () => {
    const recorded: Recorded = {};
    const listed = await listWorkoutsByProgram(stubListDb([WORKOUT_ROW], recorded), PROGRAM_A);

    expect(recorded.table).toBe("workouts");
    expect(recorded.eqs).toEqual([["program_id", PROGRAM_A]]);
    expect(recorded.orders).toEqual([
      ["created_at", true],
      ["id", true],
    ]);
    expect(listed).toEqual([
      {
        id: "w-1",
        programId: PROGRAM_A,
        name: "Push",
        createdAt: "2026-10-01T09:00:00.000Z",
        created_by: EMAIL,
      },
    ]);
  });

  it("lista entradas do treino com filtro eq workout_id e ordem position asc", async () => {
    const recorded: Recorded = {};
    const listed = await listEntriesByWorkout(stubListDb([ENTRY_ROW], recorded), "w-1");

    expect(recorded.table).toBe("workout_entries");
    expect(recorded.eqs).toEqual([["workout_id", "w-1"]]);
    expect(recorded.orders).toEqual([["position", true]]);
    expect(listed).toEqual([
      {
        id: "e-1",
        workoutId: "w-1",
        programId: PROGRAM_A,
        exerciseId: "ex-1",
        position: 1,
        restSeconds: null,
        createdAt: "2026-10-01T09:00:00.000Z",
        created_by: EMAIL,
      },
    ]);
  });

  it("lista entradas do Programa com filtro eq program_id (base do D14)", async () => {
    const recorded: Recorded = {};
    const listed = await listEntriesByProgram(stubListDb([ENTRY_ROW], recorded), PROGRAM_A);

    expect(recorded.table).toBe("workout_entries");
    expect(recorded.eqs).toEqual([["program_id", PROGRAM_A]]);
    expect(listed.map((e) => e.id)).toEqual(["e-1"]);
  });

  it("lista séries da entrada com filtro eq entry_id e ordem position asc", async () => {
    const recorded: Recorded = {};
    const listed = await listSeriesByEntry(stubListDb([SERIES_ROW], recorded), "e-1");

    expect(recorded.table).toBe("workout_series");
    expect(recorded.eqs).toEqual([["entry_id", "e-1"]]);
    expect(recorded.orders).toEqual([["position", true]]);
    expect(listed).toEqual([
      {
        id: "s-1",
        entryId: "e-1",
        position: 1,
        reps: 10,
        durationSeconds: null,
        load: 40,
        createdAt: "2026-10-01T09:00:00.000Z",
        created_by: EMAIL,
      },
    ]);
  });

  it("deleteWorkout com entradas lança MSG_TREINO_COM_EXERCICIOS e NÃO apaga o treino", async () => {
    const recorded: Recorded = {};
    await expect(
      deleteWorkout(stubReadWriteDb([ENTRY_ROW], recorded), "w-1"),
    ).rejects.toThrow(MSG_TREINO_COM_EXERCICIOS);

    expect(recorded.eqs).toEqual([["workout_id", "w-1"]]);
    // Nenhum DELETE chega a ser emitido.
    expect(recorded.ops ?? []).toEqual([]);
  });

  it("deleteWorkout sem entradas apaga o treino por eq id", async () => {
    const recorded: Recorded = {};
    await expect(deleteWorkout(stubReadWriteDb([], recorded), "w-1")).resolves.toBeUndefined();

    expect(recorded.ops).toEqual([
      { table: "workouts", op: "delete", eq: ["id", "w-1"] },
    ]);
  });

  it("removeEntry apaga as séries por entry_id primeiro e depois a entrada por id", async () => {
    const recorded: Recorded = {};
    await expect(
      removeEntry(stubReadWriteDb([SERIES_ROW], recorded), "e-1"),
    ).resolves.toBeUndefined();

    // Dois passos explícitos, nessa ordem (plan.md §3).
    expect(recorded.ops).toEqual([
      { table: "workout_series", op: "delete", eq: ["entry_id", "e-1"] },
      { table: "workout_entries", op: "delete", eq: ["id", "e-1"] },
    ]);
  });

  it("reorderEntries grava positions 1..n na ordem recebida (UPDATE por id)", async () => {
    const recorded: Recorded = {};
    const rows: WorkoutEntryRow[] = [
      { ...ENTRY_ROW, id: "e-1", position: 1 },
      { ...ENTRY_ROW, id: "e-2", position: 2 },
      { ...ENTRY_ROW, id: "e-3", position: 3 },
    ];

    await reorderEntries(stubUpdateDb(rows, recorded), "w-1", ["e-3", "e-1", "e-2"]);

    expect(recorded.table).toBe("workout_entries");
    expect(recorded.eqs).toEqual([["workout_id", "w-1"]]);
    expect(recorded.ops).toEqual([
      { table: "workout_entries", op: "update", payload: { position: 1 }, eq: ["id", "e-3"] },
      { table: "workout_entries", op: "update", payload: { position: 2 }, eq: ["id", "e-1"] },
      { table: "workout_entries", op: "update", payload: { position: 3 }, eq: ["id", "e-2"] },
    ]);
  });

  it.each([
    ["id de outro treino na lista", ["e-1", "e-2", "e-4"]],
    ["conjunto incompleto", ["e-1"]],
    ["id desconhecido no lugar de um existente", ["e-1", "e-9"]],
  ])(
    "reorderEntries rejeita %s e não grava nenhuma posição",
    async (_label, orderedIds) => {
      const recorded: Recorded = {};
      const rows: WorkoutEntryRow[] = [
        { ...ENTRY_ROW, id: "e-1", position: 1 },
        { ...ENTRY_ROW, id: "e-2", position: 2 },
      ];

      await expect(
        reorderEntries(stubUpdateDb(rows, recorded), "w-1", orderedIds),
      ).rejects.toThrow();

      expect(recorded.ops ?? []).toEqual([]);
    },
  );

  it.each([
    ["com valor numérico", 90, 90],
    ["com null", null, null],
  ])("setEntryRestSeconds grava rest_seconds %s", async (_label, seconds, esperado) => {
    const recorded: Recorded = {};
    await expect(
      setEntryRestSeconds(stubWriteDb(recorded), "e-1", seconds),
    ).resolves.toBeUndefined();

    expect(recorded.ops).toEqual([
      {
        table: "workout_entries",
        op: "update",
        payload: { rest_seconds: esperado },
        eq: ["id", "e-1"],
      },
    ]);
  });
});
