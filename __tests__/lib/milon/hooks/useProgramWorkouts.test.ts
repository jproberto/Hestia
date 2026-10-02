/**
 * Contrato RED — Mílon #3 (TASK-007): `lib/milon/hooks/useProgramWorkouts.ts`.
 *
 * Fonte da verdade: `.agents/modules/milon/03-treinos-series/spec.md`
 * (§3 "Detalhe do Programa — lista de treinos": D6 exclusão bloqueada, D11
 * nome obrigatório/único, D15 subtítulo derivado; §5 Critérios de Aceite) +
 * `plan.md` §3 (contrato textual do hook `useProgramWorkouts`) +
 * `tasks.json` TASK-007 (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/hooks/useProgramWorkouts` ainda não existe — Expected: FAIL
 * com "módulo não encontrado" (acceptanceCriteria 1 da TASK-007). Hefesto
 * fará GREEN apenas com o contrato descrito no plano — sem inventar APIs.
 *
 * Padrão espelhado de `__tests__/lib/milon/hooks/usePrograms.test.ts` e
 * `useExercises.test.ts`: `vi.mock` dos barrels `db/workouts` e `db/exercises`,
 * promise-chain + flag `cancelled` no hook, `waitFor` para a carga e
 * `executar` (act tolerante a relançamento) para as operações.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — retornos e regras):
 * - retorno: `{ workouts, subtitles, loading, errorMsg, errorOrigin,
 *   successNotice, retry, create, rename, remove }`;
 * - carga: `listWorkoutsByProgram` + `listEntriesByProgram` + `listExercisesAll`
 *   -> `subtitles[workoutId]` via `gerarSubtituloMusculares` (músculos na ordem
 *   das entradas, deduplicados; treino sem exercícios -> subtítulo vazio);
 *   falha -> `errorOrigin: 'carga'` com `retry` recarregando;
 * - `create`/`rename` validam o nome (obrigatório + unicidade normalizada no
 *   Programa) e RELANÇAM o erro para o modal — NÃO tocam em `errorMsg`/
 *   `errorOrigin` (padrão `save` de `usePrograms`);
 * - sucesso de `create`/`rename`/`remove` recarrega a lista e acende
 *   `successNotice` por 3000 ms (padrão `useExercises`), zerando ao concluir;
 * - `remove`: `MSG_TREINO_COM_EXERCICIOS` -> `errorMsg` + `errorOrigin:
 *   'bloqueio'` SEM chamar a recarga de sucesso (banner da lista, D6);
 *   demais falhas -> `'operacao'`.
 *
 * Convenções fixadas aqui (não ditas literalmente pela spec; derivadas do
 * contrato do plano e do padrão do módulo):
 * - `subtitles` é `Record<workoutId, string>`; a asserção de treino sem
 *   exercícios aceita "" ou chave ausente (`?? ""`) — o critério é "vazio";
 * - e-mail da sessão = mock global de `__tests__/setup.ts` ("teste@hestia.com"),
 *   repassado aos standalones que exigem `email` (create).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProgramWorkouts } from "@/lib/milon/hooks/useProgramWorkouts";
import * as hooksIndex from "@/lib/milon/hooks";
import {
  listWorkoutsByProgramStandalone,
  createWorkoutStandalone,
  updateWorkoutNameStandalone,
  deleteWorkoutStandalone,
  listEntriesByProgramStandalone,
} from "@/lib/milon/db/workouts";
import { listExercisesAllStandalone } from "@/lib/milon/db/exercises";
import {
  MSG_TREINO_COM_EXERCICIOS,
  MSG_NOME_TREINO_OBRIGATORIO,
  MSG_NOME_TREINO_DUPLICADO,
} from "@/lib/milon/workout-utils";
import type { Exercise, Workout, WorkoutEntry } from "@/lib/milon/types";

// Barrels mockados no padrão dos testes de hook do projeto: o factory cobre
// TODOS os exports do barrel real (standalones consumidos pelo hook + nomes
// com `db` espelhados), para o import do `hooks/index` não quebrar.
vi.mock("@/lib/milon/db/workouts", () => ({
  listWorkoutsByProgram: vi.fn(),
  findWorkoutById: vi.fn(),
  createWorkout: vi.fn(),
  updateWorkoutName: vi.fn(),
  deleteWorkout: vi.fn(),
  hasWorkouts: vi.fn(),
  hasWorkoutWithExercise: vi.fn(),
  listEntriesByWorkout: vi.fn(),
  listEntriesByProgram: vi.fn(),
  addEntry: vi.fn(),
  removeEntry: vi.fn(),
  reorderEntries: vi.fn(),
  setEntryRestSeconds: vi.fn(),
  listSeriesByEntry: vi.fn(),
  setSeriesQuantity: vi.fn(),
  updateSeriesFields: vi.fn(),
  applySeriesToAll: vi.fn(),
  listWorkoutsByProgramStandalone: vi.fn(),
  findWorkoutByIdStandalone: vi.fn(),
  createWorkoutStandalone: vi.fn(),
  updateWorkoutNameStandalone: vi.fn(),
  deleteWorkoutStandalone: vi.fn(),
  hasWorkoutsStandalone: vi.fn(),
  hasWorkoutWithExerciseStandalone: vi.fn(),
  listEntriesByWorkoutStandalone: vi.fn(),
  listEntriesByProgramStandalone: vi.fn(),
  addEntryStandalone: vi.fn(),
  removeEntryStandalone: vi.fn(),
  reorderEntriesStandalone: vi.fn(),
  setEntryRestSecondsStandalone: vi.fn(),
  listSeriesByEntryStandalone: vi.fn(),
  setSeriesQuantityStandalone: vi.fn(),
  updateSeriesFieldsStandalone: vi.fn(),
  applySeriesToAllStandalone: vi.fn(),
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

// getEmail() do client mockado globalmente em __tests__/setup.ts (task 49).
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

function makeEntry(
  overrides: Partial<WorkoutEntry> & { id: string },
): WorkoutEntry {
  return {
    workoutId: "w-1",
    programId: "p-1",
    exerciseId: "ex-1",
    position: 1,
    restSeconds: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

function makeExercise(
  overrides: Partial<Exercise> & { id: string },
): Exercise {
  return {
    name: "Supino reto",
    muscle: "Peito",
    videoLink: null,
    loadUnit: null,
    deletedAt: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

/**
 * Configura a carga: `inicial` na montagem e, quando houver, `depois` em
 * qualquer recarga posterior (verdade pós-operação). Entradas/exercícios
 * alimentam os subtítulos derivados.
 */
function prepararListas(
  inicial: Workout[],
  depois?: Workout[],
  entries: WorkoutEntry[] = [],
  exercises: Exercise[] = [],
): void {
  const lista = vi.mocked(listWorkoutsByProgramStandalone);
  lista.mockReset();
  if (depois) {
    lista.mockResolvedValueOnce(inicial).mockResolvedValue(depois);
  } else {
    lista.mockResolvedValue(inicial);
  }
  vi.mocked(listEntriesByProgramStandalone).mockResolvedValue(entries);
  vi.mocked(listExercisesAllStandalone).mockResolvedValue(exercises);
}

/**
 * Executa operação do hook DENTRO de `await act(async () => ...)`, espelhando
 * `usePrograms.test.ts`: não depende de a operação relançar ou não — os
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

describe("Mílon #3 — useProgramWorkouts (contrato RED, TASK-007)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Zera queues/implementações SÓ dos mocks deste teste (o client global de
    // setup.ts é preservado — getUserEmail continua respondendo).
    vi.mocked(listWorkoutsByProgramStandalone).mockReset();
    vi.mocked(listEntriesByProgramStandalone).mockReset();
    vi.mocked(listExercisesAllStandalone).mockReset();
    vi.mocked(createWorkoutStandalone).mockReset();
    vi.mocked(updateWorkoutNameStandalone).mockReset();
    vi.mocked(deleteWorkoutStandalone).mockReset();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. Carga inicial: subtítulo derivado por treino (D15, spec §5)
  // -------------------------------------------------------------------------
  describe("1. Carga inicial e subtítulos derivados (D15)", () => {
    it("monta subtitles por treino na ordem das entradas, deduplicando músculos; treino sem exercícios fica vazio", async () => {
      const w1 = makeWorkout({ id: "w-1", name: "Treino A", createdAt: "2026-10-01T10:00:00.000Z" });
      const w2 = makeWorkout({ id: "w-2", name: "Treino B", createdAt: "2026-10-01T11:00:00.000Z" });
      const w3 = makeWorkout({ id: "w-3", name: "Treino C", createdAt: "2026-10-01T12:00:00.000Z" });
      const exPeito = makeExercise({ id: "ex-peito", name: "Supino reto", muscle: "Peito" });
      const exTriceps = makeExercise({ id: "ex-triceps", name: "Tríceps corda", muscle: "Tríceps" });
      const exOmbros = makeExercise({ id: "ex-ombros", name: "Desenvolvimento", muscle: "Ombros" });
      const exPeito2 = makeExercise({ id: "ex-peito-2", name: "Crucifixo", muscle: "Peito" });
      const entradas: WorkoutEntry[] = [
        // Ordem das entradas define a ordem dos músculos no subtítulo.
        makeEntry({ id: "ent-1", workoutId: "w-1", exerciseId: "ex-peito", position: 1 }),
        makeEntry({ id: "ent-2", workoutId: "w-1", exerciseId: "ex-triceps", position: 2 }),
        makeEntry({ id: "ent-3", workoutId: "w-1", exerciseId: "ex-ombros", position: 3 }),
        // Dois exercícios do MESMO músculo no w-2: deduplica para "Peito".
        makeEntry({ id: "ent-4", workoutId: "w-2", exerciseId: "ex-peito", position: 1 }),
        makeEntry({ id: "ent-5", workoutId: "w-2", exerciseId: "ex-peito-2", position: 2 }),
      ];
      prepararListas(
        [w1, w2, w3],
        undefined,
        entradas,
        [exPeito, exTriceps, exOmbros, exPeito2],
      );

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Lista preserva a ordem do repositório (ordem de criação, D13).
      expect(result.current.workouts.map((w) => w.id)).toEqual(["w-1", "w-2", "w-3"]);
      expect(result.current.subtitles["w-1"]).toBe("Peito, Tríceps e Ombros");
      expect(result.current.subtitles["w-2"]).toBe("Peito");
      // Treino sem exercícios -> subtítulo vazio (D15; "" ou chave ausente).
      expect(result.current.subtitles["w-3"] ?? "").toBe("");
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(listEntriesByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(listExercisesAllStandalone).toHaveBeenCalledTimes(1);
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
      expect(typeof result.current.retry).toBe("function");
    });

    it("erro de carga grava errorMsg com origem 'carga' e o retry recarrega a lista", async () => {
      const w1 = makeWorkout({ id: "w-1" });
      // FIFO correto (padrão homologado de usePrograms.test.ts:196-198): a 1ª
      // chamada (montagem) REJEITA e o fallback `.mockResolvedValue` alimenta o
      // retry. Um `mockResolvedValueOnce` prévio (ex.: via `prepararListas`)
      // seria consumido primeiro pela queue FIFO e a montagem nunca rejeitaria.
      vi.mocked(listWorkoutsByProgramStandalone)
        .mockRejectedValueOnce(new Error("falha de rede"))
        .mockResolvedValue([w1]);
      vi.mocked(listEntriesByProgramStandalone).mockResolvedValue([]);
      vi.mocked(listExercisesAllStandalone).mockResolvedValue([]);

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.errorMsg).toContain("falha de rede");
      expect(result.current.errorOrigin).toBe("carga");
      expect(result.current.workouts).toEqual([]);

      await executar(() => result.current.retry());

      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.workouts.map((w) => w.id)).toEqual(["w-1"]);
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // 2. create — validação de nome relançada ao modal (padrão save) + sucesso
  // -------------------------------------------------------------------------
  describe("2. create (criação de treino)", () => {
    it("nome vazio/só espaços relança MSG_NOME_TREINO_OBRIGATORIO sem tocar no canal de erro e sem chamar o repositório", async () => {
      prepararListas([makeWorkout({ id: "w-1" })]);

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(
          result.current.create({ name: "   " }),
        ).rejects.toThrow(MSG_NOME_TREINO_OBRIGATORIO);
      });

      expect(createWorkoutStandalone).not.toHaveBeenCalled();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
      expect(result.current.workouts).toHaveLength(1);
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);
    });

    it("nome colidindo (normalizado) com existente relança MSG_NOME_TREINO_DUPLICADO sem tocar no canal de erro", async () => {
      prepararListas([makeWorkout({ id: "w-1", name: "Push" })]);

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(
          result.current.create({ name: "  push  " }),
        ).rejects.toThrow(MSG_NOME_TREINO_DUPLICADO);
      });

      expect(createWorkoutStandalone).not.toHaveBeenCalled();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
    });

    it("sucesso chama o repositório com a sessão, recarrega a lista e acende successNotice", async () => {
      const w1 = makeWorkout({ id: "w-1", name: "Treino A" });
      const novo = makeWorkout({
        id: "w-2",
        name: "Treino B",
        createdAt: "2026-10-01T11:00:00.000Z",
      });
      prepararListas([w1], [w1, novo]);
      vi.mocked(createWorkoutStandalone).mockResolvedValue(novo);

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let salvo: Workout | undefined;
      await act(async () => {
        salvo = await result.current.create({ name: "Treino B" });
      });

      expect(salvo?.id).toBe("w-2");
      expect(createWorkoutStandalone).toHaveBeenCalledWith(
        "p-1",
        { name: "Treino B" },
        EMAIL,
      );
      await waitFor(() =>
        expect(result.current.workouts.map((w) => w.id)).toEqual(["w-1", "w-2"]),
      );
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(2);
      expect(result.current.successNotice).not.toBeNull();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("falha do repositório é relançada ao modal sem alimentar errorMsg/errorOrigin", async () => {
      prepararListas([makeWorkout({ id: "w-1" })]);
      vi.mocked(createWorkoutStandalone).mockRejectedValueOnce(
        new Error("Erro ao criar treino"),
      );

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(
          result.current.create({ name: "Treino B" }),
        ).rejects.toThrow("Erro ao criar treino");
      });

      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
      expect(result.current.workouts).toHaveLength(1);
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 3. rename — validação de nome relançada ao modal + sucesso
  // -------------------------------------------------------------------------
  describe("3. rename (renomeação de treino)", () => {
    it("nome vazio relança MSG_NOME_TREINO_OBRIGATORIO sem tocar no canal de erro e sem chamar o repositório", async () => {
      prepararListas([makeWorkout({ id: "w-1" })]);

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(
          result.current.rename("w-1", { name: "  " }),
        ).rejects.toThrow(MSG_NOME_TREINO_OBRIGATORIO);
      });

      expect(updateWorkoutNameStandalone).not.toHaveBeenCalled();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
    });

    it("colisão com nome de OUTRO treino (normalizado) relança MSG_NOME_TREINO_DUPLICADO sem tocar no canal de erro", async () => {
      prepararListas([
        makeWorkout({ id: "w-1", name: "Push" }),
        makeWorkout({ id: "w-2", name: "Leg", createdAt: "2026-10-01T11:00:00.000Z" }),
      ]);

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(
          result.current.rename("w-2", { name: " PUSH " }),
        ).rejects.toThrow(MSG_NOME_TREINO_DUPLICADO);
      });

      expect(updateWorkoutNameStandalone).not.toHaveBeenCalled();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("sucesso chama o repositório, recarrega a lista e acende successNotice", async () => {
      const w1 = makeWorkout({ id: "w-1", name: "Push" });
      const w2 = makeWorkout({ id: "w-2", name: "Leg", createdAt: "2026-10-01T11:00:00.000Z" });
      prepararListas([w1, w2], [w1, { ...w2, name: "Membros inferiores" }]);
      vi.mocked(updateWorkoutNameStandalone).mockResolvedValue({
        ...w2,
        name: "Membros inferiores",
      });

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.rename("w-2", { name: "Membros inferiores" });
      });

      expect(updateWorkoutNameStandalone).toHaveBeenCalledWith("w-2", {
        name: "Membros inferiores",
      });
      expect(createWorkoutStandalone).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(result.current.workouts.map((w) => w.name)).toEqual([
          "Push",
          "Membros inferiores",
        ]),
      );
      expect(result.current.successNotice).not.toBeNull();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("falha do repositório é relançada sem alimentar errorMsg/errorOrigin", async () => {
      prepararListas([makeWorkout({ id: "w-1", name: "Push" })]);
      vi.mocked(updateWorkoutNameStandalone).mockRejectedValueOnce(
        new Error("Erro ao renomear treino"),
      );

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(
          result.current.rename("w-1", { name: "Pull" }),
        ).rejects.toThrow("Erro ao renomear treino");
      });

      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
      expect(result.current.workouts[0].name).toBe("Push");
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 4. remove — guarda D6 vira banner 'bloqueio' na lista; sucesso recarrega
  // -------------------------------------------------------------------------
  describe("4. remove (exclusão de treino — D6)", () => {
    it("MSG_TREINO_COM_EXERCICIOS vira errorMsg com origem 'bloqueio' SEM chamar a recarga de sucesso", async () => {
      const w1 = makeWorkout({ id: "w-1" });
      const w2 = makeWorkout({ id: "w-2", createdAt: "2026-10-01T11:00:00.000Z" });
      prepararListas([w1, w2]);
      vi.mocked(deleteWorkoutStandalone).mockRejectedValueOnce(
        new Error(MSG_TREINO_COM_EXERCICIOS),
      );

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.remove(w1));

      expect(deleteWorkoutStandalone).toHaveBeenCalledWith("w-1");
      expect(result.current.errorMsg).toBe(MSG_TREINO_COM_EXERCICIOS);
      expect(result.current.errorOrigin).toBe("bloqueio");
      // Sem recarga de sucesso: só a carga de montagem buscou a lista.
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);
      expect(result.current.workouts.map((w) => w.id)).toEqual(["w-1", "w-2"]);
      expect(result.current.successNotice).toBeNull();
    });

    it("falha de operação grava origem 'operacao' preservando a lista", async () => {
      const w1 = makeWorkout({ id: "w-1" });
      prepararListas([w1]);
      vi.mocked(deleteWorkoutStandalone).mockRejectedValueOnce(
        new Error("Erro ao excluir treino"),
      );

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.remove(w1));

      expect(result.current.errorMsg).toContain("Erro ao excluir treino");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(result.current.workouts.map((w) => w.id)).toEqual(["w-1"]);
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);
      expect(result.current.successNotice).toBeNull();
    });

    it("sucesso recarrega a lista sem treino excluído e acende successNotice", async () => {
      const w1 = makeWorkout({ id: "w-1" });
      const w2 = makeWorkout({ id: "w-2", createdAt: "2026-10-01T11:00:00.000Z" });
      prepararListas([w1, w2], [w2]);
      vi.mocked(deleteWorkoutStandalone).mockResolvedValue(undefined);

      const { result } = renderHook(() => useProgramWorkouts("p-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.workouts).toHaveLength(2);

      await executar(() => result.current.remove(w1));

      expect(deleteWorkoutStandalone).toHaveBeenCalledWith("w-1");
      await waitFor(() =>
        expect(result.current.workouts.map((w) => w.id)).toEqual(["w-2"]),
      );
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(2);
      expect(result.current.successNotice).not.toBeNull();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 5. successNotice de 3000 ms (padrão useExercises)
  // -------------------------------------------------------------------------
  it("sucesso de create acende successNotice que zera ao concluir os 3000 ms", async () => {
    const w1 = makeWorkout({ id: "w-1" });
    const novo = makeWorkout({
      id: "w-2",
      name: "Treino B",
      createdAt: "2026-10-01T11:00:00.000Z",
    });
    prepararListas([w1], [w1, novo]);
    vi.mocked(createWorkoutStandalone).mockResolvedValue(novo);

    const { result } = renderHook(() => useProgramWorkouts("p-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Timers falsos só a partir daqui: a carga acima usou timers reais e o
    // aviso é agendado DENTRO da operação (setTimeout de 3000 ms).
    vi.useFakeTimers();
    try {
      await act(async () => {
        await result.current.create({ name: "Treino B" });
      });

      expect(result.current.successNotice).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.successNotice).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("hooks/index exporta useProgramWorkouts como caminho oficial", () => {
    expect(typeof hooksIndex.useProgramWorkouts).toBe("function");
  });
});
