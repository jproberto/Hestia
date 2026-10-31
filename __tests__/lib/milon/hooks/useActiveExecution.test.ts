// Contrato RED — Mílon 07c Troca com execução ativa (TASK-003).
// Fonte: `.agents/modules/milon/07c-troca-execucao-ativa/spec.md` R1 (máx 1
// aberta por dono, global) + `plan.md` §3 (plan.md:69 — hook novo
// useActiveExecution com seis campos: execução ativa, id do treino ativo,
// carregando, mensagem, origem carga em falha, retry; sem e-mail → nulo sem
// erro) + `tasks.json` TASK-003 (acceptanceCriteria 1).
// Estado vigente citado (verdade para o RED):
// - `lib/milon/hooks/` NÃO contém `useActiveExecution.ts` (grep por
//   `useActiveExecution` em lib/ retorna 0 fora de repositories/fakes — só
//   existe `findOpenExecutionByOwner[Standalone]` em repositories, TASK-002).
// - Standalone consumida: `findOpenExecutionByOwnerStandalone` existe em
//   `lib/milon/repositories/executions.ts:301-305` (re-exportada pelo barrel
//   `lib/milon/db/executions.ts`).
// Escrito ANTES da implementação (outside-in). Expected: FAIL — módulo
// `@/lib/milon/hooks/useActiveExecution` inexistente (erro de resolução do
// import, motivo certo, nunca sintaxe). Hefesto fará GREEN na TASK-004 sem
// mudar estes testes.
// Convenção de nomes fixada aqui (plan.md:69 descreve os seis campos sem
// citar identificadores — Minos fixa, Hefesto implementa literalmente):
// `{ activeExecution, activeWorkoutId, loading, errorMsg, errorOrigin, retry }`
// — `loading/errorMsg/errorOrigin/retry` espelham o padrão dos hooks do módulo
// (`useWorkoutExecution.ts`, `useWorkoutDetail.ts`, `usePrograms.ts`).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useActiveExecution } from "@/lib/milon/hooks/useActiveExecution";
import { findOpenExecutionByOwnerStandalone } from "@/lib/milon/db/executions";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { WorkoutExecution } from "@/lib/milon/types";

// Barrel `db/executions` mockado no padrão dos testes de hook do projeto: o
// factory cobre TODOS os exports do barrel real (forma com `db` +
// standalones), para o import do hook não quebrar.
vi.mock("@/lib/milon/db/executions", () => ({
  findOpenExecutionByWorkout: vi.fn(),
  findOpenExecutionByOwner: vi.fn(),
  findLastSealedExecutionByProgram: vi.fn(),
  findOpenExecutionByProgram: vi.fn(),
  startExecution: vi.fn(),
  finishExecution: vi.fn(),
  clearExecution: vi.fn(),
  listDoneByExecution: vi.fn(),
  markSeriesDone: vi.fn(),
  unmarkSeries: vi.fn(),
  findOpenExecutionByWorkoutStandalone: vi.fn(),
  findOpenExecutionByOwnerStandalone: vi.fn(),
  startExecutionStandalone: vi.fn(),
  finishExecutionStandalone: vi.fn(),
  clearExecutionStandalone: vi.fn(),
  findLastSealedExecutionByProgramStandalone: vi.fn(),
  findOpenExecutionByProgramStandalone: vi.fn(),
  listDoneByExecutionStandalone: vi.fn(),
  markSeriesDoneStandalone: vi.fn(),
  unmarkSeriesStandalone: vi.fn(),
}));

// E-mail da sessão = mock global de `__tests__/setup.ts` ("teste@hestia.com").
const EMAIL = "teste@hestia.com";

function makeExecution(overrides: Partial<WorkoutExecution> = {}): WorkoutExecution {
  return {
    id: "exec-1",
    workoutId: "w-ativo",
    programId: "p-1",
    startedAt: "2026-10-14T10:00:00.000Z",
    finishedAt: null,
    createdAt: "2026-10-14T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

describe("Milon 07c TASK-003 RED — useActiveExecution (fonte única da aberta por dono, plan §3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findOpenExecutionByOwnerStandalone).mockReset();
  });

  it("expõe os seis campos do contrato (activeExecution/activeWorkoutId/loading/errorMsg/errorOrigin/retry)", async () => {
    vi.mocked(findOpenExecutionByOwnerStandalone).mockResolvedValue(null);

    const { result } = renderHook(() => useActiveExecution());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeExecution).toBeNull();
    expect(result.current.activeWorkoutId).toBeNull();
    expect(result.current.errorMsg).toBeNull();
    expect(result.current.errorOrigin).toBeNull();
    expect(typeof result.current.retry).toBe("function");
  });

  it("com execução aberta do dono, publica a execução e o id do treino ativo", async () => {
    const aberta = makeExecution({ id: "exec-a", workoutId: "w-a" });
    vi.mocked(findOpenExecutionByOwnerStandalone).mockResolvedValue(aberta);

    const { result } = renderHook(() => useActiveExecution());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeExecution).toMatchObject({ id: "exec-a", workoutId: "w-a" });
    expect(result.current.activeWorkoutId).toBe("w-a");
    expect(result.current.errorMsg).toBeNull();
    expect(result.current.errorOrigin).toBeNull();
    expect(findOpenExecutionByOwnerStandalone).toHaveBeenCalledWith(EMAIL);
  });

  it("sem e-mail de sessão, publica nulo sem erro (sem leitura)", async () => {
    vi.mocked(createBrowserDatabaseClient).mockReturnValueOnce({
      from: () => {
        throw new Error("use mocked db barrels in tests");
      },
      getUserEmail: () => Promise.resolve(null),
    } as unknown as ReturnType<typeof createBrowserDatabaseClient>);

    const { result } = renderHook(() => useActiveExecution());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeExecution).toBeNull();
    expect(result.current.activeWorkoutId).toBeNull();
    expect(result.current.errorMsg).toBeNull();
    expect(result.current.errorOrigin).toBeNull();
    expect(findOpenExecutionByOwnerStandalone).not.toHaveBeenCalled();
  });

  it("falha de leitura alimenta origem carga (AsyncState com retry, sem reimplementar texto)", async () => {
    vi.mocked(findOpenExecutionByOwnerStandalone).mockRejectedValue(
      new Error("falha de rede na leitura"),
    );

    const { result } = renderHook(() => useActiveExecution());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeExecution).toBeNull();
    expect(result.current.errorMsg).toContain("falha de rede na leitura");
    expect(result.current.errorOrigin).toBe("carga");
  });

  it("retry refaz a carga após falha (origem volta a nulo em sucesso)", async () => {
    vi.mocked(findOpenExecutionByOwnerStandalone)
      .mockRejectedValueOnce(new Error("falha de rede na leitura"))
      .mockResolvedValue(makeExecution({ id: "exec-a", workoutId: "w-a" }));

    const { result } = renderHook(() => useActiveExecution());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.errorOrigin).toBe("carga");

    await waitFor(() => expect(result.current.retry).toBeDefined());
    await result.current.retry();

    await waitFor(() => expect(result.current.errorOrigin).toBeNull());
    expect(result.current.activeWorkoutId).toBe("w-a");
    expect(findOpenExecutionByOwnerStandalone).toHaveBeenCalledTimes(2);
  });
});
