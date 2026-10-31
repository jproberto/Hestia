/**
 * Repository REAL de Programas (`lib/milon/repositories/programs.ts`) exercitado
 * contra um `IDatabaseClient` em memória — caminho complementar ao contrato
 * fakes-only de `contract-programs.test.ts` (decisão 57: contratos fakes-only;
 * este arquivo não testa o fake, testa a implementação real com a MESMA porta
 * `IDatabaseClient`, sem tocar em `@supabase/*`).
 *
 * Fonte: spec.md §3 (unicidade do ativo por dono, ciclo de vida, erro
 * amigável) + plan.md §3/§5 (regras de persistência + mensagem amigável) +
 * tasks.json TASK-004/TASK-005 (repository + barrel) e TASK-011 (suíte final).
 *
 * O builder em memória reproduz só a semântica usada pelo repository
 * (select/insert/update/delete + eq/order + single/maybeSingle + thenable) e
 * materializa o índice parcial único `ativo por dono` para documentar a regra
 * que o banco garante em produção.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  IDatabaseClient,
  IQueryBuilder,
  QueryResult,
  SingleQueryResult,
} from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { ProgramRow } from "@/lib/milon/types";
import {
  PROGRAM_ACTIVE_UNICITY_MESSAGE,
  listPrograms,
  findProgramById,
  findActiveProgramByOwner,
  createProgram,
  updateProgram,
  deleteProgram,
  listProgramsStandalone,
  findProgramByIdStandalone,
  findActiveProgramByOwnerStandalone,
  createProgramStandalone,
  updateProgramStandalone,
  deleteProgramStandalone,
} from "@/lib/milon/repositories/programs";

const OWNER_A = "ana@hestia.lan";
const OWNER_B = "bruno@hestia.lan";
const SESSAO = "sessao@hestia.lan";

// ---------------------------------------------------------------------------
// Doublo: store + builder em memória (suficiente para os caminhos do repo)
// ---------------------------------------------------------------------------

type Stage = "select" | "insert" | "update" | "delete" | "single" | "maybeSingle";

interface Fault {
  stage: Stage;
  data?: ProgramRow[] | ProgramRow | null;
  error?: unknown;
}

class MemoryStore {
  rows: ProgramRow[] = [];
  seq = 0;
  fault: Fault | null = null;

  constructor(seed: ProgramRow[] = []) {
    this.rows = seed.map((row) => ({ ...row }));
    this.seq = seed.length;
  }

  takeFault(stage: Stage): Fault | null {
    if (this.fault && this.fault.stage === stage) {
      const fault = this.fault;
      this.fault = null;
      return fault;
    }
    return null;
  }
}

function uniqueViolation(): Error {
  return Object.assign(
    new Error(
      'duplicate key value violates unique constraint "idx_programs_one_active_per_owner"',
    ),
    { code: "23505" },
  );
}

class MemoryQueryBuilder implements IQueryBuilder<ProgramRow> {
  private mode: "select" | "insert" | "update" | "delete" | null = null;
  private filters: [string, unknown][] = [];
  private payload: Record<string, unknown> | null = null;
  private orderSpec: { column: string; ascending: boolean } | null = null;

  constructor(private readonly store: MemoryStore) {}

  select(_columns?: string): IQueryBuilder<ProgramRow> {
    if (this.mode === null) this.mode = "select";
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]): IQueryBuilder<ProgramRow> {
    this.mode = "insert";
    this.payload = Array.isArray(data) ? (data[0] ?? {}) : data;
    return this;
  }

  update(data: Record<string, unknown>): IQueryBuilder<ProgramRow> {
    this.mode = "update";
    this.payload = data;
    return this;
  }

  delete(): IQueryBuilder<ProgramRow> {
    this.mode = "delete";
    return this;
  }

  upsert(
    _data: Record<string, unknown>,
    _options?: { onConflict?: string },
  ): IQueryBuilder<ProgramRow> {
    throw new Error("upsert não é usado pelo repository de programas");
  }

  eq(column: string, value: unknown): IQueryBuilder<ProgramRow> {
    this.filters.push([column, value]);
    return this;
  }

  gte(_column: string, _value: unknown): IQueryBuilder<ProgramRow> {
    throw new Error("gte não é usado pelo repository de programas");
  }

  lte(_column: string, _value: unknown): IQueryBuilder<ProgramRow> {
    throw new Error("lte não é usado pelo repository de programas");
  }

  is(_column: string, _value: null): IQueryBuilder<ProgramRow> {
    throw new Error("is não é usado pelo repository de programas");
  }

  order(column: string, options?: { ascending?: boolean }): IQueryBuilder<ProgramRow> {
    this.orderSpec = { column, ascending: options?.ascending !== false };
    return this;
  }

  private matched(): ProgramRow[] {
    const rows = this.store.rows.filter((row) =>
      this.filters.every(
        ([column, value]) =>
          (row as unknown as Record<string, unknown>)[column] === value,
      ),
    );
    if (this.orderSpec) {
      const { column, ascending } = this.orderSpec;
      rows.sort((a, b) => {
        const left = String((a as unknown as Record<string, unknown>)[column]);
        const right = String((b as unknown as Record<string, unknown>)[column]);
        if (left === right) return 0;
        return ascending ? (left < right ? -1 : 1) : left > right ? -1 : 1;
      });
    }
    return rows;
  }

  /** Índice parcial único de produção: 1 ativo por dono. */
  private violatesActiveUnicity(owner: string, exceptId: string | null): boolean {
    return this.store.rows.some(
      (row) =>
        row.owner === owner &&
        row.status === "ativo" &&
        row.id !== exceptId,
    );
  }

  private perform(): QueryResult<ProgramRow> {
    const fault = this.store.takeFault((this.mode ?? "select") as Stage);
    if (fault) return this.faultResult(fault);
    switch (this.mode) {
      case "select":
        return { data: this.matched(), error: null };
      case "insert": {
        const input = (this.payload ?? {}) as Partial<ProgramRow>;
        const status = input.status ?? "rascunho";
        const row: ProgramRow = {
          id: `mem-${++this.store.seq}`,
          title: String(input.title ?? ""),
          owner: String(input.owner ?? ""),
          status,
          // Datas determinísticas e sempre mais novas que os seeds (2026).
          created_at: new Date(Date.UTC(2030, 0, 1) + this.store.seq * 60000).toISOString(),
          created_by: String(input.created_by ?? ""),
        };
        if (status === "ativo" && this.violatesActiveUnicity(row.owner, null)) {
          return { data: null, error: uniqueViolation() };
        }
        this.store.rows.push(row);
        return { data: [row], error: null };
      }
      case "update": {
        const payload = this.payload ?? {};
        const targets = this.matched();
        if (payload.status === "ativo") {
          const owners = new Set(targets.map((row) => row.owner));
          const conflict = this.store.rows.some(
            (row) =>
              owners.has(row.owner) &&
              row.status === "ativo" &&
              !targets.some((target) => target.id === row.id),
          );
          if (conflict) return { data: null, error: uniqueViolation() };
        }
        targets.forEach((row) => Object.assign(row, payload));
        return { data: targets, error: null };
      }
      case "delete": {
        const alvos = new Set(this.matched().map((row) => row.id));
        this.store.rows = this.store.rows.filter((row) => !alvos.has(row.id));
        return { data: [], error: null };
      }
      default:
        return { data: [], error: null };
    }
  }

  private faultResult(fault: Fault): QueryResult<ProgramRow> {
    return {
      data: (fault.data as unknown as ProgramRow[] | null | undefined) ?? null,
      error: (fault.error as Error | undefined) ?? null,
    };
  }

  async single(): Promise<SingleQueryResult<ProgramRow>> {
    const fault = this.store.takeFault("single");
    if (fault) {
      const { data, error } = this.faultResult(fault);
      return { data: (data as unknown as ProgramRow | null) ?? null, error };
    }
    const { data, error } = this.perform();
    if (error) return { data: null, error: error as Error };
    const rows = data ?? [];
    if (rows.length === 0) {
      return { data: null, error: new Error("No rows returned") };
    }
    return { data: rows[0], error: null };
  }

  async maybeSingle(): Promise<SingleQueryResult<ProgramRow>> {
    const fault = this.store.takeFault("maybeSingle");
    if (fault) {
      const { data, error } = this.faultResult(fault);
      return { data: (data as unknown as ProgramRow | null) ?? null, error };
    }
    const { data, error } = this.perform();
    if (error) return { data: null, error: error as Error };
    const rows = data ?? [];
    return { data: rows.length > 0 ? rows[0] : null, error: null };
  }

  then(
    onfulfilled?: ((value: QueryResult<ProgramRow>) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ): Promise<QueryResult<ProgramRow>> {
    return Promise.resolve(this.perform()).then(
      onfulfilled,
      onrejected,
    ) as Promise<QueryResult<ProgramRow>>;
  }
}

function makeRow(overrides: Partial<ProgramRow> & { id: string }): ProgramRow {
  return {
    title: "Programa",
    owner: OWNER_A,
    status: "rascunho",
    created_at: "2026-01-01T00:00:00.000Z",
    created_by: SESSAO,
    ...overrides,
  };
}

let store: MemoryStore;

function clientFor(
  seed: ProgramRow[] = [],
  email: string | null = SESSAO,
): { db: IDatabaseClient; store: MemoryStore } {
  store = new MemoryStore(seed);
  const db: IDatabaseClient = {
    from: <T>() => new MemoryQueryBuilder(store) as unknown as IQueryBuilder<T>,
    getUserEmail: () => Promise.resolve(email),
  };
  return { db, store };
}

/** Asserção de throw sem depender do tipo do valor lançado. */
async function catchThrown(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (err: unknown) {
    return err;
  }
  return undefined;
}

describe("Mílon #2 — repository real de programas via IDatabaseClient (TASK-004/TASK-005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Standalones usam o client do browser (mock central em __tests__/setup.ts).
    const { db } = clientFor([]);
    vi.mocked(createBrowserDatabaseClient).mockReturnValue(db);
  });

  // -------------------------------------------------------------------------
  // listPrograms / findProgramById / findActiveProgramByOwner
  // -------------------------------------------------------------------------
  it("listPrograms ordena por created_at desc e converte row → domínio", async () => {
    const { db } = clientFor([
      makeRow({ id: "p-1", title: "Antigo", created_at: "2026-01-05T00:00:00.000Z" }),
      makeRow({ id: "p-2", title: "Novo", status: "ativo", created_at: "2026-06-01T00:00:00.000Z" }),
      makeRow({ id: "p-3", title: "Meio", status: "inativo", created_at: "2026-03-10T00:00:00.000Z" }),
    ]);

    const listed = await listPrograms(db);

    expect(listed.map((p) => p.id)).toEqual(["p-2", "p-3", "p-1"]);
    expect(listed[0]).toMatchObject({
      id: "p-2",
      title: "Novo",
      status: "ativo",
      createdAt: "2026-06-01T00:00:00.000Z",
      created_by: SESSAO,
    });
  });

  it("listPrograms: erro do banco é relançado; data null vira lista vazia", async () => {
    const comErro = clientFor([]);
    comErro.store.fault = { stage: "select", error: new Error("rede fora") };
    await expect(listPrograms(comErro.db)).rejects.toThrow("rede fora");

    const semData = clientFor([]);
    semData.store.fault = { stage: "select", data: null, error: null };
    await expect(listPrograms(semData.db)).resolves.toEqual([]);
  });

  it("findProgramById acha por id, devolve null para desconhecido e relança erro", async () => {
    const { db } = clientFor([makeRow({ id: "p-1", title: "Ficha" })]);

    await expect(findProgramById(db, "p-1")).resolves.toMatchObject({
      id: "p-1",
      title: "Ficha",
    });
    await expect(findProgramById(db, "nao-existe")).resolves.toBeNull();

    store.fault = { stage: "maybeSingle", error: new Error("consulta falhou") };
    await expect(findProgramById(db, "p-1")).rejects.toThrow("consulta falhou");
  });

  it("findActiveProgramByOwner devolve o ativo do dono ou null", async () => {
    const { db } = clientFor([
      makeRow({ id: "p-a", owner: OWNER_A, status: "ativo" }),
      makeRow({ id: "p-r", owner: OWNER_B, status: "rascunho" }),
    ]);

    await expect(findActiveProgramByOwner(db, OWNER_A)).resolves.toMatchObject({
      id: "p-a",
      status: "ativo",
    });
    await expect(findActiveProgramByOwner(db, OWNER_B)).resolves.toBeNull();
  });

  // -------------------------------------------------------------------------
  // createProgram
  // -------------------------------------------------------------------------
  it("createProgram nasce 'rascunho', normaliza e audita pela sessão", async () => {
    const { db } = clientFor([]);

    const created = await createProgram(db, {
      title: "   Ficha de verão   ",
      owner: ` ${OWNER_A} `,
    });

    expect(created).toMatchObject({
      title: "Ficha de verão",
      owner: OWNER_A,
      status: "rascunho",
      created_by: SESSAO,
    });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].id).toBe(created.id);
  });

  it("createProgram sem sessão usa o dono como created_by", async () => {
    const { db } = clientFor([], null);

    const created = await createProgram(db, { title: "Sem sessão", owner: OWNER_B });

    expect(created.created_by).toBe(OWNER_B);
  });

  it("createProgram 'ativo' desativa o anterior do mesmo dono (outro dono intacto)", async () => {
    const { db } = clientFor([
      makeRow({ id: "a-ativo", owner: OWNER_A, status: "ativo" }),
      makeRow({ id: "b-ativo", owner: OWNER_B, status: "ativo" }),
      makeRow({ id: "a-inativo", owner: OWNER_A, status: "inativo" }),
    ]);

    const created = await createProgram(db, {
      title: "Novo ativo",
      owner: OWNER_A,
      status: "ativo",
    });

    expect(created.status).toBe("ativo");
    const statusOf = (id: string) => store.rows.find((r) => r.id === id)?.status;
    expect(statusOf("a-ativo")).toBe("inativo"); // anterior do MESMO dono
    expect(statusOf("a-inativo")).toBe("inativo"); // não-ativo intacto
    expect(statusOf("b-ativo")).toBe("ativo"); // outro dono intacto
    expect(statusOf(created.id)).toBe("ativo");
  });

  it("createProgram: violação do índice único vira a mensagem amigável", async () => {
    const { db } = clientFor([]);
    store.fault = { stage: "single", error: uniqueViolation() };

    await expect(
      createProgram(db, { title: "Corrida", owner: OWNER_A, status: "ativo" }),
    ).rejects.toThrow(PROGRAM_ACTIVE_UNICITY_MESSAGE);
  });

  it.each([
    ["código 23505 sem mensagem", Object.assign(new Error("boom"), { code: "23505" })],
    ["mensagem com 'unique constraint'", new Error("viola unique constraint qualquer")],
    ["mensagem com 'duplicate key'", new Error("duplicate key value")],
    [
      "details com o nome do índice",
      Object.assign(new Error(""), {
        details: "idx_programs_one_active_per_owner",
      }),
    ],
  ])("createProgram: erro único (%s) vira mensagem amigável", async (_label, erro) => {
    const { db } = clientFor([]);
    store.fault = { stage: "single", error: erro };

    await expect(
      createProgram(db, { title: "Corrida", owner: OWNER_A, status: "ativo" }),
    ).rejects.toThrow(PROGRAM_ACTIVE_UNICITY_MESSAGE);
  });

  it("createProgram: erro que não é de unicidade é relançado como está", async () => {
    const { db } = clientFor([]);
    store.fault = { stage: "single", error: new Error("permission denied") };

    await expect(createProgram(db, { title: "X", owner: OWNER_A })).rejects.toThrow(
      "permission denied",
    );
  });

  it("createProgram: erro sem formato de objeto também é relançado", async () => {
    const { db } = clientFor([]);
    store.fault = { stage: "single", error: "falha crua do driver" };

    const thrown = await catchThrown(() =>
      createProgram(db, { title: "X", owner: OWNER_A }),
    );
    expect(thrown).toBe("falha crua do driver");
  });

  it("createProgram: retorno sem linha e sem erro vira erro claro", async () => {
    const { db } = clientFor([]);
    store.fault = { stage: "single", data: null, error: null };

    await expect(createProgram(db, { title: "X", owner: OWNER_A })).rejects.toThrow(
      "Falha ao criar programa: sem retorno do banco.",
    );
  });

  // -------------------------------------------------------------------------
  // updateProgram
  // -------------------------------------------------------------------------
  it("updateProgram de título normaliza e manda só o título no payload", async () => {
    const { db } = clientFor([makeRow({ id: "p-1", title: "Antigo" })]);

    const updated = await updateProgram(db, "p-1", { title: "   Novo título  " });

    expect(updated.title).toBe("Novo título");
    expect(updated.status).toBe("rascunho");
    expect(store.rows[0].title).toBe("Novo título");
  });

  it("updateProgram para 'inativo' não executa o passo de desativação", async () => {
    const { db } = clientFor([
      makeRow({ id: "p-1", status: "ativo" }),
      makeRow({ id: "p-2", status: "rascunho", created_at: "2026-02-01T00:00:00.000Z" }),
    ]);

    const updated = await updateProgram(db, "p-1", { status: "inativo" });

    expect(updated.status).toBe("inativo");
    // Ninguém além do alvo mudou.
    expect(store.rows.find((r) => r.id === "p-2")?.status).toBe("rascunho");
  });

  it("updateProgram para 'ativo' desativa o anterior do mesmo dono antes de gravar", async () => {
    const { db } = clientFor([
      makeRow({ id: "a-ativo", owner: OWNER_A, status: "ativo" }),
      makeRow({ id: "a-rascunho", owner: OWNER_A, status: "rascunho" }),
      makeRow({ id: "b-ativo", owner: OWNER_B, status: "ativo" }),
    ]);

    const updated = await updateProgram(db, "a-rascunho", { status: "ativo" });

    expect(updated.status).toBe("ativo");
    const statusOf = (id: string) => store.rows.find((r) => r.id === id)?.status;
    expect(statusOf("a-ativo")).toBe("inativo");
    expect(statusOf("b-ativo")).toBe("ativo");
    expect(statusOf("a-rascunho")).toBe("ativo");
  });

  it("updateProgram para 'ativo' com id inexistente falha com mensagem clara", async () => {
    const { db } = clientFor([]);

    await expect(updateProgram(db, "sumiu", { status: "ativo" })).rejects.toThrow(
      "Programa não encontrado.",
    );
  });

  it("updateProgram: violação do índice único vira a mensagem amigável", async () => {
    const { db } = clientFor([makeRow({ id: "p-1" })]);
    store.fault = { stage: "single", error: uniqueViolation() };

    await expect(
      updateProgram(db, "p-1", { title: "Novo", status: "ativo" }),
    ).rejects.toThrow(PROGRAM_ACTIVE_UNICITY_MESSAGE);
  });

  it("updateProgram: erro não-único é relançado como está", async () => {
    const { db } = clientFor([makeRow({ id: "p-1" })]);
    store.fault = { stage: "single", error: new Error("timeout do banco") };

    await expect(updateProgram(db, "p-1", { title: "Novo" })).rejects.toThrow(
      "timeout do banco",
    );
  });

  it("updateProgram: retorno sem linha e sem erro vira erro claro", async () => {
    const { db } = clientFor([makeRow({ id: "p-1" })]);
    store.fault = { stage: "single", data: null, error: null };

    await expect(updateProgram(db, "p-1", { title: "Novo" })).rejects.toThrow(
      "Falha ao atualizar programa: sem retorno do banco.",
    );
  });

  // -------------------------------------------------------------------------
  // deleteProgram
  // -------------------------------------------------------------------------
  it("deleteProgram remove o registro e propaga erro do banco", async () => {
    const { db } = clientFor([makeRow({ id: "p-1" }), makeRow({ id: "p-2" })]);

    await expect(deleteProgram(db, "p-1")).resolves.toBeUndefined();
    expect(store.rows.map((r) => r.id)).toEqual(["p-2"]);

    store.fault = { stage: "delete", error: new Error("sem permissão") };
    await expect(deleteProgram(db, "p-2")).rejects.toThrow("sem permissão");
    expect(store.rows.map((r) => r.id)).toEqual(["p-2"]);
  });

  // -------------------------------------------------------------------------
  // Standalones (hooks consomem estes; criam o próprio client)
  // -------------------------------------------------------------------------
  it("standalones operam pelo client do browser (singleton por aba)", async () => {
    const { db, store: shared } = clientFor([
      makeRow({ id: "p-ativo", owner: OWNER_A, status: "ativo" }),
      makeRow({
        id: "p-rascunho",
        owner: OWNER_A,
        status: "rascunho",
        created_at: "2026-02-01T00:00:00.000Z",
      }),
    ]);
    vi.mocked(createBrowserDatabaseClient).mockReturnValue(db);

    await expect(listProgramsStandalone()).resolves.toHaveLength(2);
    await expect(findProgramByIdStandalone("p-ativo")).resolves.toMatchObject({
      status: "ativo",
    });
    await expect(findActiveProgramByOwnerStandalone(OWNER_A)).resolves.toMatchObject({
      id: "p-ativo",
    });

    const criado = await createProgramStandalone({
      title: "Criado standalone",
      owner: OWNER_B,
    });
    expect(criado.status).toBe("rascunho");

    const atualizado = await updateProgramStandalone("p-rascunho", {
      title: "Editado standalone",
    });
    expect(atualizado.title).toBe("Editado standalone");

    await expect(deleteProgramStandalone(criado.id)).resolves.toBeUndefined();
    expect(shared.rows.map((r) => r.id).sort()).toEqual(["p-ativo", "p-rascunho"]);
    expect(shared.rows.find((r) => r.id === "p-rascunho")?.title).toBe(
      "Editado standalone",
    );
  });
});
