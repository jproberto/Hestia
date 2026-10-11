import { describe, it, expect } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import type {
  WorkoutExecutionRow,
  WorkoutExecutionSeriesRow,
  MarkExecutionSeriesInput,
} from "@/lib/milon/types";
import * as dbBarrel from "@/lib/milon/db/executions";
import * as executionRepository from "@/lib/milon/repositories/executions";
import {
  findOpenExecutionByWorkout,
  startExecution,
  clearExecution,
  listDoneByExecution,
  markSeriesDone,
  unmarkSeries,
  findOpenExecutionByWorkoutStandalone,
  startExecutionStandalone,
  clearExecutionStandalone,
  listDoneByExecutionStandalone,
  markSeriesDoneStandalone,
  unmarkSeriesStandalone,
} from "@/lib/milon/db/executions";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-001 (Mílon #5) — consumido pela TASK-002.
// Fonte: plan.md §3 (Operações do repository de execuções) + tasks.json
// TASK-001 (db/executions.test.ts exigindo localizar aberta, abrir
// idempotente, excluir, listar realizadas, marcar idempotente e desmarcar
// com os standalones).
//
// O barrel lib/milon/db/executions.ts ainda NÃO existe: este arquivo falha
// na coleta até Hefesto entregá-lo (Expected FAIL por módulo inexistente).
// Cadeias esperadas (só métodos de IDatabaseClient — ver lib/shared/database.ts):
//   - findOpen: from("workout_executions").select("*").eq("workout_id").
//     is("finished_at", null).maybeSingle() — aberta = fim nulo;
//   - start: sem aberta cria via insert({ workout_id, program_id, created_by}).
//     select().single() SEM escrever finished_at; com aberta devolve a
//     existente SEM inserir (início preservado);
//   - clear: delete() from("workout_executions").eq("id") (cascata no banco);
//   - listDone: from("workout_execution_series").select("*").
//     eq("execution_id").order("position", asc);
//   - mark: insert({ execution_id, entry_id, series_id, position, reps,
//     duration_seconds, load, created_by }).select().single() — retrato do
//     template, idempotente por unicidade (execução + série);
//   - unmark: delete() from("workout_execution_series").eq("execution_id").
//     eq("series_id") — sem operação quando ausente o delete afeta 0 linhas.
// O fim (finished_at) nunca é escrito por nenhuma operação desta feature.
// ---------------------------------------------------------------------------

const EMAIL = "barrel-execucao@hestia.lan";
const WORKOUT_ID = "w-1";
const PROGRAM_ID = "prog-a";
const EXECUTION_ID = "exec-1";

const OPEN_ROW: WorkoutExecutionRow = {
  id: EXECUTION_ID,
  workout_id: WORKOUT_ID,
  program_id: PROGRAM_ID,
  started_at: "2026-10-08T10:00:00.000Z",
  finished_at: null,
  created_at: "2026-10-08T10:00:00.000Z",
  created_by: EMAIL,
};

const DONE_ROW: WorkoutExecutionSeriesRow = {
  id: "done-1",
  execution_id: EXECUTION_ID,
  entry_id: "e-1",
  series_id: "s-1",
  position: 1,
  value: 10,
  load: 40,
  created_at: "2026-10-08T10:01:00.000Z",
  created_by: EMAIL,
};

const MARK_INPUT: MarkExecutionSeriesInput = {
  executionId: EXECUTION_ID,
  entryId: "e-1",
  seriesId: "s-1",
  position: 1,
  value: 10,
  load: 40,
};

type Recorded = {
  table?: string;
  eqs?: [string, unknown][];
  iss?: [string, unknown][];
  orders?: [string, unknown][];
  insertPayload?: Record<string, unknown>;
  insertedCalled?: boolean;
  ops?: { table: string; op: string; payload?: Record<string, unknown>; eq?: [string, unknown] }[];
};

// Localizar aberta: select + eq workout_id + is finished_at null + maybeSingle.
function stubFindDb(openRow: WorkoutExecutionRow | null, recorded: Recorded): IDatabaseClient {
  const chain = {
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return chain;
    },
    is: (col: string, val: unknown): unknown => {
      (recorded.iss ??= []).push([col, val]);
      return chain;
    },
    order: (col: string, opts?: { ascending?: boolean }): unknown => {
      (recorded.orders ??= []).push([col, opts?.ascending]);
      return chain;
    },
    maybeSingle: () => Promise.resolve({ data: openRow, error: null }),
  };
  return {
    from: (table: string) => {
      recorded.table = table;
      return { select: () => chain };
    },
  } as unknown as IDatabaseClient;
}

// Abrir com aberta existente: select devolve a aberta; insert NUNCA é chamado.
function stubStartWithOpenDb(openRow: WorkoutExecutionRow, recorded: Recorded): IDatabaseClient {
  const chain = {
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return chain;
    },
    is: (col: string, val: unknown): unknown => {
      (recorded.iss ??= []).push([col, val]);
      return chain;
    },
    maybeSingle: () => Promise.resolve({ data: openRow, error: null }),
  };
  return {
    from: (table: string) => {
      recorded.table = table;
      return {
        select: () => chain,
        insert: (payload: Record<string, unknown>) => {
          recorded.insertedCalled = true;
          recorded.insertPayload = payload;
          return {
            select: () => ({
              single: () => Promise.resolve({ data: openRow, error: null }),
            }),
          };
        },
      };
    },
  } as unknown as IDatabaseClient;
}

// Abrir sem aberta: select devolve null; insert cria a nova execução.
function stubStartWithoutOpenDb(inserted: WorkoutExecutionRow, recorded: Recorded): IDatabaseClient {
  const chain = {
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return chain;
    },
    is: (col: string, val: unknown): unknown => {
      (recorded.iss ??= []).push([col, val]);
      return chain;
    },
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  return {
    from: (table: string) => {
      recorded.table = table;
      return {
        select: () => chain,
        insert: (payload: Record<string, unknown>) => {
          recorded.insertedCalled = true;
          recorded.insertPayload = payload;
          return {
            select: () => ({
              single: () => Promise.resolve({ data: inserted, error: null }),
            }),
          };
        },
      };
    },
  } as unknown as IDatabaseClient;
}

// Excluir / desmarcar: delete + eq encadeado.
function stubDeleteDb(recorded: Recorded): IDatabaseClient {
  const OK = { data: null, error: null };
  const makeEqChain = (table: string) => {
    const chain = {
      eq: (col: string, val: unknown) => {
        (recorded.ops ??= []).push({ table, op: "delete", eq: [col, val] });
        return {
          eq: (col2: string, val2: unknown) => {
            (recorded.ops ??= []).push({ table, op: "delete", eq: [col2, val2] });
            return Promise.resolve(OK);
          },
          then: (onfulfilled: (value: unknown) => unknown) =>
            Promise.resolve(OK).then(onfulfilled),
        };
      },
    };
    return chain;
  };
  return {
    from: (table: string) => ({
      delete: () => makeEqChain(table),
    }),
  } as unknown as IDatabaseClient;
}

// Listar realizadas: select + eq execution_id + order position asc.
function stubListDoneDb(rows: WorkoutExecutionSeriesRow[], recorded: Recorded): IDatabaseClient {
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

// Marcar: insert do retrato + select single.
function stubMarkDb(inserted: WorkoutExecutionSeriesRow, recorded: Recorded): IDatabaseClient {
  return {
    from: (table: string) => {
      recorded.table = table;
      return {
        insert: (payload: Record<string, unknown>) => {
          recorded.insertPayload = payload;
          return {
            select: () => ({
              single: () => Promise.resolve({ data: inserted, error: null }),
            }),
          };
        },
      };
    },
  } as unknown as IDatabaseClient;
}

describe("lib/milon/db/executions (barrel oficial da UI, TASK-002)", () => {
  it("re-exporta o repository (mesmas referências, sem lógica própria)", () => {
    expect(dbBarrel.findOpenExecutionByWorkout).toBe(
      executionRepository.findOpenExecutionByWorkout,
    );
    expect(dbBarrel.startExecution).toBe(executionRepository.startExecution);
    expect(dbBarrel.clearExecution).toBe(executionRepository.clearExecution);
    expect(dbBarrel.listDoneByExecution).toBe(executionRepository.listDoneByExecution);
    expect(dbBarrel.markSeriesDone).toBe(executionRepository.markSeriesDone);
    expect(dbBarrel.unmarkSeries).toBe(executionRepository.unmarkSeries);
  });

  it("expõe os standalones como funções do barrel", () => {
    expect(typeof findOpenExecutionByWorkoutStandalone).toBe("function");
    expect(typeof startExecutionStandalone).toBe("function");
    expect(typeof clearExecutionStandalone).toBe("function");
    expect(typeof listDoneByExecutionStandalone).toBe("function");
    expect(typeof markSeriesDoneStandalone).toBe("function");
    expect(typeof unmarkSeriesStandalone).toBe("function");

    expect(findOpenExecutionByWorkoutStandalone).toBe(
      executionRepository.findOpenExecutionByWorkoutStandalone,
    );
    expect(startExecutionStandalone).toBe(executionRepository.startExecutionStandalone);
    expect(clearExecutionStandalone).toBe(executionRepository.clearExecutionStandalone);
    expect(listDoneByExecutionStandalone).toBe(
      executionRepository.listDoneByExecutionStandalone,
    );
    expect(markSeriesDoneStandalone).toBe(executionRepository.markSeriesDoneStandalone);
    expect(unmarkSeriesStandalone).toBe(executionRepository.unmarkSeriesStandalone);
  });

  it("localiza a execução aberta do treino (fim nulo) mapeando para o domínio", async () => {
    const recorded: Recorded = {};
    const found = await findOpenExecutionByWorkout(stubFindDb(OPEN_ROW, recorded), WORKOUT_ID);

    expect(recorded.table).toBe("workout_executions");
    expect(recorded.eqs).toEqual([["workout_id", WORKOUT_ID]]);
    expect(recorded.iss).toEqual([["finished_at", null]]);
    expect(found).toEqual({
      id: EXECUTION_ID,
      workoutId: WORKOUT_ID,
      programId: PROGRAM_ID,
      startedAt: "2026-10-08T10:00:00.000Z",
      finishedAt: null,
      createdAt: "2026-10-08T10:00:00.000Z",
      created_by: EMAIL,
    });
  });

  it("localizar aberta devolve null quando não há execução aberta", async () => {
    const recorded: Recorded = {};
    await expect(
      findOpenExecutionByWorkout(stubFindDb(null, recorded), WORKOUT_ID),
    ).resolves.toBeNull();
    expect(recorded.table).toBe("workout_executions");
  });

  it("abrir com execução aberta existente devolve a existente SEM inserir (início preservado)", async () => {
    const recorded: Recorded = {};
    const execution = await startExecution(
      stubStartWithOpenDb(OPEN_ROW, recorded),
      WORKOUT_ID,
      PROGRAM_ID,
      EMAIL,
    );

    expect(execution.id).toBe(EXECUTION_ID);
    expect(execution.startedAt).toBe("2026-10-08T10:00:00.000Z");
    expect(recorded.insertedCalled ?? false).toBe(false);
  });

  it("abrir sem execução cria a nova com início gravado e fim nulo (fim nunca escrito)", async () => {
    const recorded: Recorded = {};
    const execution = await startExecution(
      stubStartWithoutOpenDb(OPEN_ROW, recorded),
      WORKOUT_ID,
      PROGRAM_ID,
      EMAIL,
    );

    expect(recorded.insertedCalled).toBe(true);
    expect(recorded.insertPayload).toMatchObject({
      workout_id: WORKOUT_ID,
      program_id: PROGRAM_ID,
      created_by: EMAIL,
    });
    // O fim é reservado à feature 7: nenhuma escrita desta feature o preenche.
    expect(recorded.insertPayload).not.toHaveProperty("finished_at");
    expect(execution.finishedAt).toBeNull();
    expect(execution.startedAt).toBe("2026-10-08T10:00:00.000Z");
  });

  it("excluir remove a execução por id (cascata no banco leva as realizadas)", async () => {
    const recorded: Recorded = {};
    await expect(
      clearExecution(stubDeleteDb(recorded), EXECUTION_ID),
    ).resolves.toBeUndefined();

    expect(recorded.ops).toEqual([{ table: "workout_executions", op: "delete", eq: ["id", EXECUTION_ID] }]);
  });

  it("lista as realizadas da execução ordenadas por position asc", async () => {
    const recorded: Recorded = {};
    const listed = await listDoneByExecution(stubListDoneDb([DONE_ROW], recorded), EXECUTION_ID);

    expect(recorded.table).toBe("workout_execution_series");
    expect(recorded.eqs).toEqual([["execution_id", EXECUTION_ID]]);
    expect(recorded.orders).toEqual([["position", true]]);
    expect(listed).toEqual([
      {
        id: "done-1",
        executionId: EXECUTION_ID,
        entryId: "e-1",
        seriesId: "s-1",
        position: 1,
        value: 10,
        load: 40,
        createdAt: "2026-10-08T10:01:00.000Z",
        created_by: EMAIL,
      },
    ]);
  });

  it("marcar grava a realizada com retrato dos valores do template", async () => {
    const recorded: Recorded = {};
    const done = await markSeriesDone(stubMarkDb(DONE_ROW, recorded), MARK_INPUT, EMAIL);

    expect(recorded.table).toBe("workout_execution_series");
    expect(recorded.insertPayload).toMatchObject({
      execution_id: EXECUTION_ID,
      entry_id: "e-1",
      series_id: "s-1",
      position: 1,
      value: 10,
      load: 40,
      created_by: EMAIL,
    });
    expect(done.seriesId).toBe("s-1");
    expect(done.position).toBe(1);
  });

  it("desmarcar remove a realizada por execução mais série do template", async () => {
    const recorded: Recorded = {};
    await expect(
      unmarkSeries(stubDeleteDb(recorded), EXECUTION_ID, "s-1"),
    ).resolves.toBeUndefined();

    expect(recorded.ops).toEqual([
      { table: "workout_execution_series", op: "delete", eq: ["execution_id", EXECUTION_ID] },
      { table: "workout_execution_series", op: "delete", eq: ["series_id", "s-1"] },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Contrato RED da TASK-013 (Mílon #5, Aditamento 2026-10-10 "valor único") —
// consumido pela TASK-014.
// Fonte: tasks.json TASK-013 + plan.md Aditamento 2026-10-10 §3 (entrada de
// marcação com valor único; retrato com `value`) + spec §3.
// Expected: FAIL (repository atual grava reps/duration_seconds e ignora
// `value`).
// Convenção: `value` via cast na entrada — o tipo ainda não tem o campo
// (RED inclui os tipos); em runtime o objeto o carrega.
// ---------------------------------------------------------------------------

describe("lib/milon/db/executions valor único (TASK-013 RED — D34)", () => {
  it("marcar grava a realizada com valor único (sem reps/duration_seconds)", async () => {
    const recorded: Recorded = {};
    const input = {
      executionId: EXECUTION_ID,
      entryId: "e-1",
      seriesId: "s-1",
      position: 1,
      value: 10,
      load: 40,
    } as unknown as MarkExecutionSeriesInput;

    const done = await markSeriesDone(stubMarkDb(DONE_ROW, recorded), input, EMAIL);

    expect(recorded.insertPayload).toMatchObject({
      execution_id: EXECUTION_ID,
      entry_id: "e-1",
      series_id: "s-1",
      position: 1,
      value: 10,
      load: 40,
      created_by: EMAIL,
    });
    expect((done as unknown as Record<string, unknown>).value).toBe(10);
  });
});
