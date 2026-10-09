import { describe, it, expect } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { ExerciseRow } from "@/lib/milon/types";
import * as dbBarrel from "@/lib/milon/db/exercises";
import * as exerciseRepository from "@/lib/milon/repositories/exercises";
import {
  listExercises,
  listExercisesAll,
  createExercise,
  updateExercise,
  deleteExercise,
  setExerciseLoadUnit,
  listExercisesAllStandalone,
  setExerciseLoadUnitStandalone,
  EXERCISE_DUPLICATE_MESSAGE,
} from "@/lib/milon/db/exercises";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-001 (Mílon #3) — consumido pela TASK-002.
// Fonte: plan.md §3 "Repositório de exercícios" + tasks.json TASK-001/002.
//
//   - `listExercises` encadeia `.is("deleted_at", null)` (biblioteca/anti-
//     duplicata/pickers só veem ativos);
//   - `listExercisesAll` NÃO aplica esse filtro (renderização de treino);
//   - `deleteExercise` vira SOFT DELETE: `update({ deleted_at: <ISO> })` em vez
//     de `.delete()` — a linha nunca é removida;
//   - `setExerciseLoadUnit(db, id, unit)` grava só `load_unit`;
//   - standalones `listExercisesAllStandalone()` / `setExerciseLoadUnitStandalone(id, unit)`;
//   - `toDomain` mapeia `load_unit`→`loadUnit` e `deleted_at`→`deletedAt`.
// ---------------------------------------------------------------------------

const EMAIL = "barrel@hestia.lan";

const ROW: ExerciseRow = {
  id: "ex-1",
  name: "Supino reto",
  muscle: "peito",
  video_link: null,
  load_unit: null,
  deleted_at: null,
  created_at: "2026-09-12T00:00:00.000Z",
  created_by: EMAIL,
};

// Stub mínimo do IDatabaseClient no estilo de checklist-create.test.ts:
// cada helper cobre só o caminho usado pela operação sob teste.
// `filters` grava as chamadas `.is(col, val)` para provar o filtro de ativos.
function stubListDb(
  rows: ExerciseRow[],
  orders: string[],
  filters: [string, unknown][] = [],
): IDatabaseClient {
  const chain = {
    is: (col: string, val: unknown): unknown => {
      filters.push([col, val]);
      return chain;
    },
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

// Gravação genérica (soft delete e setExerciseLoadUnit): registra QUAL operação
// foi usada (delete = hard / update = soft), o payload e o `.eq` de amarração.
// `delete()` existe de propósito: o teste proibindo hard delete só é verossímil
// se o stub aceitasse a operação errada e ela fosse registrada.
type WriteRecorded = {
  kind?: string;
  payload?: Record<string, unknown>;
  eq?: [string, unknown];
};

function stubWriteDb(recorded: WriteRecorded): IDatabaseClient {
  const OK = { data: null, error: null };
  const result = {
    ...OK,
    single: () => Promise.resolve(OK),
    then: (onfulfilled: (value: unknown) => unknown) => Promise.resolve(OK).then(onfulfilled),
  };
  return {
    from: () => ({
      delete: () => ({
        eq: (col: string, val: unknown) => {
          recorded.kind = "delete";
          recorded.eq = [col, val];
          return Promise.resolve(OK);
        },
      }),
      update: (payload: Record<string, unknown>) => {
        recorded.kind = "update";
        recorded.payload = payload;
        return {
          eq: (col: string, val: unknown) => {
            recorded.eq = [col, val];
            return { ...result, select: () => result };
          },
        };
      },
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

  it("re-exporta as funções novas do contrato da #3 como funções do barrel", () => {
    // typeof primeiro: sem isso, undefined === undefined passaria falso-verde.
    expect(typeof listExercisesAll).toBe("function");
    expect(typeof setExerciseLoadUnit).toBe("function");
    expect(typeof listExercisesAllStandalone).toBe("function");
    expect(typeof setExerciseLoadUnitStandalone).toBe("function");

    expect(listExercisesAll).toBe(exerciseRepository.listExercisesAll);
    expect(setExerciseLoadUnit).toBe(exerciseRepository.setExerciseLoadUnit);
    expect(listExercisesAllStandalone).toBe(exerciseRepository.listExercisesAllStandalone);
    expect(setExerciseLoadUnitStandalone).toBe(exerciseRepository.setExerciseLoadUnitStandalone);
  });

  it("lista via barrel só ativos (.is deleted_at null) ordenando por músculo e nome", async () => {
    const orders: string[] = [];
    const filters: [string, unknown][] = [];
    const listed = await listExercises(stubListDb([ROW], orders, filters));

    expect(filters).toEqual([["deleted_at", null]]);
    expect(orders).toEqual(["muscle", "name"]);
    expect(listed).toEqual([
      {
        id: "ex-1",
        name: "Supino reto",
        muscle: "peito",
        videoLink: null,
        loadUnit: null,
        mode: null,
        deletedAt: null,
        createdAt: "2026-09-12T00:00:00.000Z",
        created_by: EMAIL,
      },
    ]);
  });

  it("listExercisesAll lista tudo SEM o filtro de deleted_at (contexto de treino)", async () => {
    const orders: string[] = [];
    const filters: [string, unknown][] = [];
    const excluido: ExerciseRow = {
      ...ROW,
      id: "ex-2",
      name: "Agachamento",
      deleted_at: "2026-10-01T12:00:00.000Z",
    };
    const all = await listExercisesAll(stubListDb([ROW, excluido], orders, filters));

    // Nenhuma amarração `.is` — os excluídos continuam visíveis aqui.
    expect(filters).toEqual([]);
    expect(orders).toEqual(["muscle", "name"]);
    expect(all.map((e) => e.id)).toEqual(["ex-1", "ex-2"]);
    expect(all[0]).toMatchObject({ loadUnit: null, deletedAt: null });
    expect(all[1].deletedAt).toBe("2026-10-01T12:00:00.000Z");
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
    expect(created.loadUnit).toBeNull();
    expect(created.deletedAt).toBeNull();
    expect(created.created_by).toBe(EMAIL);
    expect(recorded.payload).toMatchObject({
      name: "Supino reto",
      muscle: "peito",
      video_link: null,
      created_by: EMAIL,
    });
    // createExercise NÃO toca nos campos novos (não ressuscita nem define unidade).
    expect(recorded.payload).not.toHaveProperty("load_unit");
    expect(recorded.payload).not.toHaveProperty("deleted_at");
  });

  it("atualiza via barrel pelo id sem tocar em load_unit/deleted_at", async () => {
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
    // Edição não ressuscita exercício excluído: deleted_at fica intocado.
    expect(recorded.payload).not.toHaveProperty("load_unit");
    expect(recorded.payload).not.toHaveProperty("deleted_at");
  });

  it("remove via barrel grava deleted_at (soft delete) em vez de apagar a linha", async () => {
    const recorded: WriteRecorded = {};
    await expect(deleteExercise(stubWriteDb(recorded), "ex-1")).resolves.toBeUndefined();

    expect(recorded.kind).toBe("update");
    expect(recorded.eq).toEqual(["id", "ex-1"]);
    expect(typeof recorded.payload?.deleted_at).toBe("string");
    expect(recorded.payload?.deleted_at).not.toBeNull();
  });

  it("setExerciseLoadUnit grava só a unidade de carga no exercício", async () => {
    const recorded: WriteRecorded = {};
    await expect(
      setExerciseLoadUnit(stubWriteDb(recorded), "ex-1", "kg"),
    ).resolves.toBeUndefined();

    expect(recorded.kind).toBe("update");
    expect(recorded.eq).toEqual(["id", "ex-1"]);
    expect(recorded.payload).toEqual({ load_unit: "kg" });
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
