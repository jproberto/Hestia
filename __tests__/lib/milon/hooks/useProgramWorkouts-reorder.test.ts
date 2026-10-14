/**
 * Contrato RED — Mílon 07b Rotação do Treino do Dia (TASK-003): `lib/milon/hooks/useProgramWorkouts.ts`.
 *
 * Fonte da verdade: `.agents/modules/milon/07b-rotacao-treino-dia/spec.md`
 * (§3 "Ordem própria e reordenação" + "Exclusões e bloqueios" D6/D10 de
 * exclusão + §5 Critérios 6/7/10/11) + `plan.md` §3 ("Assinatura de hook
 * useProgramWorkouts (acréscimo)") + `tasks.json` TASK-003 (acceptanceCriteria).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/hooks/useProgramWorkouts` ainda não expõe a operação `reorder`
 * nem mapeia `MSG_TREINO_COM_EXECUCOES` para origem `bloqueio` — Expected:
 * FAIL com "operação reorder ausente" (nenhum arquivo de produção alterado).
 * Hefesto fará GREEN apenas com o contrato do plano — sem inventar APIs.
 *
 * Padrão espelhado de `__tests__/lib/milon/hooks/useProgramWorkouts.test.ts`:
 * `vi.mock` dos barrels `db/workouts` (TODOS os exports, incluindo os da
 * TASK-002 `reorderWorkouts`/`setEntryMode`/`setEntryLoadUnit`/
 * `applySeriesToFollowing` + standalones) e `db/exercises`, `executar` (act
 * tolerante a relançamento) para as operações, `waitFor` para a carga.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — acréscimo do hook):
 * - nova operação `reorder(orderedWorkoutIds: string[])` que persiste via
 *   `reorderWorkoutsStandalone(programId, orderedWorkoutIds)`, recarrega lista
 *   e subtítulos, exibe aviso de sucesso vigente e, em falha, registra
 *   `errorMsg` com origem `operacao` sem fechar a lista;
 * - `remove` estende o mapeamento vigente: `MSG_TREINO_COM_EXERCICIOS` ou
 *   `MSG_TREINO_COM_EXECUCOES` → origem `bloqueio`; demais falhas → `operacao`;
 * - programa inativo é gate FORA do hook: a página só conecta `onReorder`
 *   quando o programa não é inativo (plan.md §3 "Página de programa"); o hook
 *   não recebe status nem bloqueia — a ausência de oferta vive na camada de
 *   interface (readOnly), não aqui.
 *
 * Convenções fixadas aqui (derivadas do contrato do plano):
 * - `reorder` recebe só a lista ordenada de ids (o `programId` vem do closure,
 *   como `create`); o acesso nos testes usa cast tolerante para manter
 *   `tsc --noEmit` verde no RED (a tipagem oficial chega com Hefesto);
 * - sucesso de `reorder` acende `successNotice` não-nulo (texto vigente a
 *   critério de Hefesto — o critério é "aviso visível", não a frase).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProgramWorkouts } from "@/lib/milon/hooks/useProgramWorkouts";
import {
  listWorkoutsByProgramStandalone,
  deleteWorkoutStandalone,
  listEntriesByProgramStandalone,
  reorderWorkoutsStandalone,
} from "@/lib/milon/db/workouts";
import { listExercisesAllStandalone } from "@/lib/milon/db/exercises";
import {
  MSG_TREINO_COM_EXERCICIOS,
  MSG_TREINO_COM_EXECUCOES,
} from "@/lib/milon/workout-utils";
import type { Workout } from "@/lib/milon/types";

// Barrels mockados no padrão dos testes de hook do projeto: o factory cobre
// TODOS os exports do barrel real (inclui os da TASK-002).
vi.mock("@/lib/milon/db/workouts", () => ({
  listWorkoutsByProgram: vi.fn(),
  findWorkoutById: vi.fn(),
  createWorkout: vi.fn(),
  updateWorkoutName: vi.fn(),
  deleteWorkout: vi.fn(),
  reorderWorkouts: vi.fn(),
  hasWorkouts: vi.fn(),
  hasWorkoutWithExercise: vi.fn(),
  listEntriesByWorkout: vi.fn(),
  listEntriesByProgram: vi.fn(),
  addEntry: vi.fn(),
  removeEntry: vi.fn(),
  reorderEntries: vi.fn(),
  setEntryRestSeconds: vi.fn(),
  setEntryMode: vi.fn(),
  setEntryLoadUnit: vi.fn(),
  listSeriesByEntry: vi.fn(),
  setSeriesQuantity: vi.fn(),
  updateSeriesFields: vi.fn(),
  applySeriesToAll: vi.fn(),
  applySeriesToFollowing: vi.fn(),
  listWorkoutsByProgramStandalone: vi.fn(),
  findWorkoutByIdStandalone: vi.fn(),
  createWorkoutStandalone: vi.fn(),
  updateWorkoutNameStandalone: vi.fn(),
  deleteWorkoutStandalone: vi.fn(),
  reorderWorkoutsStandalone: vi.fn(),
  hasWorkoutsStandalone: vi.fn(),
  hasWorkoutWithExerciseStandalone: vi.fn(),
  listEntriesByWorkoutStandalone: vi.fn(),
  listEntriesByProgramStandalone: vi.fn(),
  addEntryStandalone: vi.fn(),
  removeEntryStandalone: vi.fn(),
  reorderEntriesStandalone: vi.fn(),
  setEntryRestSecondsStandalone: vi.fn(),
  setEntryModeStandalone: vi.fn(),
  setEntryLoadUnitStandalone: vi.fn(),
  listSeriesByEntryStandalone: vi.fn(),
  setSeriesQuantityStandalone: vi.fn(),
  updateSeriesFieldsStandalone: vi.fn(),
  applySeriesToAllStandalone: vi.fn(),
  applySeriesToFollowingStandalone: vi.fn(),
}));

vi.mock("@/lib/milon/db/exercises", () => ({
  listExercises: vi.fn(),
  listExercisesAll: vi.fn(),
  createExercise: vi.fn(),
  updateExercise: vi.fn(),
  deleteExercise: vi.fn(),
  setExerciseLoadUnit: vi.fn(),
  listExercisesStandalone: vi.fn(),
  listExercisesAllStandalone: vi.fn(),
  createExerciseStandalone: vi.fn(),
  updateExerciseStandalone: vi.fn(),
  deleteExerciseStandalone: vi.fn(),
  setExerciseLoadUnitStandalone: vi.fn(),
}));

// getEmail() do client mockado globalmente em __tests__/setup.ts.
const EMAIL = "teste@hestia.com";

// ---------------------------------------------------------------------------
// Helpers de fábrica (espelham os tipos de lib/milon/types.ts — fonte única;
// nunca reimplementam regra de produção — só constroem dados e observam)
// ---------------------------------------------------------------------------
function makeWorkout(overrides: Partial<Workout> & { id: string }): Workout {
  return {
    programId: "p-1",
    name: "Treino A",
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

function treinosABC(): Workout[] {
  return [
    makeWorkout({ id: "w-1", name: "Treino A" }),
    makeWorkout({
      id: "w-2",
      name: "Treino B",
      createdAt: "2026-10-01T11:00:00.000Z",
    }),
    makeWorkout({
      id: "w-3",
      name: "Treino C",
      createdAt: "2026-10-01T12:00:00.000Z",
    }),
  ];
}

/** Tipo futuro da operação (Hefesto adiciona ao `UseProgramWorkoutsReturn`). */
type WithReorder = {
  reorder?: (orderedWorkoutIds: string[]) => Promise<void>;
};

function getReorder(result: { current: unknown }): WithReorder["reorder"] {
  return (result.current as unknown as WithReorder).reorder;
}

function prepararListas(inicial: Workout[], depois?: Workout[]): void {
  const lista = vi.mocked(listWorkoutsByProgramStandalone);
  lista.mockReset();
  if (depois) {
    lista.mockResolvedValueOnce(inicial).mockResolvedValue(depois);
  } else {
    lista.mockResolvedValue(inicial);
  }
  vi.mocked(listEntriesByProgramStandalone).mockResolvedValue([]);
  vi.mocked(listExercisesAllStandalone).mockResolvedValue([]);
}

/**
 * Executa operação do hook DENTRO de `await act(async () => ...)`, espelhando
 * `useProgramWorkouts.test.ts`: não depende de a operação relançar ou não — os
 * critérios verificam `errorMsg`/`errorOrigin`/lista, não o throw.
 */
async function executar(operacao: () => unknown): Promise<void> {
  await act(async () => {
    try {
      await operacao();
    } catch {
      // Falha capturada de propósito — ver asserções de errorMsg/lista.
    }
  });
}

// ---------------------------------------------------------------------------

describe("Mílon 07b — useProgramWorkouts reorder (contrato RED, TASK-003)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Zera queues/implementações SÓ dos mocks deste teste (o client global de
    // setup.ts é preservado — getUserEmail continua respondendo).
    vi.mocked(listWorkoutsByProgramStandalone).mockReset();
    vi.mocked(listEntriesByProgramStandalone).mockReset();
    vi.mocked(listExercisesAllStandalone).mockReset();
    vi.mocked(deleteWorkoutStandalone).mockReset();
    vi.mocked(reorderWorkoutsStandalone).mockReset();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. reorder com sucesso: persiste, recarrega e avisa
  // -------------------------------------------------------------------------
  describe("1. reorder (reordenação de treinos — Critério 6)", () => {
    it("sucesso persiste a ordem via standalone, recarrega a lista na ordem nova e acende successNotice", async () => {
      const [w1, w2, w3] = treinosABC();
      prepararListas([w1, w2, w3], [w3, w1, w2]);
      vi.mocked(reorderWorkoutsStandalone).mockResolvedValue(undefined);

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // A operação existe no contrato (acréscimo do plano §3)
      const reorder = getReorder(result);
      expect(typeof reorder).toBe("function");

      await executar(() => reorder?.(["w-3", "w-1", "w-2"]));

      // Persiste pelo standalone com o programa do closure + ordem recebida
      expect(reorderWorkoutsStandalone).toHaveBeenCalledWith("p-1", [
        "w-3",
        "w-1",
        "w-2",
      ]);
      // Recarrega lista e subtítulos na ordem nova, sem erro, com aviso
      await waitFor(() =>
        expect(result.current.workouts.map((w) => w.id)).toEqual([
          "w-3",
          "w-1",
          "w-2",
        ]),
      );
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(2);
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).not.toBeNull();
    });

    it("falha de operação grava origem 'operacao' preservando a lista e sem successNotice", async () => {
      prepararListas(treinosABC());
      vi.mocked(reorderWorkoutsStandalone).mockRejectedValueOnce(
        new Error("falha ao reordenar"),
      );

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const reorder = getReorder(result);
      expect(typeof reorder).toBe("function");

      await executar(() => reorder?.(["w-3", "w-1", "w-2"]));

      expect(reorderWorkoutsStandalone).toHaveBeenCalledWith("p-1", [
        "w-3",
        "w-1",
        "w-2",
      ]);
      expect(result.current.errorMsg).toContain("falha ao reordenar");
      expect(result.current.errorOrigin).toBe("operacao");
      // Lista preservada (sem recarga de sucesso) e sem aviso
      expect(result.current.workouts.map((w) => w.id)).toEqual([
        "w-1",
        "w-2",
        "w-3",
      ]);
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);
      expect(result.current.successNotice).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Programa inativo: gate fora do hook (Critério 7)
  // -------------------------------------------------------------------------
  describe("2. Programa inativo fora do hook (Critério 7)", () => {
    it("o hook não recebe status nem bloqueia reorder: a ausência de oferta em inativo vive na página/interface, não no hook", async () => {
      // Dado qualquer programa (o hook só conhece o id — sem gate de status)
      prepararListas(treinosABC(), treinosABC());
      vi.mocked(reorderWorkoutsStandalone).mockResolvedValue(undefined);

      const { result } = renderHook(() => useProgramWorkouts("p-inativo"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então a operação existe e persiste do mesmo jeito — o readOnly que
      // esconde as alças e a página que não conecta onReorder em inativo são
      // os donos do bloqueio (plan.md §3 "Página de programa"), não o hook
      const reorder = getReorder(result);
      expect(typeof reorder).toBe("function");

      await executar(() => reorder?.(["w-2", "w-1", "w-3"]));

      expect(reorderWorkoutsStandalone).toHaveBeenCalledWith("p-inativo", [
        "w-2",
        "w-1",
        "w-3",
      ]);
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 3. remove com execução associada vira bloqueio (Critério 10)
  // -------------------------------------------------------------------------
  describe("3. remove com execução associada (Critério 10)", () => {
    it("MSG_TREINO_COM_EXECUCOES vira errorMsg com origem 'bloqueio' SEM recarregar a lista", async () => {
      const [w1, w2] = treinosABC();
      prepararListas([w1, w2]);
      vi.mocked(deleteWorkoutStandalone).mockRejectedValueOnce(
        new Error(MSG_TREINO_COM_EXECUCOES),
      );

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.remove(w1));

      expect(deleteWorkoutStandalone).toHaveBeenCalledWith("w-1");
      expect(result.current.errorMsg).toBe(MSG_TREINO_COM_EXECUCOES);
      expect(result.current.errorOrigin).toBe("bloqueio");
      // Sem recarga de sucesso: só a carga de montagem buscou a lista
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);
      expect(result.current.workouts.map((w) => w.id)).toEqual(["w-1", "w-2"]);
      expect(result.current.successNotice).toBeNull();
    });

    it("MSG_TREINO_COM_EXERCICIOS continua mapeada para 'bloqueio' (regressão do vigente)", async () => {
      const [w1] = treinosABC();
      prepararListas([w1]);
      vi.mocked(deleteWorkoutStandalone).mockRejectedValueOnce(
        new Error(MSG_TREINO_COM_EXERCICIOS),
      );

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.remove(w1));

      expect(result.current.errorMsg).toBe(MSG_TREINO_COM_EXERCICIOS);
      expect(result.current.errorOrigin).toBe("bloqueio");
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);
    });
  });
});
