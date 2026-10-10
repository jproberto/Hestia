/**
 * Contrato RED — Mílon #5 (TASK-003): `lib/milon/hooks/useWorkoutExecution.ts`
 * + regras puras `contarMarcadasNaExecucao` / `ehUltimaMarcada`.
 *
 * Fonte da verdade: `.agents/modules/milon/05-execucao-series/spec.md`
 * (§3 toque curto marca/desmarca, última abre confirmação, salvar replica
 * sempre origem + seguintes, início gravado na primeira marcação) +
 * `plan.md` §2 (hook novo `useWorkoutExecution`, autossuficiente por
 * workoutId, promise-chain + flag cancelled, standalones via barrels) +
 * §3 (contrato do hook: execution anulável, doneSeriesIds, markedCount,
 * toggleSeries por entrada e série, saveSeriesExecution por entrada/série/
 * campos sem indicador de cópia, clearConfirmOpen, confirmClearExecution,
 * cancelClearExecution, erros com origem operacao + relançamento, aviso breve
 * de sucesso) + `tasks.json` TASK-003 (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/hooks/useWorkoutExecution` ainda não existe — Expected: FAIL
 * com "módulo não encontrado" (acceptanceCriteria 1 da TASK-003). Hefesto
 * fará GREEN (TASK-004) apenas com o contrato descrito no plano — sem
 * inventar APIs.
 *
 * Padrão espelhado de `__tests__/lib/milon/hooks/useWorkoutDetail.test.ts`
 * + `useTodayWorkout.test.ts`: `vi.mock` dos barrels `db/workouts`
 * (findWorkoutById + updateSeriesFields + applySeriesToFollowing) e
 * `db/executions` (as 6 operações + standalones), promise-chain + flag
 * `cancelled` no hook, `waitFor` para a carga e `executar` (act tolerante a
 * relançamento) para as operações. E-mail da sessão = mock global de
 * `__tests__/setup.ts` ("teste@hestia.com").
 *
 * CONTRATO CONSUMIDO (plan.md §3 — hook novo):
 * - retorno: `{ execution, doneSeriesIds, markedCount, toggleSeries,
 *   saveSeriesExecution, clearConfirmOpen, confirmClearExecution,
 *   cancelClearExecution, loading, errorMsg, errorOrigin, successNotice,
 *   retry }`;
 * - montagem: `findWorkoutByIdStandalone(workoutId)` resolve o programa,
 *   `findOpenExecutionByWorkoutStandalone` busca a aberta, `listDone…`
 *   lista as realizadas; sem aberta → execution null + zero marcadas;
 * - toggle em desmarcada: abre a execução quando inexistente (início gravado
 *   uma vez, sem sobrescrever início existente) e marca com retrato dos
 *   valores atuais do template; segunda marcação preserva o início original;
 * - toggle em marcada com restantes: desmarca na hora, sem confirmação;
 * - toggle na última marcada: remove a realizada da série clicada (ela já
 *   aparece desmarcada) e abre `clearConfirmOpen` SEM excluir a execução;
 * - confirmar: exclui a execução aberta (início desaparece) e recarrega;
 * - cancelar: só fecha a pergunta, mantendo execução + início + zero marcadas;
 * - salvar: sempre atualiza a origem no template e replica nas seguintes
 *   (origem + posição maior, incluindo marcadas), sem tocar em feito/
 *   execução/retratos; na última série atualiza somente a origem por não
 *   haver seguinte; série editada mantém marcada/desmarcada;
 * - salvar NÃO tem indicador de cópia (replicação incondicional, D4);
 * - falhas alimentam o banner com origem `operacao` e RELANÇAM;
 * - sucesso dispara o aviso breve padrão do módulo;
 * - recarrega do banco após cada operação; retry repete a cadeia.
 *
 * NOTA (Minos → Zeus): o estado do editor (série em edição, abrir/fechar)
 * pertence à `WorkoutDetailSection` por plan.md §2 Modify — NÃO ao hook.
 * Por isso nenhum teste exige `seriesEditId`/`openSeriesEditor` aqui; se o
 * hook expuser esses nomes, a seção os ignora. A delegação citou esses nomes
 * como "contratos do hook", mas o plano textual + TASK-003 valem como fonte.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWorkoutExecution } from "@/lib/milon/hooks/useWorkoutExecution";
import * as hooksIndex from "@/lib/milon/hooks";
import {
  findWorkoutByIdStandalone,
  updateSeriesFieldsStandalone,
  applySeriesToFollowingStandalone,
} from "@/lib/milon/db/workouts";
import {
  findOpenExecutionByWorkoutStandalone,
  startExecutionStandalone,
  clearExecutionStandalone,
  listDoneByExecutionStandalone,
  markSeriesDoneStandalone,
  unmarkSeriesStandalone,
} from "@/lib/milon/db/executions";
import type { UpdateSeriesFieldsInput } from "@/lib/milon/repositories/interfaces";
import type {
  Exercise,
  Workout,
  WorkoutEntry,
  WorkoutEntryView,
  WorkoutExecution,
  WorkoutExecutionSeries,
  WorkoutSeries,
} from "@/lib/milon/types";

// Barrels mockados no padrão dos testes de hook do projeto: o factory cobre
// TODOS os exports do barrel real (forma com `db` + standalones), para o
// import do hook não quebrar.
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
  applySeriesToFollowing: vi.fn(),
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
  applySeriesToFollowingStandalone: vi.fn(),
}));

vi.mock("@/lib/milon/db/executions", () => ({
  findOpenExecutionByWorkout: vi.fn(),
  startExecution: vi.fn(),
  clearExecution: vi.fn(),
  listDoneByExecution: vi.fn(),
  markSeriesDone: vi.fn(),
  unmarkSeries: vi.fn(),
  findOpenExecutionByWorkoutStandalone: vi.fn(),
  startExecutionStandalone: vi.fn(),
  clearExecutionStandalone: vi.fn(),
  listDoneByExecutionStandalone: vi.fn(),
  markSeriesDoneStandalone: vi.fn(),
  unmarkSeriesStandalone: vi.fn(),
}));

// getEmail() do client mockado globalmente em __tests__/setup.ts (task 49).
const EMAIL = "teste@hestia.com";
const WORKOUT_ID = "w-1";
const PROGRAM_ID = "p-1";

// ---------------------------------------------------------------------------
// Factories com defaults (espelham `lib/milon/types.ts` — fonte única; nunca
// reimplementam regra de produção — só constroem dados e observam)
// ---------------------------------------------------------------------------
function makeWorkout(overrides: Partial<Workout> & { id: string }): Workout {
  return {
    programId: PROGRAM_ID,
    name: "Treino A",
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<WorkoutEntry> & { id: string }): WorkoutEntry {
  return {
    workoutId: WORKOUT_ID,
    programId: PROGRAM_ID,
    exerciseId: "ex-1",
    position: 1,
    restSeconds: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

function makeSerie(overrides: Partial<WorkoutSeries> & { id: string }): WorkoutSeries {
  return {
    entryId: "ent-1",
    position: 1,
    value: 10,
    load: 40,
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: null,
    loadUnit: "kg",
    deletedAt: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

function makeView(overrides: Partial<WorkoutEntryView> = {}): WorkoutEntryView {
  return {
    entry: makeEntry({ id: "ent-1" }),
    exercise: makeExercise(),
    series: [
      makeSerie({ id: "s-1", entryId: "ent-1", position: 1, value: 10, load: 40 }),
    ],
    ...overrides,
  };
}

// REMOÇÃO da foto (RED da remoção): helper de snapshot excluído. A foto
// (snapshot + frozenEntries) saiu da spec alinhada — o Treino do Dia exibe o
// template ao vivo com marcadores de feito; valores reais ficam p/ #7.

const INICIO_ORIGINAL = "2026-10-08T10:00:00.000Z";

function makeExecution(overrides: Partial<WorkoutExecution> = {}): WorkoutExecution {
  return {
    id: "exec-1",
    workoutId: WORKOUT_ID,
    programId: PROGRAM_ID,
    startedAt: INICIO_ORIGINAL,
    finishedAt: null,
    createdAt: INICIO_ORIGINAL,
    created_by: EMAIL,
    ...overrides,
  };
}

function makeDone(
  overrides: Partial<WorkoutExecutionSeries> & { seriesId: string },
): WorkoutExecutionSeries {
  return {
    id: `done-${overrides.seriesId}`,
    executionId: "exec-1",
    entryId: "ent-1",
    position: 1,
    value: 10,
    load: 40,
    createdAt: "2026-10-08T10:01:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Banco simulado em memória (o hook recarrega do banco após cada operação —
// os standalones mockados leem/escrevem nestas variáveis, como o banco real)
// ---------------------------------------------------------------------------
interface BancoSimulado {
  execution: WorkoutExecution | null;
  dones: WorkoutExecutionSeries[];
}

function instalarBanco(sim: BancoSimulado): void {
  vi.mocked(findWorkoutByIdStandalone).mockImplementation(async (id: string) =>
    id === WORKOUT_ID ? makeWorkout({ id: WORKOUT_ID }) : null,
  );
  vi.mocked(findOpenExecutionByWorkoutStandalone).mockImplementation(
    async () => sim.execution,
  );
  vi.mocked(listDoneByExecutionStandalone).mockImplementation(async () => [
    ...sim.dones,
  ]);
  vi.mocked(startExecutionStandalone).mockImplementation(
    async (workoutId: string, programId: string) => {
      if (sim.execution) return sim.execution;
      const nova = makeExecution({
        id: "exec-1",
        workoutId,
        programId,
        startedAt: INICIO_ORIGINAL,
      });
      sim.execution = nova;
      return nova;
    },
  );
  vi.mocked(markSeriesDoneStandalone).mockImplementation(
    async (input, _email: string) => {
      const existente = sim.dones.find((d) => d.seriesId === input.seriesId);
      if (existente) return existente;
      const nova = makeDone({
        executionId: input.executionId,
        entryId: input.entryId,
        seriesId: input.seriesId,
        position: input.position,
        value: input.value,
        load: input.load,
      });
      sim.dones.push(nova);
      return nova;
    },
  );
  vi.mocked(unmarkSeriesStandalone).mockImplementation(
    async (_executionId: string, seriesId: string) => {
      sim.dones = sim.dones.filter((d) => d.seriesId !== seriesId);
    },
  );
  vi.mocked(clearExecutionStandalone).mockImplementation(
    async (_executionId: string) => {
      sim.execution = null;
      sim.dones = [];
    },
  );
  vi.mocked(updateSeriesFieldsStandalone).mockImplementation(
    async (seriesId: string, fields: UpdateSeriesFieldsInput) => {
      return makeSerie({
        id: seriesId,
        value: fields.value ?? null,
        load: fields.load ?? null,
      });
    },
  );
  vi.mocked(applySeriesToFollowingStandalone).mockImplementation(
    async () => [],
  );
}

/**
 * Executa operação do hook DENTRO de `await act(async () => ...)`, espelhando
 * `useWorkoutDetail.test.ts`: não depende de a operação relançar ou não.
 */
async function executar(operacao: () => unknown): Promise<void> {
  await act(async () => {
    try {
      await operacao();
    } catch {
      // Falha capturada de propósito — ver asserções de errorMsg/recarga.
    }
  });
}

const mocksDoArquivo = [
  findWorkoutByIdStandalone,
  findOpenExecutionByWorkoutStandalone,
  startExecutionStandalone,
  clearExecutionStandalone,
  listDoneByExecutionStandalone,
  markSeriesDoneStandalone,
  unmarkSeriesStandalone,
  updateSeriesFieldsStandalone,
  applySeriesToFollowingStandalone,
];

// ---------------------------------------------------------------------------

describe("Mílon #5 — useWorkoutExecution (contrato RED, TASK-003)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of mocksDoArquivo) {
      vi.mocked(mock).mockReset();
    }
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. Contrato do retorno + estado inicial sem execução aberta
  // -------------------------------------------------------------------------
  describe("1. Contrato do retorno e estado inicial", () => {
    it("expõe execution/doneSeriesIds/markedCount/toggleSeries/saveSeriesExecution/clearConfirmOpen/confirmClearExecution/cancelClearExecution/loading/errorMsg/errorOrigin/successNotice/retry", async () => {
      const sim: BancoSimulado = { execution: null, dones: [] };
      instalarBanco(sim);

      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.execution).toBeNull();
      expect(result.current.doneSeriesIds).toEqual([]);
      expect(result.current.markedCount).toBe(0);
      expect(result.current.clearConfirmOpen).toBe(false);
      expect(typeof result.current.toggleSeries).toBe("function");
      expect(typeof result.current.saveSeriesExecution).toBe("function");
      expect(typeof result.current.confirmClearExecution).toBe("function");
      expect(typeof result.current.cancelClearExecution).toBe("function");
      expect(typeof result.current.retry).toBe("function");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
      expect(findWorkoutByIdStandalone).toHaveBeenCalledWith(WORKOUT_ID);
      expect(findOpenExecutionByWorkoutStandalone).toHaveBeenCalledWith(
        WORKOUT_ID,
      );
    });

    it("com execução aberta existente, expõe o início e as marcadas recarregadas do banco", async () => {
      const aberta = makeExecution();
      const sim: BancoSimulado = {
        execution: aberta,
        dones: [makeDone({ seriesId: "s-1" }), makeDone({ seriesId: "s-2" })],
      };
      instalarBanco(sim);

      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.execution?.id).toBe("exec-1");
      expect(result.current.execution?.startedAt).toBe(INICIO_ORIGINAL);
      expect(result.current.execution?.finishedAt).toBeNull();
      expect([...result.current.doneSeriesIds].sort()).toEqual(["s-1", "s-2"]);
      expect(result.current.markedCount).toBe(2);
      expect(result.current.clearConfirmOpen).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Primeira marcação abre a execução com início + retrato do template
  // -------------------------------------------------------------------------
  describe("2. Primeira marcação (abre execução com início)", () => {
    it("Dada nenhuma execução, Quando alterno uma série desmarcada, Então abre a execução com início e marca com retrato dos valores do template", async () => {
      const sim: BancoSimulado = { execution: null, dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const entry = makeEntry({ id: "ent-1" });
      const serie = makeSerie({ id: "s-1", entryId: "ent-1", position: 1, value: 12, load: 50 });

      await executar(() => result.current.toggleSeries(entry, serie));

      await waitFor(() => expect(result.current.markedCount).toBe(1));
      // Execução aberta com início gravado uma vez.
      expect(result.current.execution).not.toBeNull();
      expect(result.current.execution?.startedAt).toBe(INICIO_ORIGINAL);
      expect(startExecutionStandalone).toHaveBeenCalledWith(
        WORKOUT_ID,
        PROGRAM_ID,
        EMAIL,
      );
      // Retrato dos valores ATUAIS do template na marcação.
      expect(markSeriesDoneStandalone).toHaveBeenCalledWith(
        expect.objectContaining({
          entryId: "ent-1",
          seriesId: "s-1",
          position: 1,
          value: 12,
          load: 50,
        }),
        EMAIL,
      );
      expect(result.current.doneSeriesIds).toContain("s-1");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      // Recarrega do banco após a operação (lista consultada de novo).
      expect(vi.mocked(listDoneByExecutionStandalone).mock.calls.length).toBeGreaterThan(1);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Segunda marcação preserva o início original
  // -------------------------------------------------------------------------
  describe("3. Segunda marcação (preserva o início)", () => {
    it("Dada execução aberta com uma marcada, Quando marco outra série, Então o início original é preservado", async () => {
      const aberta = makeExecution({ startedAt: INICIO_ORIGINAL });
      const sim: BancoSimulado = {
        execution: aberta,
        dones: [makeDone({ seriesId: "s-1" })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.markedCount).toBe(1);

      const entry = makeEntry({ id: "ent-1" });
      await executar(() =>
        result.current.toggleSeries(entry, makeSerie({ id: "s-2", entryId: "ent-1", position: 2, value: 10, load: 40 })),
      );

      await waitFor(() => expect(result.current.markedCount).toBe(2));
      // Abertura idempotente: reusou a existente sem trocar o início.
      expect(result.current.execution?.id).toBe("exec-1");
      expect(result.current.execution?.startedAt).toBe(INICIO_ORIGINAL);
      expect([...result.current.doneSeriesIds].sort()).toEqual(["s-1", "s-2"]);
      expect(startExecutionStandalone).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Desmarque com restantes: imediato, sem confirmação
  // -------------------------------------------------------------------------
  describe("4. Desmarque com restantes (imediato, sem confirmação)", () => {
    it("Dada série marcada com outras restantes, Quando alterno, Então remove só a realizada na hora sem abrir confirmação", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-1" }), makeDone({ seriesId: "s-2" })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.markedCount).toBe(2);

      const entry = makeEntry({ id: "ent-1" });
      await executar(() =>
        result.current.toggleSeries(entry, makeSerie({ id: "s-1", entryId: "ent-1" })),
      );

      await waitFor(() => expect(result.current.markedCount).toBe(1));
      expect(unmarkSeriesStandalone).toHaveBeenCalledWith("exec-1", "s-1");
      expect(result.current.doneSeriesIds).toEqual(["s-2"]);
      // Sem confirmação: a pergunta segue fechada e a execução segue aberta.
      expect(result.current.clearConfirmOpen).toBe(false);
      expect(result.current.execution).not.toBeNull();
      expect(clearExecutionStandalone).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 5. Desmarque da última: remove a realizada e abre confirmação sem excluir
  // -------------------------------------------------------------------------
  describe("5. Desmarque da última (abre confirmação sem excluir)", () => {
    it("Dada só uma série marcada, Quando desmarco a última, Então ela desmarca na hora e abre a pergunta sem excluir a execução", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-1" })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.markedCount).toBe(1);

      const entry = makeEntry({ id: "ent-1" });
      await executar(() =>
        result.current.toggleSeries(entry, makeSerie({ id: "s-1", entryId: "ent-1" })),
      );

      await waitFor(() => expect(result.current.clearConfirmOpen).toBe(true));
      // A série clicada já aparece desmarcada antes de qualquer pergunta.
      expect(result.current.doneSeriesIds).toEqual([]);
      expect(result.current.markedCount).toBe(0);
      expect(unmarkSeriesStandalone).toHaveBeenCalledWith("exec-1", "s-1");
      // A pergunta decide só sobre a linha de execução: nada excluído ainda.
      expect(clearExecutionStandalone).not.toHaveBeenCalled();
      expect(result.current.execution).not.toBeNull();
      expect(result.current.execution?.startedAt).toBe(INICIO_ORIGINAL);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Confirmar exclui a execução e zera tudo
  // -------------------------------------------------------------------------
  describe("6. Confirmar limpeza (exclui a execução)", () => {
    it("Dada a pergunta aberta, Quando confirmo, Então exclui a execução aberta e o início desaparece com zero marcadas", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-1" })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const entry = makeEntry({ id: "ent-1" });
      await executar(() =>
        result.current.toggleSeries(entry, makeSerie({ id: "s-1", entryId: "ent-1" })),
      );
      await waitFor(() => expect(result.current.clearConfirmOpen).toBe(true));

      await executar(() => result.current.confirmClearExecution());

      await waitFor(() => expect(result.current.clearConfirmOpen).toBe(false));
      expect(clearExecutionStandalone).toHaveBeenCalledWith("exec-1");
      expect(result.current.execution).toBeNull();
      expect(result.current.doneSeriesIds).toEqual([]);
      expect(result.current.markedCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Cancelar mantém execução com início e zero marcadas
  // -------------------------------------------------------------------------
  describe("7. Cancelar limpeza (mantém execução com início e zero marcadas)", () => {
    it("Dada a pergunta aberta, Quando cancelo, Então fecha a pergunta mantendo execução aberta com início original e zero marcadas", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-1" })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const entry = makeEntry({ id: "ent-1" });
      await executar(() =>
        result.current.toggleSeries(entry, makeSerie({ id: "s-1", entryId: "ent-1" })),
      );
      await waitFor(() => expect(result.current.clearConfirmOpen).toBe(true));

      act(() => {
        result.current.cancelClearExecution();
      });

      expect(result.current.clearConfirmOpen).toBe(false);
      // Cancelar mantém a série DESMARCADA (divergência corrigida da spec),
      // com o início preservado e nenhuma marcada.
      expect(clearExecutionStandalone).not.toHaveBeenCalled();
      expect(result.current.execution).not.toBeNull();
      expect(result.current.execution?.startedAt).toBe(INICIO_ORIGINAL);
      expect(result.current.doneSeriesIds).toEqual([]);
      expect(result.current.markedCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Salvar replica sempre origem + seguintes (incluindo marcadas)
  // -------------------------------------------------------------------------
  describe("8. Salvar com replicação incondicional (sem opção de cópia)", () => {
    it("Dado o modal com campos, Quando salvo, Então atualiza a origem e replica nas seguintes incluindo marcadas, preservando o feito", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-2", position: 2 })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const entry = makeEntry({ id: "ent-1" });
      const origem = makeSerie({ id: "s-1", entryId: "ent-1", position: 1 });
      const campos: UpdateSeriesFieldsInput = { value: 15, load: 60 };

      await executar(() => result.current.saveSeriesExecution(entry, origem, campos));

      // Sem indicador de cópia: a chamada recebe SOMENTE os campos.
      expect(updateSeriesFieldsStandalone).toHaveBeenCalledWith("s-1", {
        value: 15,
        load: 60,
      });
      // Replicação incondicional: origem + posição maior, incluindo marcadas.
      expect(applySeriesToFollowingStandalone).toHaveBeenCalledWith(
        "ent-1",
        "s-1",
      );
      // Feito, execução e retratos nunca são tocados pelo salvar.
      expect(markSeriesDoneStandalone).not.toHaveBeenCalled();
      expect(unmarkSeriesStandalone).not.toHaveBeenCalled();
      expect(clearExecutionStandalone).not.toHaveBeenCalled();
      expect(result.current.doneSeriesIds).toEqual(["s-2"]);
      expect(result.current.markedCount).toBe(1);
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("Salvar na última série da entrada atualiza somente a origem por não haver seguinte (mas ainda chama a replicação)", async () => {
      const sim: BancoSimulado = { execution: makeExecution(), dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const entry = makeEntry({ id: "ent-1" });
      const ultima = makeSerie({ id: "s-9", entryId: "ent-1", position: 9 });

      await executar(() =>
        result.current.saveSeriesExecution(entry, ultima, { value: 8 }),
      );

      expect(updateSeriesFieldsStandalone).toHaveBeenCalledWith("s-9", {
        value: 8,
      });
      // O comportamento único vale para todo salvamento: a replicação é
      // chamada mesmo na última (o repository não encontra seguinte e só a
      // origem muda — plan.md §3).
      expect(applySeriesToFollowingStandalone).toHaveBeenCalledWith(
        "ent-1",
        "s-9",
      );
      expect(result.current.doneSeriesIds).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Série editada mantém o estado (marcada segue marcada, etc.)
  // -------------------------------------------------------------------------
  describe("9. Série editada mantém o estado de marcada/desmarcada", () => {
    it("Série marcada segue marcada após editar e salvar", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-1" })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.doneSeriesIds).toContain("s-1");

await executar(() =>
        result.current.saveSeriesExecution(
          makeEntry({ id: "ent-1" }),
          makeSerie({ id: "s-1", entryId: "ent-1", position: 1 }),
          { value: 20 },
        ),
      );

      expect(result.current.doneSeriesIds).toContain("s-1");
      expect(result.current.markedCount).toBe(1);
    });

    it("Série desmarcada segue desmarcada após editar e salvar", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-2", position: 2 })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.doneSeriesIds).not.toContain("s-1");

      await executar(() =>
        result.current.saveSeriesExecution(
          makeEntry({ id: "ent-1" }),
          makeSerie({ id: "s-1", entryId: "ent-1", position: 1 }),
          { value: 20 },
        ),
      );

      expect(result.current.doneSeriesIds).not.toContain("s-1");
      expect(result.current.doneSeriesIds).toContain("s-2");
    });
  });

  // -------------------------------------------------------------------------
  // 10. Erros alimentam o banner com origem operacao e relançam
  // -------------------------------------------------------------------------
  describe("10. Erros (banner com origem operacao + relançamento)", () => {
    it("falha ao alternar alimenta o banner com origem operacao e relança para o chamador", async () => {
      const sim: BancoSimulado = { execution: null, dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      vi.mocked(startExecutionStandalone).mockRejectedValueOnce(
        new Error("falha ao abrir execução"),
      );

      await act(async () => {
        await expect(
          result.current.toggleSeries(
            makeEntry({ id: "ent-1" }),
            makeSerie({ id: "s-1", entryId: "ent-1" }),
          ),
        ).rejects.toThrow("falha ao abrir execução");
      });

      expect(result.current.errorMsg).toContain("falha ao abrir execução");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(result.current.markedCount).toBe(0);
    });

    it("falha ao salvar alimenta o banner com origem operacao e relança", async () => {
      const sim: BancoSimulado = { execution: makeExecution(), dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      vi.mocked(updateSeriesFieldsStandalone).mockRejectedValueOnce(
        new Error("falha ao salvar série"),
      );

      await act(async () => {
        await expect(
          result.current.saveSeriesExecution(
            makeEntry({ id: "ent-1" }),
            makeSerie({ id: "s-1", entryId: "ent-1" }),
            { value: 9 },
          ),
        ).rejects.toThrow("falha ao salvar série");
      });

      expect(result.current.errorMsg).toContain("falha ao salvar série");
      expect(result.current.errorOrigin).toBe("operacao");
    });

    it("falha ao confirmar a limpeza alimenta o banner com origem operacao, relança e mantém a pergunta aberta", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-1" })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const entry = makeEntry({ id: "ent-1" });
      await executar(() =>
        result.current.toggleSeries(entry, makeSerie({ id: "s-1", entryId: "ent-1" })),
      );
      await waitFor(() => expect(result.current.clearConfirmOpen).toBe(true));

      vi.mocked(clearExecutionStandalone).mockRejectedValueOnce(
        new Error("falha ao limpar execução"),
      );

      await act(async () => {
        await expect(result.current.confirmClearExecution()).rejects.toThrow(
          "falha ao limpar execução",
        );
      });

      expect(result.current.errorMsg).toContain("falha ao limpar execução");
      expect(result.current.errorOrigin).toBe("operacao");
      // A confirmação permanece aberta no erro (plan.md §3).
      expect(result.current.clearConfirmOpen).toBe(true);
      expect(result.current.execution).not.toBeNull();
    });

    it("erro de carga inicial grava origem carga e o retry recarrega a cadeia", async () => {
      const sim: BancoSimulado = { execution: null, dones: [] };
      instalarBanco(sim);
      vi.mocked(findOpenExecutionByWorkoutStandalone).mockRejectedValueOnce(
        new Error("falha de rede"),
      );

      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.errorMsg).toContain("falha de rede");
      expect(result.current.errorOrigin).toBe("carga");

      await executar(() => result.current.retry());

      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.doneSeriesIds).toEqual([]);
    });
  });

  it("hooks/index exporta useWorkoutExecution como caminho oficial", () => {
    expect(typeof (hooksIndex as Record<string, unknown>).useWorkoutExecution).toBe(
      "function",
    );
  });

  // -------------------------------------------------------------------------
  // 11. Sem banner de sucesso na execução (correção humana 2026-10-08 — RED)
  // -------------------------------------------------------------------------
  // Verdade humana: NESTA tela (Treino do Dia em execução) NÃO há
  // banner/aviso de confirmação a cada alteração ou marcar/desmarcar —
  // o card já é o feedback; banner de ERRO mantido (origem operacao).
  // Por isso toggle/save/confirm em execução NÃO exibem successNotice.
  // Expected: FAIL — a produção ainda chama flashSuccess e acende o aviso.
  // Hefesto fará GREEN removendo o flash de sucesso sem tocar no erro.
  describe("11. Sem banner de sucesso na execução (correção humana — RED)", () => {
    it("marcar a primeira série NÃO acende successNotice (o card já é o feedback)", async () => {
      const sim: BancoSimulado = { execution: null, dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() =>
        result.current.toggleSeries(
          makeEntry({ id: "ent-1" }),
          makeSerie({ id: "s-1", entryId: "ent-1", position: 1 }),
        ),
      );

      await waitFor(() => expect(result.current.markedCount).toBe(1));
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
    });

    it("desmarcar com restantes NÃO acende successNotice", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-1" }), makeDone({ seriesId: "s-2" })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() =>
        result.current.toggleSeries(
          makeEntry({ id: "ent-1" }),
          makeSerie({ id: "s-1", entryId: "ent-1" }),
        ),
      );

      await waitFor(() => expect(result.current.markedCount).toBe(1));
      expect(result.current.clearConfirmOpen).toBe(false);
      expect(result.current.successNotice).toBeNull();
    });

    it("salvar a série NÃO acende successNotice (modal fecha, card atualiza, sem banner)", async () => {
      const sim: BancoSimulado = { execution: makeExecution(), dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() =>
        result.current.saveSeriesExecution(
          makeEntry({ id: "ent-1" }),
          makeSerie({ id: "s-1", entryId: "ent-1", position: 1 }),
          { value: 15, load: 60 },
        ),
      );

      expect(updateSeriesFieldsStandalone).toHaveBeenCalledWith("s-1", {
        value: 15,
        load: 60,
      });
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
    });

    it("confirmar a limpeza NÃO acende successNotice", async () => {
      const sim: BancoSimulado = {
        execution: makeExecution(),
        dones: [makeDone({ seriesId: "s-1" })],
      };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() =>
        result.current.toggleSeries(
          makeEntry({ id: "ent-1" }),
          makeSerie({ id: "s-1", entryId: "ent-1" }),
        ),
      );
      await waitFor(() => expect(result.current.clearConfirmOpen).toBe(true));

      await executar(() => result.current.confirmClearExecution());

      await waitFor(() => expect(result.current.clearConfirmOpen).toBe(false));
      expect(result.current.execution).toBeNull();
      expect(result.current.successNotice).toBeNull();
    });

    it("trava: falha ao alternar mantém successNotice nulo e alimenta o banner de erro com origem operacao", async () => {
      const sim: BancoSimulado = { execution: null, dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      vi.mocked(startExecutionStandalone).mockRejectedValueOnce(
        new Error("falha ao abrir execução"),
      );

      await act(async () => {
        await expect(
          result.current.toggleSeries(
            makeEntry({ id: "ent-1" }),
            makeSerie({ id: "s-1", entryId: "ent-1" }),
          ),
        ).rejects.toThrow("falha ao abrir execução");
      });

      expect(result.current.errorMsg).toContain("falha ao abrir execução");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(result.current.successNotice).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 12. REMOÇÃO da foto — template ao vivo + feito (RED da remoção)
  // -------------------------------------------------------------------------
  // Verdade alinhada (spec §3: Treino do Dia exibe o template ao vivo com
  // marcadores de feito por série — o que se vê é sempre o valor atual do
  // template; §4 YAGNI: foto/valores reais ficam p/ #7): o hook NÃO tira foto,
  // NÃO expõe frozenEntries e NÃO chama setExecutionSnapshot; a primeira
  // marcação é startExecution → markSeriesDone; a edição atualiza o template
  // e aparece na hora (display ao vivo).
  //
  // Expected: FAIL enquanto o hook ainda tira foto/expõe frozenEntries.
  // Hefesto fará GREEN removendo a foto sem mudar estes testes.
  describe("12. Sem foto — template ao vivo + feito (remoção — RED)", () => {
    it("não expõe frozenEntries no retorno (só template ao vivo + feito)", async () => {
      const sim: BancoSimulado = { execution: null, dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(
        (result.current as unknown as Record<string, unknown>).frozenEntries,
      ).toBeUndefined();
      expect(result.current.execution).toBeNull();
      expect(result.current.doneSeriesIds).toEqual([]);
    });

    it("primeira marcação NÃO tira foto: startExecution → markSeriesDone sem setExecutionSnapshot", async () => {
      const sim: BancoSimulado = { execution: null, dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const entry = makeEntry({ id: "ent-1" });
      const serie = makeSerie({ id: "s-1", entryId: "ent-1" });

      await executar(() => result.current.toggleSeries(entry, serie));

      await waitFor(() => expect(result.current.markedCount).toBe(1));
      expect(startExecutionStandalone).toHaveBeenCalledTimes(1);
      expect(markSeriesDoneStandalone).toHaveBeenCalledTimes(1);
      expect(
        (result.current.execution as unknown as Record<string, unknown> | null)?.snapshot,
      ).toBeUndefined();
      expect("snapshot" in (result.current.execution as object)).toBe(false);
    });

    it("edição aparece na hora: salvar atualiza o template (origem + seguintes) sem foto", async () => {
      const sim: BancoSimulado = { execution: makeExecution(), dones: [] };
      instalarBanco(sim);
      const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() =>
        result.current.saveSeriesExecution(
          makeEntry({ id: "ent-1" }),
          makeSerie({ id: "s-1", entryId: "ent-1", position: 1 }),
          { value: 20 },
        ),
      );

      expect(updateSeriesFieldsStandalone).toHaveBeenCalledWith("s-1", {
        value: 20,
      });
      expect(applySeriesToFollowingStandalone).toHaveBeenCalledWith(
        "ent-1",
        "s-1",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Contrato RED da TASK-013 (Mílon #5, Aditamento 2026-10-10 "valor único") —
// consumido pela TASK-015 (escopo mínimo de tipos; cobertura plena do hook
// pertence à TASK-015 por arbitragem Zeus).
// Fonte: tasks.json TASK-013 + plan.md Aditamento 2026-10-10 §3 (marcação
// com valor único) + spec §3.
// Expected: FAIL (hook atual monta o retrato com reps/durationSeconds e
// ignora `value`).
// Convenção: `value` via cast na série — o tipo ainda não tem o campo (RED
// inclui os tipos); em runtime o objeto o carrega.
// ---------------------------------------------------------------------------

describe("Milon 05 TASK-013 RED — useWorkoutExecution com valor único (D34)", () => {
  it("primeira marcação monta o retrato com valor único (sem reps/durationSeconds)", async () => {
    const sim: BancoSimulado = { execution: null, dones: [] };
    instalarBanco(sim);
    const { result } = renderHook(() => useWorkoutExecution(WORKOUT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const entry = makeEntry({ id: "ent-1" });
    const serie = {
      ...makeSerie({
        id: "s-1",
        entryId: "ent-1",
        position: 1,
        load: 50,
      }),
      value: 12,
    } as unknown as Parameters<typeof result.current.toggleSeries>[1];

    await executar(() => result.current.toggleSeries(entry, serie));

    await waitFor(() => expect(result.current.markedCount).toBe(1));
    expect(markSeriesDoneStandalone).toHaveBeenCalledWith(
      expect.objectContaining({
        entryId: "ent-1",
        seriesId: "s-1",
        position: 1,
        value: 12,
        load: 50,
      }),
      EMAIL,
    );
  });
});




