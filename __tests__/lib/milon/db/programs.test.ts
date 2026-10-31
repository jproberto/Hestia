import { describe, it, expect } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { ProgramRow } from "@/lib/milon/types";
import * as dbBarrel from "@/lib/milon/db/programs";
import * as programRepository from "@/lib/milon/repositories/programs";
import {
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  findActiveProgramByOwner,
} from "@/lib/milon/db/programs";

// Barrel oficial da UI (plan.md §2: `export * from '../repositories/programs'`).
// Derivado de tasks.json TASK-005:acceptanceCriteria — "verifica que as funções
// do repository (listAll, create, update, delete, findActiveByOwner) são
// exportadas pelo barrel". Os nomes do critério são da interface
// IProgramRepository; o barrel re-exporta os exports do módulo repository
// (listPrograms/createProgram/updateProgram/deleteProgram/
// findActiveProgramByOwner) — mesma capacidade, mesmo re-export vivo.
const EMAIL = "barrel@hestia.lan";
const OWNER_A = "ana@hestia.lan";

const ROW: ProgramRow = {
  id: "p-1",
  title: "Ficha de verão",
  owner: OWNER_A,
  status: "rascunho",
  created_at: "2026-09-12T00:00:00.000Z",
  created_by: EMAIL,
};

// Stubs mínimos no estilo de exercises.test.ts: cada um cobre apenas o
// caminho usado pela operação sob teste.
function stubListDb(rows: ProgramRow[], orders: [string, unknown][]): IDatabaseClient {
  const chain = {
    order: (col: string, opts?: { ascending?: boolean }): unknown => {
      orders.push([col, opts?.ascending]);
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
  inserted: ProgramRow,
  recorded: { payload?: Record<string, unknown> },
): IDatabaseClient {
  return {
    getUserEmail: () => Promise.resolve(EMAIL),
    from: () => ({
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
  updated: ProgramRow,
  recorded: { payload?: Record<string, unknown>; eq?: [string, unknown] },
): IDatabaseClient {
  return {
    from: () => ({
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

function stubFindActiveDb(
  data: ProgramRow | null,
  recorded: { eqs?: [string, unknown][] },
): IDatabaseClient {
  const chain = {
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return chain;
    },
    maybeSingle: () => Promise.resolve({ data, error: null }),
  };
  return {
    from: () => ({ select: () => chain }),
  } as unknown as IDatabaseClient;
}

describe("lib/milon/db/programs (barrel oficial da UI, TASK-005)", () => {
  it("re-exporta o repository (mesmas referências, sem lógica própria)", () => {
    // Capacidade listAll do critério → export listPrograms.
    expect(dbBarrel.listPrograms).toBe(programRepository.listPrograms);
    // Capacidade create do critério → export createProgram.
    expect(dbBarrel.createProgram).toBe(programRepository.createProgram);
    // Capacidade update do critério → export updateProgram.
    expect(dbBarrel.updateProgram).toBe(programRepository.updateProgram);
    // Capacidade delete do critério → export deleteProgram.
    expect(dbBarrel.deleteProgram).toBe(programRepository.deleteProgram);
    // Capacidade findActiveByOwner do critério → export findActiveProgramByOwner.
    expect(dbBarrel.findActiveProgramByOwner).toBe(
      programRepository.findActiveProgramByOwner,
    );
    expect(dbBarrel.findProgramById).toBe(programRepository.findProgramById);
    expect(dbBarrel.listProgramsStandalone).toBe(
      programRepository.listProgramsStandalone,
    );
    expect(dbBarrel.createProgramStandalone).toBe(
      programRepository.createProgramStandalone,
    );
    expect(dbBarrel.updateProgramStandalone).toBe(
      programRepository.updateProgramStandalone,
    );
    expect(dbBarrel.deleteProgramStandalone).toBe(
      programRepository.deleteProgramStandalone,
    );
    expect(dbBarrel.findActiveProgramByOwnerStandalone).toBe(
      programRepository.findActiveProgramByOwnerStandalone,
    );
    expect(dbBarrel.PROGRAM_ACTIVE_UNICITY_MESSAGE).toBe(
      programRepository.PROGRAM_ACTIVE_UNICITY_MESSAGE,
    );
  });

  it("lista via barrel ordenando por created_at desc no banco", async () => {
    const orders: [string, unknown][] = [];
    const listed = await listPrograms(stubListDb([ROW], orders));

    expect(orders).toEqual([["created_at", false]]);
    expect(listed).toEqual([
      {
        id: "p-1",
        title: "Ficha de verão",
        owner: OWNER_A,
        status: "rascunho",
        createdAt: "2026-09-12T00:00:00.000Z",
        created_by: EMAIL,
      },
    ]);
  });

  it("cria via barrel com default 'rascunho', trim e auditoria de criador", async () => {
    const recorded: { payload?: Record<string, unknown> } = {};
    const created = await createProgram(stubCreateDb(ROW, recorded), {
      title: "  Ficha de verão ",
      owner: ` ${OWNER_A} `,
    });

    expect(created.id).toBe("p-1");
    expect(created.status).toBe("rascunho");
    expect(recorded.payload).toMatchObject({
      title: "Ficha de verão",
      owner: OWNER_A,
      status: "rascunho",
      created_by: EMAIL,
    });
  });

  it("atualiza via barrel pelo id", async () => {
    const updatedRow: ProgramRow = { ...ROW, title: "Título corrigido" };
    const recorded: { payload?: Record<string, unknown>; eq?: [string, unknown] } = {};
    const result = await updateProgram(stubUpdateDb(updatedRow, recorded), "p-1", {
      title: "  Título corrigido ",
    });

    expect(result.id).toBe("p-1");
    expect(result.title).toBe("Título corrigido");
    expect(recorded.eq).toEqual(["id", "p-1"]);
    expect(recorded.payload).toEqual({ title: "Título corrigido" });
  });

  it("remove via barrel pelo id", async () => {
    const recorded: { eq?: [string, unknown] } = {};
    await expect(deleteProgram(stubDeleteDb(recorded), "p-1")).resolves.toBeUndefined();
    expect(recorded.eq).toEqual(["id", "p-1"]);
  });

  it("busca o ativo do dono via barrel (owner + status 'ativo')", async () => {
    const activeRow: ProgramRow = { ...ROW, status: "ativo" };
    const recorded: { eqs?: [string, unknown][] } = {};
    const found = await findActiveProgramByOwner(stubFindActiveDb(activeRow, recorded), OWNER_A);

    expect(recorded.eqs).toEqual([
      ["owner", OWNER_A],
      ["status", "ativo"],
    ]);
    expect(found).toMatchObject({
      id: "p-1",
      owner: OWNER_A,
      status: "ativo",
      createdAt: "2026-09-12T00:00:00.000Z",
    });

    // Dono sem ativo → null.
    const recordedEmpty: { eqs?: [string, unknown][] } = {};
    await expect(
      findActiveProgramByOwner(stubFindActiveDb(null, recordedEmpty), OWNER_A),
    ).resolves.toBeNull();
  });
});
