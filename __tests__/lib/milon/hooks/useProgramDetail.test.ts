import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProgramDetail } from "@/lib/milon/hooks/useProgramDetail";
import * as hooksIndex from "@/lib/milon/hooks";
import { findProgramByIdStandalone } from "@/lib/milon/db/programs";
import type { Program } from "@/lib/milon/types";

/**
 * Contrato — tasks.json TASK-026 (description + acceptanceCriteria) e
 * plan.md "Aditivo - Patch v4" §3 "Hook useProgramDetail" + §5 "Hook
 * dedicado useProgramDetail em vez de reaproveitar usePrograms" +
 * spec.md Patch v4 (D16, R19):
 *
 * - `useProgramDetail(id: string)` devolve `program: Program | null`,
 *   `loading: boolean`, `error: string | null` e `retry: () => Promise<void>`;
 * - busca via `findProgramByIdStandalone` do barrel `lib/milon/db/programs`
 *   (já exportado por `lib/milon/repositories/programs.ts`);
 * - id desconhecido (standalone resolve nulo) ⇒ `program` nulo **E** `error`
 *   nulo — não-confusão entre "não existe" e "falha de rede" (R19);
 * - falha do fetch ⇒ `error` com a mensagem e `retry` recarregando;
 * - sucesso ⇒ `program` preenchido, `error` nulo;
 * - padrão promise-chain com flag `cancelled`: nenhuma atualização de estado
 *   após unmount;
 * - não lê nem escreve estado de `usePrograms` (hook dedicado, decisão 4).
 *
 * RED (Expected: FAIL): `lib/milon/hooks/useProgramDetail.ts` ainda não
 * existe — será criado na TASK-027, junto com o re-export em
 * `lib/milon/hooks/index.ts`.
 */

// Mock do barrel `db/programs`: cobre o standalone usado por este hook e os
// demais imports do barrel feitos pelos hooks re-exportados pelo index.
vi.mock("@/lib/milon/db/programs", () => ({
  findProgramByIdStandalone: vi.fn(),
  listProgramsStandalone: vi.fn(),
  createProgramStandalone: vi.fn(),
  updateProgramStandalone: vi.fn(),
  deleteProgramStandalone: vi.fn(),
}));

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "prog-1",
    title: "Ficha Verão 2026",
    owner: "ana@hestia.lan",
    status: "rascunho",
    createdAt: "2026-09-29T00:00:00Z",
    created_by: "ana@hestia.lan",
    ...overrides,
  };
}

/** Promise pendente com handle de resolve exposto (estado "carregando"). */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useProgramDetail (TASK-026 — contrato RED do Item C, plan.md Patch v4 §3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre carregando: loading true, program e error nulos até a busca resolver", async () => {
    const pendencia = deferred<Program | null>();
    vi.mocked(findProgramByIdStandalone).mockReturnValue(pendencia.promise);

    const { result } = renderHook(() => useProgramDetail("prog-1"));

    expect(findProgramByIdStandalone).toHaveBeenCalledWith("prog-1");
    expect(result.current.loading).toBe(true);
    expect(result.current.program).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      pendencia.resolve(makeProgram());
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.program).toEqual(makeProgram());
    expect(result.current.error).toBeNull();
  });

  it("sucesso: programa preenchido, loading false e error nulo", async () => {
    const program = makeProgram();
    vi.mocked(findProgramByIdStandalone).mockResolvedValue(program);

    const { result } = renderHook(() => useProgramDetail("prog-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.program).toEqual(program);
    expect(result.current.error).toBeNull();
    expect(findProgramByIdStandalone).toHaveBeenCalledWith("prog-1");
    expect(typeof result.current.retry).toBe("function");
  });

  it("id desconhecido (R19): standalone resolve nulo ⇒ program nulo E error nulo com loading false", async () => {
    // Não-confusão entre "não existe" e "falha de rede": um id desconhecido
    // NÃO vira estado de erro de carga (plan.md §3, spec.md R19).
    vi.mocked(findProgramByIdStandalone).mockResolvedValue(null);

    const { result } = renderHook(() => useProgramDetail("id-desconhecido"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(findProgramByIdStandalone).toHaveBeenCalledWith("id-desconhecido");
    expect(result.current.program).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("falha de repositorio: error com a mensagem e retry que recarrega", async () => {
    vi.mocked(findProgramByIdStandalone).mockRejectedValueOnce(
      new Error("falha de rede"),
    );

    const { result } = renderHook(() => useProgramDetail("prog-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("falha de rede");
    expect(result.current.program).toBeNull();

    // retry recarrega: nova tentativa sucesso limpa o error e preenche o program.
    vi.mocked(findProgramByIdStandalone).mockResolvedValueOnce(makeProgram());

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.program).toEqual(makeProgram());
    expect(findProgramByIdStandalone).toHaveBeenCalledTimes(2);
  });

  it("flag cancelled: unmount antes de a busca resolver não atualiza estado (sem warning/erro)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const pendencia = deferred<Program | null>();
    vi.mocked(findProgramByIdStandalone).mockReturnValue(pendencia.promise);

    const { unmount } = renderHook(() => useProgramDetail("prog-1"));
    expect(findProgramByIdStandalone).toHaveBeenCalledWith("prog-1");

    unmount();

    // A promise tardia assenta após o unmount: a flag `cancelled` deve
    // descartar os handlers antes de qualquer setState (promise-chain do repo).
    await act(async () => {
      pendencia.resolve(makeProgram());
    });

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("lib/milon/hooks/index.ts re-exporta useProgramDetail (caminho oficial — plan.md §2)", () => {
    expect(
      (hooksIndex as unknown as Record<string, unknown>).useProgramDetail,
    ).toBeTypeOf("function");
  });
});
