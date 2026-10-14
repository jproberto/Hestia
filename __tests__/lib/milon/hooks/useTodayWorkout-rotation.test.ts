/**
 * Contrato RED — Mílon 07b Rotação do Treino do Dia (TASK-003): `lib/milon/hooks/useTodayWorkout.ts`.
 *
 * Fonte da verdade: `.agents/modules/milon/07b-rotacao-treino-dia/spec.md`
 * (§3 "Prioridade da execução aberta" D10 + "Definição de próximo" D1 +
 * "Sem histórico e ficha nova" D4/D5a + "Ordem própria" D8 troca manual +
 * §5 Critérios 1/2/4/5/8/13/11) + `plan.md` §3 ("Assinatura de hook
 * useTodayWorkout (retorno preservado)") + `tasks.json` TASK-003
 * (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/hooks/useTodayWorkout` ainda resolve a seleção pelo primeiro
 * item da lista (`list[0].id`) e nunca consulta
 * `findOpenExecutionByProgramStandalone` nem
 * `findLastSealedExecutionByProgramStandalone` — Expected: FAIL com "aberta
 * ignorada e histórico sem volta ao primeiro" (nenhum arquivo de produção
 * alterado). Hefesto fará GREEN apenas com o contrato do plano — sem inventar
 * APIs.
 *
 * Padrão espelhado de `__tests__/lib/milon/hooks/useTodayWorkout.test.ts`:
 * `vi.mock` dos barrels `db/programs` + `db/workouts` cobrindo TODOS os
 * exports (forma com `db` + standalones, incluindo os da TASK-002
 * `reorderWorkouts`/`setEntryMode`/`setEntryLoadUnit`/`applySeriesToFollowing`)
 * + `db/executions` cobrindo TODOS os exports (forma com `db` + standalones,
 * incluindo os da TASK-002 `findLastSealedExecutionByProgram`/
 * `findOpenExecutionByProgram`), promise-chain + flag `cancelled` no hook,
 * `waitFor` para a carga. E-mail da sessão vem do mock global de
 * `__tests__/setup.ts` ("teste@hestia.com").
 *
 * CONTRATO CONSUMIDO (plan.md §3 — resolução da seleção):
 * - retorno preservado: `{ program, workouts, selectedWorkoutId, selectWorkout,
 *   loading, errorMsg, errorOrigin, successNotice nulo, retry }`;
 * - após programa + treinos: consulta a aberta do programa via
 *   `findOpenExecutionByProgramStandalone(programId)`; se existir e o treino
 *   dela estiver na lista, seleciona esse treino (D10, acima do selado);
 * - senão, consulta a última selada via
 *   `findLastSealedExecutionByProgramStandalone(programId)` e aplica
 *   `pickNextWorkoutAfterLastSealed` sobre os ids na ordem recebida (D1, com
 *   volta ao primeiro); sem selada, o primeiro (D4); lista vazia, nulo sem erro;
 * - `selectWorkout` síncrona restrita à lista (D8); fora da lista, ignorada;
 * - falha em qualquer etapa → `errorMsg` não-nulo, `errorOrigin: 'carga'`, e
 *   `retry` repete e-mail → ativo → treinos → aberta → selada.
 *
 * Convenções fixadas aqui (derivadas do contrato do plano):
 * - a última selada e a aberta chegam como `WorkoutExecution` (finishedAt
 *   preenchido = selada; nulo = aberta); a regra de vizinho é do hook via
 *   `pickNextWorkoutAfterLastSealed` (testada direto na TASK-001);
 * - `findOpenExecutionByProgramStandalone` e
 *   `findLastSealedExecutionByProgramStandalone` recebem o id do programa ativo.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTodayWorkout } from "@/lib/milon/hooks/useTodayWorkout";
import { findActiveProgramByOwnerStandalone } from "@/lib/milon/db/programs";
import { listWorkoutsByProgramStandalone } from "@/lib/milon/db/workouts";
import {
  findLastSealedExecutionByProgramStandalone,
  findOpenExecutionByProgramStandalone,
} from "@/lib/milon/db/executions";
import type {
  Program,
  Workout,
  WorkoutExecution,
} from "@/lib/milon/types";

// Barrel `db/programs` mockado no padrão dos testes de hook do projeto: o
// factory cobre TODOS os exports do barrel real.
vi.mock("@/lib/milon/db/programs", () => ({
  PROGRAM_ACTIVE_UNICITY_MESSAGE: "Já existe um programa ativo para este dono.",
  listPrograms: vi.fn(),
  findProgramById: vi.fn(),
  findActiveProgramByOwner: vi.fn(),
  createProgram: vi.fn(),
  updateProgram: vi.fn(),
  deleteProgram: vi.fn(),
  listProgramsStandalone: vi.fn(),
  findProgramByIdStandalone: vi.fn(),
  findActiveProgramByOwnerStandalone: vi.fn(),
  createProgramStandalone: vi.fn(),
  updateProgramStandalone: vi.fn(),
  deleteProgramStandalone: vi.fn(),
}));

// Barrel `db/workouts` mockado com TODOS os exports do barrel real (inclui os
// da TASK-002: `reorderWorkouts`, `setEntryMode`, `setEntryLoadUnit`,
// `applySeriesToFollowing` + standalones).
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

// Barrel `db/executions` mockado com TODOS os exports do barrel real (inclui
// os da TASK-002: `findLastSealedExecutionByProgram` e
// `findOpenExecutionByProgram` + standalones).
vi.mock("@/lib/milon/db/executions", () => ({
  findOpenExecutionByWorkout: vi.fn(),
  startExecution: vi.fn(),
  finishExecution: vi.fn(),
  clearExecution: vi.fn(),
  findLastSealedExecutionByProgram: vi.fn(),
  findOpenExecutionByProgram: vi.fn(),
  listDoneByExecution: vi.fn(),
  markSeriesDone: vi.fn(),
  unmarkSeries: vi.fn(),
  findOpenExecutionByWorkoutStandalone: vi.fn(),
  startExecutionStandalone: vi.fn(),
  finishExecutionStandalone: vi.fn(),
  clearExecutionStandalone: vi.fn(),
  findLastSealedExecutionByProgramStandalone: vi.fn(),
  findOpenExecutionByProgramStandalone: vi.fn(),
  listDoneByExecutionStandalone: vi.fn(),
  markSeriesDoneStandalone: vi.fn(),
  unmarkSeriesStandalone: vi.fn(),
}));

// E-mail da sessão = mock global de `__tests__/setup.ts`.
const EMAIL = "teste@hestia.com";

// ---------------------------------------------------------------------------
// Factories com defaults (espelham `lib/milon/types.ts` — fonte única; nunca
// reimplementam regra de produção — só constroem dados e observam)
// ---------------------------------------------------------------------------
function makeProgram(overrides: Partial<Program> & { id: string }): Program {
  return {
    title: "Ficha A",
    owner: EMAIL,
    status: "ativo",
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

function makeWorkout(overrides: Partial<Workout> & { id: string }): Workout {
  return {
    programId: "p-1",
    name: "Treino A",
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

function makeExecution(
  overrides: Partial<WorkoutExecution> & { id: string; workoutId: string },
): WorkoutExecution {
  return {
    programId: "p-1",
    startedAt: "2026-10-13T10:00:00.000Z",
    finishedAt: null,
    createdAt: "2026-10-13T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

/** Aberta no treino informado (término vazio). */
function makeAberta(workoutId: string, id = `exec-aberta-${workoutId}`): WorkoutExecution {
  return makeExecution({ id, workoutId, finishedAt: null });
}

/** Selada no treino informado (término preenchido). */
function makeSelada(workoutId: string, id = `exec-selada-${workoutId}`): WorkoutExecution {
  return makeExecution({
    id,
    workoutId,
    finishedAt: "2026-10-13T11:00:00.000Z",
  });
}

function treinosABC(programId = "p-1"): Workout[] {
  return [
    makeWorkout({ id: "w-1", programId, name: "Treino A" }),
    makeWorkout({
      id: "w-2",
      programId,
      name: "Treino B",
      createdAt: "2026-10-01T11:00:00.000Z",
    }),
    makeWorkout({
      id: "w-3",
      programId,
      name: "Treino C",
      createdAt: "2026-10-01T12:00:00.000Z",
    }),
  ];
}

// ---------------------------------------------------------------------------

describe("Mílon 07b — useTodayWorkout rotação por histórico (contrato RED, TASK-003)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Zera queues/implementações SÓ dos mocks deste teste (o client global de
    // setup.ts é preservado — getUserEmail continua respondendo "teste@hestia.com").
    vi.mocked(findActiveProgramByOwnerStandalone).mockReset();
    vi.mocked(listWorkoutsByProgramStandalone).mockReset();
    vi.mocked(findOpenExecutionByProgramStandalone).mockReset();
    vi.mocked(findLastSealedExecutionByProgramStandalone).mockReset();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. Prioridade da aberta (D10 — vence qualquer rotação por selado)
  // -------------------------------------------------------------------------
  describe("1. Prioridade da execução aberta (D10)", () => {
    it("Dada aberta no programa ativo, o Treino do Dia exibe o treino da aberta acima da rotação por selado", async () => {
      // Dado programa ativo com A, B e C; a rotação por selado sozinha
      // apontaria C (selado = B), mas há aberta em A
      const programa = makeProgram({ id: "p-1" });
      const treinos = treinosABC();
      const aberta = makeAberta("w-1");
      const selada = makeSelada("w-2");
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);
      vi.mocked(findOpenExecutionByProgramStandalone).mockResolvedValue(aberta);
      vi.mocked(findLastSealedExecutionByProgramStandalone).mockResolvedValue(selada);

      // Quando o hook resolve
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então a aberta vence: exibe A, e a aberta foi consultada por programa
      expect(findOpenExecutionByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(result.current.selectedWorkoutId).toBe("w-1");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("Dada aberta cujo treino saiu da lista, a seleção cai para a rotação por selado", async () => {
      // Dado aberta em treino que não está mais na lista + selado em A
      const programa = makeProgram({ id: "p-1" });
      const treinos = treinosABC();
      const abertaFora = makeAberta("w-excluido", "exec-aberta-fora");
      const selada = makeSelada("w-1");
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);
      vi.mocked(findOpenExecutionByProgramStandalone).mockResolvedValue(abertaFora);
      vi.mocked(findLastSealedExecutionByProgramStandalone).mockResolvedValue(selada);

      // Quando o hook resolve
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então ignora a aberta órfã e aplica o próximo após o selado (B)
      expect(findOpenExecutionByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(findLastSealedExecutionByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(result.current.selectedWorkoutId).toBe("w-2");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Rotação por histórico com volta ao primeiro (D1)
  // -------------------------------------------------------------------------
  describe("2. Rotação por último selado com volta (D1)", () => {
    it("Dado último selado B sem aberta, o Treino do Dia exibe C (vizinho seguinte)", async () => {
      // Dado programa ativo com A, B e C e último selado B, sem aberta
      const programa = makeProgram({ id: "p-1" });
      const treinos = treinosABC();
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);
      vi.mocked(findOpenExecutionByProgramStandalone).mockResolvedValue(null);
      vi.mocked(findLastSealedExecutionByProgramStandalone).mockResolvedValue(
        makeSelada("w-2"),
      );

      // Quando o hook resolve
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então consulta aberta + selada por programa e exibe o seguinte (C)
      expect(findOpenExecutionByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(findLastSealedExecutionByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(result.current.selectedWorkoutId).toBe("w-3");
    });

    it("Dado último selado C (derradeiro) sem aberta, o Treino do Dia volta ao primeiro (A)", async () => {
      // Dado último selado no fim da ordem, sem aberta
      const programa = makeProgram({ id: "p-1" });
      const treinos = treinosABC();
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);
      vi.mocked(findOpenExecutionByProgramStandalone).mockResolvedValue(null);
      vi.mocked(findLastSealedExecutionByProgramStandalone).mockResolvedValue(
        makeSelada("w-3"),
      );

      // Quando o hook resolve
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então há giro contínuo (volta ao primeiro) — e a volta vem do
      // histórico consultado, não da seleção fixa do primeiro por criação
      expect(findOpenExecutionByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(findLastSealedExecutionByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(result.current.selectedWorkoutId).toBe("w-1");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Sem histórico (D4)
  // -------------------------------------------------------------------------
  describe("3. Programa ativo sem histórico (D4)", () => {
    it("Dado programa ativo sem aberta nem selada, exibe o primeiro da ordem atual após consultar aberta e selada", async () => {
      // Dado programa ativo com treinos e nenhum histórico
      const programa = makeProgram({ id: "p-1" });
      const treinos = treinosABC();
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);
      vi.mocked(findOpenExecutionByProgramStandalone).mockResolvedValue(null);
      vi.mocked(findLastSealedExecutionByProgramStandalone).mockResolvedValue(null);

      // Quando o hook resolve
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então o primeiro da ordem — decidido após consultar aberta e selada
      expect(findOpenExecutionByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(findLastSealedExecutionByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(result.current.selectedWorkoutId).toBe("w-1");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Ficha nova (D5a — histórico de outro programa nunca atravessa)
  // -------------------------------------------------------------------------
  describe("4. Ficha nova com programa novo ativo (D5a)", () => {
    it("Dado programa novo ativo, exibe o primeiro do novo programa consultando aberta e selada do novo programa", async () => {
      // Dado programa novo p-2 ativo (ficha nova) com treinos próprios
      const programaNovo = makeProgram({ id: "p-2", title: "Ficha B" });
      const treinosNovos = [
        makeWorkout({ id: "w-4", programId: "p-2", name: "Treino D" }),
        makeWorkout({
          id: "w-5",
          programId: "p-2",
          name: "Treino E",
          createdAt: "2026-10-01T11:00:00.000Z",
        }),
      ];
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programaNovo);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinosNovos);
      vi.mocked(findOpenExecutionByProgramStandalone).mockResolvedValue(null);
      vi.mocked(findLastSealedExecutionByProgramStandalone).mockResolvedValue(null);

      // Quando o hook resolve
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então o primeiro do NOVO programa, com as consultas escopadas nele
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledWith("p-2");
      expect(findOpenExecutionByProgramStandalone).toHaveBeenCalledWith("p-2");
      expect(findLastSealedExecutionByProgramStandalone).toHaveBeenCalledWith("p-2");
      expect(result.current.program).toEqual(programaNovo);
      expect(result.current.selectedWorkoutId).toBe("w-4");
    });
  });

  // -------------------------------------------------------------------------
  // 5. Troca manual restrita após abertura automática (D8)
  // -------------------------------------------------------------------------
  describe("5. Troca manual para consulta (D8)", () => {
    it("Dada abertura automática pelo histórico, a troca manual entre treinos do programa vale e id fora da lista é ignorado", async () => {
      // Dado programa ativo com selado em A (automático = B), sem aberta
      const programa = makeProgram({ id: "p-1" });
      const treinos = treinosABC();
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);
      vi.mocked(findOpenExecutionByProgramStandalone).mockResolvedValue(null);
      vi.mocked(findLastSealedExecutionByProgramStandalone).mockResolvedValue(
        makeSelada("w-1"),
      );

      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então a abertura automática veio do histórico (B, não o primeiro fixo)
      expect(result.current.selectedWorkoutId).toBe("w-2");

      // Quando troca para outro treino do mesmo programa (consulta)
      act(() => {
        result.current.selectWorkout("w-3");
      });

      // Então troca sem erro e sem recarga
      expect(result.current.selectedWorkoutId).toBe("w-3");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);

      // Quando tenta id de outro programa
      act(() => {
        result.current.selectWorkout("w-de-outro-programa");
      });

      // Então mantém o atual, sem erro
      expect(result.current.selectedWorkoutId).toBe("w-3");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Erro de carga com retry repetindo a cadeia inteira
  // -------------------------------------------------------------------------
  describe("6. Erro de carga (origem 'carga') e retry", () => {
    it("Dada falha na consulta da aberta, exibe erro de carga; o retry repete a cadeia e resolve pelo histórico", async () => {
      // Dado que a consulta da aberta REJEITA na montagem e resolve no retry
      const programa = makeProgram({ id: "p-1" });
      const treinos = treinosABC();
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);
      vi.mocked(findOpenExecutionByProgramStandalone)
        .mockRejectedValueOnce(new Error("falha na aberta"))
        .mockResolvedValue(null);
      vi.mocked(findLastSealedExecutionByProgramStandalone).mockResolvedValue(
        makeSelada("w-2"),
      );

      // Quando o hook monta sob falha
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então erro de carga com origem `carga` (AsyncState com retry)
      expect(result.current.errorMsg).not.toBeNull();
      expect(result.current.errorMsg as string).toContain("falha na aberta");
      expect(result.current.errorOrigin).toBe("carga");
      expect(result.current.selectedWorkoutId).toBeNull();

      // Quando aciona o retry
      await act(async () => {
        await result.current.retry();
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então repete a cadeia inteira (aberta de novo + selada) e resolve C
      expect(findOpenExecutionByProgramStandalone).toHaveBeenCalledTimes(2);
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.selectedWorkoutId).toBe("w-3");
    });
  });
});
