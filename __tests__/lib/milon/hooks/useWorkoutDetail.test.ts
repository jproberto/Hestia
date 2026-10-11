/**
 * Contrato RED — Mílon #3 (TASK-007): `lib/milon/hooks/useWorkoutDetail.ts`.
 *
 * Fonte da verdade: `.agents/modules/milon/03-treinos-series/spec.md`
 * (§3 "Detalhe do treino": D14 unicidade de exercício por Programa, D10
 * unidade de carga escolhida uma única vez, D6 confirmações; §5 Critérios de
 * Aceite) + `plan.md` §3 (contrato textual do hook `useWorkoutDetail`) +
 * `tasks.json` TASK-007 (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/hooks/useWorkoutDetail` ainda não existe — Expected: FAIL
 * com "módulo não encontrado" (acceptanceCriteria 2 da TASK-007). Hefesto
 * fará GREEN apenas com o contrato descrito no plano — sem inventar APIs.
 *
 * Padrão espelhado de `__tests__/lib/milon/hooks/usePrograms.test.ts`,
 * `useExercises.test.ts` e do IRMÃO `useProgramWorkouts.test.ts` (mesma
 * task): `vi.mock` dos barrels `db/workouts`, `db/exercises` e `db/programs`
 * (o hook consome os três: entradas/séries, biblioteca e status do Programa),
 * promise-chain + flag `cancelled` no hook, `waitFor` para a carga e
 * `executar` (act tolerante a relançamento) para as operações de lista.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — retornos e regras):
 * - retorno: `{ workout, program, entries, exercises, workoutUsedExerciseIds,
 *   loading, errorMsg, errorOrigin, successNotice, retry, addExercise,
 *   removeEntry, reorderEntries, setQuantity, setRest, updateSeries,
 *   applyToAll, saveExercise, createExerciseAndAdd, setEntryMode,
 *   setEntryLoadUnit }` (TASK-010: confirmLoadUnit removido — unidade na
 *   biblioteca fora do caminho do treino, D33);
 * - cadeia de carga: `findWorkoutById` -> `findProgramById` (status/leitura)
 *   -> `listEntriesByProgram` (filtrada pelo treino para exibir; o conjunto
 *   completo do Programa alimenta `programUsedExerciseIds`, D14) ->
 *   `listSeriesByEntry` em `Promise.all` por entrada -> `listExercisesAll`
 *   (exercício soft-deleted usado no treino permanece visível) ->
 *   `listWorkoutsByProgram` (nome do treino); falha -> `errorOrigin: 'carga'`
 *   com `retry` recarregando;
 * - treino inexistente -> `workout` null SEM erro (não confundir "não
 *   existe" com "falha de rede") e sem descer a cadeia (programa/entradas
 *   não são buscados);
 * - operações de MODAL (`addExercise` com guarda D14, `saveExercise` com
 *   anti-duplicata da #1, `createExerciseAndAdd`) RELANÇAM o erro — a página
 *   mostra no modal e o modal permanece aberto (NÃO tocam em `errorMsg`);
 * - `removeEntry`/`reorderEntries`/`setQuantity`/`setRest`/`updateSeries`/
 *   `applyToAll`/`setEntryMode`/`setEntryLoadUnit` alimentam `errorMsg` da página
 *   (`'bloqueio'` para guarda de domínio, `'operacao'` para falha de
 *   gravação) e recarregam as entradas/séries em sucesso;
 * - `confirmLoadUnit` REMOVIDO (TASK-010, D33): `setEntryMode`/`setEntryLoadUnit`
 *   persistem modo/unidade NA ENTRY via standalones do barrel de treinos.
 *
 * Convenções fixadas aqui (não ditas literalmente pela spec; derivadas do
 * contrato do plano e do padrão do módulo — reportar a Zeus se o contrato
 * for outro):
 * - `programUsedExerciseIds` é um CONJUNTO (D14) — a asserção ordena os ids
 *   antes de comparar, para não amarrar a ordem de entrega (ordem de
 *   primeira aparição é o caso natural, mas a regra é unicidade);
 * - `entries` só contém as entradas DO TREINO aberto (as do Programa nos
 *   demais treinos alimentam apenas `programUsedExerciseIds`);
 * - 'bloqueio' no detalhe é exercitado pela guarda do próprio repositório em
 *   `reorderEntries` ("A ordem informada não corresponde aos exercícios do
 *   treino.") — é a única guarda de domínio entre as operações de lista;
 * - recarga de sucesso medida por `listEntriesByProgramStandalone` chamado
 *   2x (carga + recarga) — sem recarga a falha fica com 1x;
 * - `saveExercise` devolve o `Exercise` atualizado (contrato
 *   `Promise<Exercise>`) e `createExerciseAndAdd` devolve o exercício criado;
 * - e-mail da sessão = mock global de `__tests__/setup.ts` ("teste@hestia.com"),
 *   repassado aos standalones que exigem `email`.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWorkoutDetail } from "@/lib/milon/hooks/useWorkoutDetail";
import * as hooksIndex from "@/lib/milon/hooks";
import {
  findWorkoutByIdStandalone,
  listWorkoutsByProgramStandalone,
  listEntriesByProgramStandalone,
  listSeriesByEntryStandalone,
  addEntryStandalone,
  removeEntryStandalone,
  reorderEntriesStandalone,
  setEntryRestSecondsStandalone,
  setSeriesQuantityStandalone,
  updateSeriesFieldsStandalone,
  applySeriesToAllStandalone,
} from "@/lib/milon/db/workouts";
import {
  listExercisesAllStandalone,
  createExerciseStandalone,
  updateExerciseStandalone,
} from "@/lib/milon/db/exercises";
import { findProgramByIdStandalone } from "@/lib/milon/db/programs";
import { MSG_EXERCICIO_JA_NO_PROGRAMA } from "@/lib/milon/workout-utils";
import { EXERCISE_DUPLICATE_MESSAGE } from "@/lib/milon/repositories/exercises";
import type {
  Exercise,
  Program,
  Workout,
  WorkoutEntry,
  WorkoutSeries,
} from "@/lib/milon/types";

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
  setEntryMode: vi.fn(),
  setEntryLoadUnit: vi.fn(),
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
  setEntryModeStandalone: vi.fn(),
  setEntryLoadUnitStandalone: vi.fn(),
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
}));

vi.mock("@/lib/milon/db/programs", () => ({
  listProgramsStandalone: vi.fn(),
  findProgramByIdStandalone: vi.fn(),
  findActiveProgramByOwnerStandalone: vi.fn(),
  createProgramStandalone: vi.fn(),
  updateProgramStandalone: vi.fn(),
  deleteProgramStandalone: vi.fn(),
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

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "p-1",
    title: "Ficha Verão 2026",
    owner: EMAIL,
    status: "ativo",
    createdAt: "2026-09-29T00:00:00Z",
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

function makeSerie(
  overrides: Partial<WorkoutSeries> & { id: string },
): WorkoutSeries {
  return {
    entryId: "ent-1",
    position: 1,
    value: null,
    load: null,
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

interface CargaOptions {
  workout?: Workout | null;
  program?: Program | null;
  entries?: WorkoutEntry[];
  seriesByEntry?: Record<string, WorkoutSeries[]>;
  exercises?: Exercise[];
  workouts?: Workout[];
}

/**
 * Configura a cadeia de carga (treino -> programa -> entradas -> séries por
 * entrada -> exercícios -> nome do treino). `workout: null` simula id
 * desconhecido (1.3); as demais opções têm defaults consistentes.
 */
function prepararCarga(op: CargaOptions = {}): void {
  const workout =
    op.workout === undefined ? makeWorkout({ id: "w-1" }) : op.workout;
  vi.mocked(findWorkoutByIdStandalone).mockResolvedValue(workout);
  vi.mocked(findProgramByIdStandalone).mockResolvedValue(
    op.program ?? makeProgram(),
  );
  vi.mocked(listEntriesByProgramStandalone).mockResolvedValue(
    op.entries ?? [],
  );
  vi.mocked(listSeriesByEntryStandalone).mockImplementation(
    async (entryId) => op.seriesByEntry?.[entryId] ?? [],
  );
  vi.mocked(listExercisesAllStandalone).mockResolvedValue(op.exercises ?? []);
  vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(
    op.workouts ?? (workout ? [workout] : []),
  );
}

/** Cenário padrão compartilhado pelas operações (ver doc do arquivo). */
function carregarPadrao(): void {
  prepararCarga({
    workout: makeWorkout({ id: "w-1", name: "Treino A" }),
    program: makeProgram({ id: "p-1", status: "ativo" }),
    entries: [
      // Duas entradas do treino aberto...
      makeEntry({ id: "ent-1", workoutId: "w-1", exerciseId: "ex-1", position: 1 }),
      makeEntry({ id: "ent-2", workoutId: "w-1", exerciseId: "ex-2", position: 2 }),
      // ...e uma de OUTRO treino do MESMO Programa (base do conjunto D14).
      makeEntry({
        id: "ent-3",
        workoutId: "w-2",
        exerciseId: "ex-3",
        position: 1,
      }),
    ],
    seriesByEntry: {
      "ent-1": [
        makeSerie({ id: "s-1", entryId: "ent-1", position: 1, value: 10 }),
        makeSerie({ id: "s-2", entryId: "ent-1", position: 2 }),
      ],
      "ent-2": [makeSerie({ id: "s-3", entryId: "ent-2", position: 1 })],
      "ent-3": [],
    },
    exercises: [
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" }),
      makeExercise({ id: "ex-2", name: "Rosca direta", muscle: "Bíceps" }),
      // Exercício soft-deleted usado no Programa: continua visível (histórico).
      makeExercise({
        id: "ex-3",
        name: "Cadeira extensora",
        muscle: "Pernas",
        deletedAt: "2026-10-02T00:00:00.000Z",
      }),
    ],
    workouts: [makeWorkout({ id: "w-1", name: "Treino A" })],
  });
}

/** Monta o hook já com a carga padrão resolvida (loading false). */
async function montarPadrao() {
  carregarPadrao();
  const hook = renderHook(() => useWorkoutDetail("w-1"));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

/**
 * Executa operação do hook DENTRO de `await act(async () => ...)`, espelhando
 * `usePrograms.test.ts`: não depende de a operação relançar ou não — os
 * critérios verificam `errorMsg`/`errorOrigin`/recarga, não o throw.
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

// Todos os mocks deste arquivo: resetados no beforeEach para limpar também
// as queues `mock*Once` deixadas pelo teste anterior (clearAllMocks não limpa).
const mocksDoArquivo = [
  findWorkoutByIdStandalone,
  findProgramByIdStandalone,
  listEntriesByProgramStandalone,
  listSeriesByEntryStandalone,
  listExercisesAllStandalone,
  listWorkoutsByProgramStandalone,
  addEntryStandalone,
  removeEntryStandalone,
  reorderEntriesStandalone,
  setEntryRestSecondsStandalone,
  setSeriesQuantityStandalone,
  updateSeriesFieldsStandalone,
  applySeriesToAllStandalone,
  createExerciseStandalone,
  updateExerciseStandalone,
];

// ---------------------------------------------------------------------------

describe("Mílon #3 — useWorkoutDetail (contrato RED, TASK-007)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Zera queues/implementações SÓ dos mocks deste teste (o client global de
    // setup.ts é preservado — getUserEmail continua respondendo).
    for (const mock of mocksDoArquivo) {
      vi.mocked(mock).mockReset();
    }
  });

  // -------------------------------------------------------------------------
  // 1. Carga inicial: cadeia treino -> programa -> entradas -> séries ->
  //    exercícios -> nome; D14 via programUsedExerciseIds
  // -------------------------------------------------------------------------
  describe("1. Carga inicial (cadeia do plano §3, D14)", () => {
    it("monta workout/program, views do treino com séries, conjunto D14 do Programa e exercício soft-deleted visível", async () => {
      carregarPadrao();

      const { result } = renderHook(() => useWorkoutDetail("w-1"));
      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Cadeia completa, na ordem do plano, com os ids de cada etapa.
      expect(findWorkoutByIdStandalone).toHaveBeenCalledWith("w-1");
      expect(findProgramByIdStandalone).toHaveBeenCalledWith("p-1");
      expect(listEntriesByProgramStandalone).toHaveBeenCalledWith("p-1");
      expect(listSeriesByEntryStandalone).toHaveBeenCalledWith("ent-1");
      expect(listSeriesByEntryStandalone).toHaveBeenCalledWith("ent-2");
      expect(listExercisesAllStandalone).toHaveBeenCalledTimes(1);
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledWith("p-1");

      // Treino + programa (status alimenta o modo somente-leitura, D12).
      expect(result.current.workout?.id).toBe("w-1");
      expect(result.current.workout?.name).toBe("Treino A");
      expect(result.current.program?.id).toBe("p-1");
      expect(result.current.program?.status).toBe("ativo");

      // `entries` filtradas pelo treino aberto (ent-3 é do treino w-2).
      expect(result.current.entries.map((v) => v.entry.id)).toEqual([
        "ent-1",
        "ent-2",
      ]);
      // Cada view junta entrada + exercício + séries (WorkoutEntryView).
      expect(result.current.entries[0].exercise.id).toBe("ex-1");
      expect(result.current.entries[0].series.map((s) => s.id)).toEqual([
        "s-1",
        "s-2",
      ]);
      expect(result.current.entries[1].exercise.id).toBe("ex-2");
      expect(result.current.entries[1].series.map((s) => s.id)).toEqual([
        "s-3",
      ]);

      // Conjunto D14: exercícios já presentes NESTE treino (para D14 por treino)
      // — comparado como conjunto para não amarrar a ordem de entrega.
      expect([...result.current.workoutUsedExerciseIds].sort()).toEqual([
        "ex-1",
        "ex-2",
      ]);

      // Exercício soft-deleted usado no treino permanece visível (histórico).
      const ex3 = result.current.exercises.find((e) => e.id === "ex-3");
      expect(ex3).toBeDefined();
      expect(ex3?.deletedAt).toBe("2026-10-02T00:00:00.000Z");
      expect(result.current.exercises).toHaveLength(3);

      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.successNotice).toBeNull();
      expect(typeof result.current.retry).toBe("function");
    });

    it("erro de carga grava errorMsg com origem 'carga' e o retry recarrega a cadeia", async () => {
      carregarPadrao();
      vi.mocked(findWorkoutByIdStandalone).mockRejectedValueOnce(
        new Error("falha de rede"),
      );

      const { result } = renderHook(() => useWorkoutDetail("w-1"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.errorMsg).toContain("falha de rede");
      expect(result.current.errorOrigin).toBe("carga");
      expect(result.current.workout).toBeNull();
      expect(result.current.entries).toEqual([]);

      await executar(() => result.current.retry());

      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.workout?.id).toBe("w-1");
      expect(result.current.entries.map((v) => v.entry.id)).toEqual([
        "ent-1",
        "ent-2",
      ]);
      expect(findWorkoutByIdStandalone).toHaveBeenCalledTimes(2);
    });

    it("treino inexistente -> workout null, SEM erro e sem descer a cadeia", async () => {
      prepararCarga({ workout: null });

      const { result } = renderHook(() => useWorkoutDetail("w-inexistente"));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Não-confusão entre "não existe" e "falha de rede" (mesma norma R19
      // do useProgramDetail): sem errorMsg e sem origem de erro.
      expect(result.current.workout).toBeNull();
      expect(result.current.program).toBeNull();
      expect(result.current.entries).toEqual([]);
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();

      // Sem treino não há programa/entradas a buscar.
      expect(findProgramByIdStandalone).not.toHaveBeenCalled();
      expect(listEntriesByProgramStandalone).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 2. addExercise — D14 RELANÇA para o modal (não fecha, não vira banner)
  // -------------------------------------------------------------------------
  describe("2. addExercise (bloqueio D14 no modal)", () => {
    it("MSG_EXERCICIO_JA_NO_PROGRAMA é RELANÇADA sem tocar no canal de erro e sem recarregar", async () => {
      const { result } = await montarPadrao();
      vi.mocked(addEntryStandalone).mockRejectedValueOnce(
        new Error(MSG_EXERCICIO_JA_NO_PROGRAMA),
      );

      await act(async () => {
        await expect(
          result.current.addExercise("ex-9"),
        ).rejects.toThrow(MSG_EXERCICIO_JA_NO_PROGRAMA);
      });

      expect(addEntryStandalone).toHaveBeenCalledWith(
        "w-1",
        "p-1",
        "ex-9",
        EMAIL,
      );
      // Relançada para o MODAL: a página não ganha banner (errorMsg intacto).
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
      expect(result.current.entries.map((v) => v.entry.id)).toEqual([
        "ent-1",
        "ent-2",
      ]);
    });

    it("sucesso cria a entrada com a sessão e recarrega as entradas", async () => {
      const { result } = await montarPadrao();
      vi.mocked(addEntryStandalone).mockResolvedValue(
        makeEntry({
          id: "ent-4",
          workoutId: "w-1",
          exerciseId: "ex-4",
          position: 3,
        }),
      );
      // Verdade pós-recarga: a nova entrada aparece na lista do treino.
      vi.mocked(listEntriesByProgramStandalone).mockResolvedValue([
        makeEntry({ id: "ent-1", workoutId: "w-1", exerciseId: "ex-1", position: 1 }),
        makeEntry({ id: "ent-2", workoutId: "w-1", exerciseId: "ex-2", position: 2 }),
        makeEntry({
          id: "ent-4",
          workoutId: "w-1",
          exerciseId: "ex-4",
          position: 3,
        }),
      ]);

      await executar(() => result.current.addExercise("ex-4"));

      expect(addEntryStandalone).toHaveBeenCalledWith(
        "w-1",
        "p-1",
        "ex-4",
        EMAIL,
      );
      await waitFor(() =>
        expect(result.current.entries.map((v) => v.entry.id)).toEqual([
          "ent-1",
          "ent-2",
          "ent-4",
        ]),
      );
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2);
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 3. createExerciseAndAdd — cria na biblioteca E adiciona (D14: id novo)
  // -------------------------------------------------------------------------
  describe("3. createExerciseAndAdd (cadastrar novo dentro do seletor)", () => {
    it("sucesso cria o exercício com a sessão, adiciona a entrada e recarrega", async () => {
      const { result } = await montarPadrao();
      const novo = makeExercise({
        id: "ex-novo",
        name: "Puxada frontal",
        muscle: "Costas",
      });
      vi.mocked(createExerciseStandalone).mockResolvedValue(novo);
      vi.mocked(addEntryStandalone).mockResolvedValue(
        makeEntry({
          id: "ent-5",
          workoutId: "w-1",
          exerciseId: "ex-novo",
          position: 3,
        }),
      );
      vi.mocked(listEntriesByProgramStandalone).mockResolvedValue([
        makeEntry({ id: "ent-1", workoutId: "w-1", exerciseId: "ex-1", position: 1 }),
        makeEntry({ id: "ent-2", workoutId: "w-1", exerciseId: "ex-2", position: 2 }),
        makeEntry({
          id: "ent-5",
          workoutId: "w-1",
          exerciseId: "ex-novo",
          position: 3,
        }),
      ]);

      let criado: Exercise | undefined;
      await act(async () => {
        criado = await result.current.createExerciseAndAdd({
          name: "Puxada frontal",
          muscle: "Costas",
        });
      });

      expect(criado?.id).toBe("ex-novo");
      expect(createExerciseStandalone).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Puxada frontal", muscle: "Costas" }),
        EMAIL,
      );
      // A entrada usa o id RECÉM-CRIADO (a unicidade D14 não pode colidir).
      expect(addEntryStandalone).toHaveBeenCalledWith(
        "w-1",
        "p-1",
        "ex-novo",
        EMAIL,
      );
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("anti-duplicata da #1 no cadastro é RELANÇADA para o modal sem banner", async () => {
      const { result } = await montarPadrao();
      vi.mocked(createExerciseStandalone).mockRejectedValueOnce(
        new Error(EXERCISE_DUPLICATE_MESSAGE),
      );

      await act(async () => {
        await expect(
          result.current.createExerciseAndAdd({
            name: "Supino reto",
            muscle: "Peito",
          }),
        ).rejects.toThrow(EXERCISE_DUPLICATE_MESSAGE);
      });

      expect(addEntryStandalone).not.toHaveBeenCalled();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 4. saveExercise — anti-duplicata da #1 RELANÇA (modal); sucesso recarrega
  // -------------------------------------------------------------------------
  describe("4. saveExercise (edição da biblioteca)", () => {
    it("EXERCISE_DUPLICATE_MESSAGE é RELANÇADA sem tocar no canal de erro e sem recarregar", async () => {
      const { result } = await montarPadrao();
      vi.mocked(updateExerciseStandalone).mockRejectedValueOnce(
        new Error(EXERCISE_DUPLICATE_MESSAGE),
      );

      await act(async () => {
        await expect(
          result.current.saveExercise("ex-1", {
            name: "Supino inclinado",
            muscle: "Peito",
            videoLink: null,
          }),
        ).rejects.toThrow(EXERCISE_DUPLICATE_MESSAGE);
      });

      expect(updateExerciseStandalone).toHaveBeenCalledWith("ex-1", {
        name: "Supino inclinado",
        muscle: "Peito",
        videoLink: null,
      });
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });

    it("sucesso atualiza a biblioteca, devolve o Exercise e recarrega as entradas", async () => {
      const { result } = await montarPadrao();
      const atualizado = makeExercise({
        id: "ex-1",
        name: "Supino inclinado",
        muscle: "Peito",
      });
      vi.mocked(updateExerciseStandalone).mockResolvedValue(atualizado);

      let salvo: Exercise | undefined;
      await act(async () => {
        salvo = await result.current.saveExercise("ex-1", {
          name: "Supino inclinado",
          muscle: "Peito",
          videoLink: null,
        });
      });

      expect(salvo?.id).toBe("ex-1");
      expect(salvo?.name).toBe("Supino inclinado");
      expect(updateExerciseStandalone).toHaveBeenCalledWith("ex-1", {
        name: "Supino inclinado",
        muscle: "Peito",
        videoLink: null,
      });
      // Mudança vale para todos os Programas: as views são recarregadas.
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 5. Operações de lista — errorMsg da página ('operacao'/'bloqueio') e
  //    recarga das entradas em sucesso
  // -------------------------------------------------------------------------
  describe("5. Operações de lista (banner da página + recarga)", () => {
    it("removeEntry: sucesso remove e recarrega as entradas", async () => {
      const { result } = await montarPadrao();

      await executar(() =>
        result.current.removeEntry(result.current.entries[0].entry),
      );

      expect(removeEntryStandalone).toHaveBeenCalledWith("ent-1");
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("removeEntry: falha vira origem 'operacao' SEM recarregar", async () => {
      const { result } = await montarPadrao();
      vi.mocked(removeEntryStandalone).mockRejectedValueOnce(
        new Error("Erro ao remover exercício"),
      );

      await executar(() =>
        result.current.removeEntry(result.current.entries[0].entry),
      );

      expect(result.current.errorMsg).toContain("Erro ao remover exercício");
      expect(result.current.errorOrigin).toBe("operacao");
      // Sem recarga de sucesso: só a carga de montagem buscou as entradas.
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
      expect(result.current.entries.map((v) => v.entry.id)).toEqual([
        "ent-1",
        "ent-2",
      ]);
    });

    it("reorderEntries: sucesso grava a nova ordem e recarrega as entradas", async () => {
      const { result } = await montarPadrao();

      await executar(() => result.current.reorderEntries(["ent-2", "ent-1"]));

      expect(reorderEntriesStandalone).toHaveBeenCalledWith("w-1", [
        "ent-2",
        "ent-1",
      ]);
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("reorderEntries: guarda de domínio do repositório vira origem 'bloqueio' SEM recarregar", async () => {
      const { result } = await montarPadrao();
      // Mensagem exata da guarda do repositório (workouts.ts): lista com id
      // que não pertence ao treino viola a validação de conjunto.
      vi.mocked(reorderEntriesStandalone).mockRejectedValueOnce(
        new Error("A ordem informada não corresponde aos exercícios do treino."),
      );

      await executar(() => result.current.reorderEntries(["ent-9"]));

      expect(reorderEntriesStandalone).toHaveBeenCalledWith("w-1", [
        "ent-9",
      ]);
      expect(result.current.errorMsg).toBe(
        "A ordem informada não corresponde aos exercícios do treino.",
      );
      expect(result.current.errorOrigin).toBe("bloqueio");
      // Bloqueio não recarrega: nada mudou no servidor.
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });

    it("reorderEntries: falha de gravação vira origem 'operacao'", async () => {
      const { result } = await montarPadrao();
      vi.mocked(reorderEntriesStandalone).mockRejectedValueOnce(
        new Error("Erro ao reordenar"),
      );

      await executar(() => result.current.reorderEntries(["ent-2", "ent-1"]));

      expect(result.current.errorMsg).toContain("Erro ao reordenar");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });

    it("setQuantity: sucesso chama o repositório com a sessão e recarrega", async () => {
      const { result } = await montarPadrao();
      vi.mocked(setSeriesQuantityStandalone).mockResolvedValue([]);

      await executar(() => result.current.setQuantity("ent-1", 4));

      expect(setSeriesQuantityStandalone).toHaveBeenCalledWith(
        "ent-1",
        4,
        EMAIL,
      );
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("setQuantity: falha vira origem 'operacao' SEM recarregar", async () => {
      const { result } = await montarPadrao();
      vi.mocked(setSeriesQuantityStandalone).mockRejectedValueOnce(
        new Error("Erro ao ajustar séries"),
      );

      await executar(() => result.current.setQuantity("ent-1", 4));

      expect(result.current.errorMsg).toContain("Erro ao ajustar séries");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });

    it("setRest: sucesso grava o descanso (aceita 90 e null) e recarrega", async () => {
      const { result } = await montarPadrao();

      await executar(() => result.current.setRest("ent-1", 90));
      await executar(() => result.current.setRest("ent-2", null));

      expect(setEntryRestSecondsStandalone).toHaveBeenCalledWith("ent-1", 90);
      expect(setEntryRestSecondsStandalone).toHaveBeenCalledWith("ent-2", null);
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(3),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("setRest: falha vira origem 'operacao' SEM recarregar", async () => {
      const { result } = await montarPadrao();
      vi.mocked(setEntryRestSecondsStandalone).mockRejectedValueOnce(
        new Error("Erro ao salvar descanso"),
      );

      await executar(() => result.current.setRest("ent-1", 90));

      expect(result.current.errorMsg).toContain("Erro ao salvar descanso");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });

    it("updateSeries: sucesso grava o campo da série e recarrega", async () => {
      const { result } = await montarPadrao();
      vi.mocked(updateSeriesFieldsStandalone).mockResolvedValue(
        makeSerie({ id: "s-1", entryId: "ent-1", position: 1, value: 12 }),
      );

      await executar(() =>
        result.current.updateSeries("s-1", "value", 12),
      );

      expect(updateSeriesFieldsStandalone).toHaveBeenCalledWith("s-1", {
        value: 12,
      });
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("updateSeries: falha vira origem 'operacao' SEM recarregar (valor anterior preservado)", async () => {
      const { result } = await montarPadrao();
      vi.mocked(updateSeriesFieldsStandalone).mockRejectedValueOnce(
        new Error("Erro ao salvar série"),
      );

      await executar(() =>
        result.current.updateSeries("s-1", "value", 12),
      );

      expect(result.current.errorMsg).toContain("Erro ao salvar série");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });

    it("applyToAll: sucesso copia value/carga para as demais e recarrega", async () => {
      const { result } = await montarPadrao();
      vi.mocked(applySeriesToAllStandalone).mockResolvedValue([]);

      await executar(() => result.current.applyToAll("ent-1", "s-1"));

      expect(applySeriesToAllStandalone).toHaveBeenCalledWith("ent-1", "s-1");
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("applyToAll: falha vira origem 'operacao' SEM recarregar", async () => {
      const { result } = await montarPadrao();
      vi.mocked(applySeriesToAllStandalone).mockRejectedValueOnce(
        new Error("Erro ao aplicar a todas"),
      );

      await executar(() => result.current.applyToAll("ent-1", "s-1"));

      expect(result.current.errorMsg).toContain(
        "Erro ao aplicar a todas",
      );
      expect(result.current.errorOrigin).toBe("operacao");
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Ajustes de modo/unidade da entry (TASK-010 — RED; SUBSTITUI o bloco
  //    confirmLoadUnit/D10, superseded pela reversão D33 — removido).
  //    Fonte: tasks.json TASK-010 + plan.md Aditamento 0012 CORRETA §3
  //    (Hook de detalhe: setEntryMode/setEntryLoadUnit com banner em falha,
  //    mesmo padrão do descanso; perde o ajuste de unidade da biblioteca).
  //
  //    Contrato fixado aqui (o que a TASK-011/TASK-012 devem implementar):
  //    - `setEntryMode(entryId, mode)` chama `setEntryModeStandalone` e
  //      recarrega as entradas em sucesso; em falha alimenta errorMsg com
  //      origem 'operacao' SEM recarregar (padrão setRest);
  //    - `setEntryLoadUnit(entryId, unit)` idem via
  //      `setEntryLoadUnitStandalone`;
  //    - `confirmLoadUnit` (unidade na biblioteca) NÃO existe mais no hook;
  //    - o fonte do hook não referencia o ajuste de unidade da biblioteca.
  //
  //    Expected: FAIL — o hook atual não tem os ajustes da entry e ainda
  //    tem confirmLoadUnit. Hefesto fará GREEN sem mudar estes testes
  //    (acessos via cast + import dinâmico mantêm o tsc verde no RED).
  // -------------------------------------------------------------------------
  describe("6. ajustes de modo/unidade da entry (TASK-010 — RED)", () => {
    async function entradaStandalones(): Promise<{
      setEntryModeStandalone: Mock;
      setEntryLoadUnitStandalone: Mock;
    }> {
      const mod = (await import("@/lib/milon/db/workouts")) as unknown as {
        setEntryModeStandalone: Mock;
        setEntryLoadUnitStandalone: Mock;
      };
      mod.setEntryModeStandalone.mockReset();
      mod.setEntryLoadUnitStandalone.mockReset();
      return mod;
    }

    type HookComEntry = {
      setEntryMode: (entryId: string, mode: "repeticao" | "tempo") => Promise<void>;
      setEntryLoadUnit: (entryId: string, unit: "kg" | "lb") => Promise<void>;
    };

    function hookComEntry(result: { current: unknown }): HookComEntry {
      return result.current as unknown as HookComEntry;
    }

    it("setEntryMode persiste via standalone e recarrega as entradas", async () => {
      const { setEntryModeStandalone } = await entradaStandalones();
      setEntryModeStandalone.mockResolvedValue(undefined);
      const { result } = await montarPadrao();

      await executar(() => hookComEntry(result).setEntryMode("ent-1", "tempo"));

      expect(setEntryModeStandalone).toHaveBeenCalledWith("ent-1", "tempo");
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("setEntryMode em falha vira origem 'operacao' SEM recarregar", async () => {
      const { setEntryModeStandalone } = await entradaStandalones();
      setEntryModeStandalone.mockRejectedValueOnce(
        new Error("Falha de rede no modo"),
      );
      const { result } = await montarPadrao();

      await executar(() => hookComEntry(result).setEntryMode("ent-1", "tempo"));

      expect(result.current.errorMsg).toContain("Falha de rede no modo");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });

    it("setEntryLoadUnit persiste via standalone e recarrega as entradas", async () => {
      const { setEntryLoadUnitStandalone } = await entradaStandalones();
      setEntryLoadUnitStandalone.mockResolvedValue(undefined);
      const { result } = await montarPadrao();

      await executar(() =>
        hookComEntry(result).setEntryLoadUnit("ent-1", "lb"),
      );

      expect(setEntryLoadUnitStandalone).toHaveBeenCalledWith(
        "ent-1",
        "lb",
      );
      await waitFor(() =>
        expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(2),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it("setEntryLoadUnit em falha vira origem 'operacao' SEM recarregar", async () => {
      const { setEntryLoadUnitStandalone } = await entradaStandalones();
      setEntryLoadUnitStandalone.mockRejectedValueOnce(
        new Error("Falha de rede na unidade"),
      );
      const { result } = await montarPadrao();

      await executar(() =>
        hookComEntry(result).setEntryLoadUnit("ent-1", "lb"),
      );

      expect(result.current.errorMsg).toContain("Falha de rede na unidade");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(listEntriesByProgramStandalone).toHaveBeenCalledTimes(1);
    });

    it("confirmLoadUnit (unidade na biblioteca) não existe mais no hook (D33)", async () => {
      const { result } = await montarPadrao();

      expect(
        (result.current as unknown as Record<string, unknown>).confirmLoadUnit,
      ).toBeUndefined();
    });

    it("código vivo sem o ajuste de unidade da biblioteca no hook (substituição, D33)", () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, "../../../../lib/milon/hooks/useWorkoutDetail.ts"),
        "utf8",
      );
      expect(src).not.toMatch(/confirmLoadUnit/);
      expect(src).not.toMatch(/setExerciseLoadUnitStandalone/);
    });
  });

  it("hooks/index exporta useWorkoutDetail como caminho oficial", () => {
    expect(typeof hooksIndex.useWorkoutDetail).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Contrato RED da TASK-013 (Mílon #5, Aditamento 2026-10-10 "valor único") —
// consumido pela TASK-015 (escopo mínimo de tipos; cobertura plena do hook
// pertence à TASK-015 por arbitragem Zeus).
// Fonte: tasks.json TASK-013 + plan.md Aditamento 2026-10-10 §3 (commit e
// salvamento com valor único) + spec §3.
// Expected: FAIL (hook atual mapeia qualquer campo fora de reps/
// durationSeconds para `{ load }`, sem `value`).
// Convenção: campo "value" via cast — o tipo ainda não tem o campo (RED
// inclui os tipos); em runtime a string o carrega.
// ---------------------------------------------------------------------------

describe("Milon 05 TASK-013 RED — useWorkoutDetail com valor único (D34)", () => {
  it("updateSeries com campo value persiste o valor único via standalone", async () => {
    const { result } = await montarPadrao();
    vi.mocked(updateSeriesFieldsStandalone).mockResolvedValue(
      makeSerie({ id: "s-1", entryId: "ent-1", position: 1, value: 12 }),
    );

    await executar(() =>
      result.current.updateSeries(
        "s-1",
        "value" as unknown as Parameters<
          typeof result.current.updateSeries
        >[1],
        9,
      ),
    );

    expect(updateSeriesFieldsStandalone).toHaveBeenCalledWith("s-1", {
      value: 9,
    });
  });
});
