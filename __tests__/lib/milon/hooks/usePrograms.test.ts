/**
 * Contrato RED — Mílon #3 (TASK-009): `lib/milon/hooks/usePrograms.ts`.
 *
 * Fonte da verdade: `.agents/modules/milon/03-treinos-series/spec.md`
 * (§3 "Guarda de ativação (integração #2→#3)" + D6 "exclusão de Programa com
 * treinos") + `plan.md` §2 (guardas frescos) e §3 (contrato do hook
 * `usePrograms` — Modify) + `tasks.json` TASK-009 (acceptanceCriteria) e
 * TASK-010 (consumo do barrel `db/workouts`).
 *
 * CONTRATO NOVO — guardas frescos, hook SEM argumentos: a chamada é sempre
 * `usePrograms()`. `runActivation` consulta
 * `hasWorkoutWithExercise(program.id)` do barrel `@/lib/milon/db/workouts` NO
 * MOMENTO da ativação e `remove` consulta `hasWorkouts(program.id)` NO MOMENTO
 * da exclusão (plan.md §2: "consultas frescas executadas no momento da ação").
 *
 * STATUS: RED esperado (TASK-010/Hefesto torna verde, sem mexer neste arquivo):
 * o hook atual NÃO consulta o barrel `db/workouts`, então os casos de liberação,
 * de falha da consulta e de exclusão bloqueada falham pelo motivo exato exigido
 * pelo acceptanceCriteria 1 (comportamento ausente), nunca por sintaxe.
 *
 * Padrão espelhado de `__tests__/lib/milon/hooks/useProgramWorkouts.test.ts` e
 * `useExercises.test.ts`: `vi.mock` dos barrels `db/*` cobrindo TODOS os
 * exports, promise-chain + flag `cancelled` no hook, `waitFor` para o
 * carregamento e `executar` (act tolerante a relançamento) para as operações.
 *
 * CONVENÇÕES ESCOLHIDAS POR MINOS (não fixadas literalmente pela spec —
 * reportadas como divergências a Zeus; ajustar aqui se o contrato for outro):
 * 1. Estado espelha `useExercises`: `programs`, `filteredPrograms`,
 *    `ownerFilter`/`setOwnerFilter`, `statusFilters`/`toggleStatusFilter`;
 *    mensagens usam `errorMsg` + `errorOrigin` (canal de origem da #2/Patch v4).
 * 2. `ownerFilter: string` — "" = família inteira (#2 spec §3: "limpar o filtro
 *    de dono volta a ver a família inteira"); padrão ao montar = `getUserEmail()`
 *    do client (mock global em `__tests__/setup.ts` → "teste@hestia.com").
 * 3. `activate/reactivate/remove` recebem o `Program` completo (precisam de
 *    status/dono para a guarda, para a regra "só rascunho" e para o efeito
 *    colateral) e são as operações EXECUTORAS — a confirmação as chama.
 * 4. Confirmação: estado `confirmAction` (literal do critério) com
 *    `{ action, program }` + `requestConfirm` / `cancelConfirm` / `confirm`
 *    (nomes das funções não são fixados pela spec; o estado é).
 * 5. Critério 4 da #2 exige o efeito colateral "via
 *    `aplicarEfeitoColateralAtivacao`" — o teste espya a util (implementação
 *    real preservada via importOriginal) além de observar a lista resultante.
 * 6. Mensagem de bloqueio de `remove` por status não é fixada pela spec: exige-
 *    se apenas `errorMsg` não nulo + repository não chamado + lista intacta.
 * 7. Guardas: os testes configuram as DUAS formas exportadas pelo barrel
 *    (`hasWorkoutWithExercise(db, programId)` e a `...Standalone(programId)`,
 *    idem `hasWorkouts`) porque a nomenclatura consumida pelo hook é a da
 *    TASK-010 (exports entregues na TASK-006); as asserções aceitam qualquer
 *    uma das formas — o critério é a consulta fresca no momento da ação.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePrograms } from "@/lib/milon/hooks/usePrograms";
import * as hooksIndex from "@/lib/milon/hooks";
import {
  listProgramsStandalone,
  createProgramStandalone,
  updateProgramStandalone,
  deleteProgramStandalone,
} from "@/lib/milon/db/programs";
import {
  hasWorkouts,
  hasWorkoutsStandalone,
  hasWorkoutWithExercise,
  hasWorkoutWithExerciseStandalone,
} from "@/lib/milon/db/workouts";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { IDatabaseClient } from "@/lib/shared/database";
import { aplicarEfeitoColateralAtivacao } from "@/lib/milon/program-utils";
import { MSG_PROGRAMA_COM_TREINOS } from "@/lib/milon/workout-utils";
import type { Program } from "@/lib/milon/types";

// Barrel `db/programs` mockado no padrão dos testes de hook do projeto.
// Todos os standalones possivelmente consumidos pelo hook ficam definidos.
vi.mock("@/lib/milon/db/programs", () => ({
  listProgramsStandalone: vi.fn(),
  findProgramByIdStandalone: vi.fn(),
  findActiveProgramByOwnerStandalone: vi.fn(),
  createProgramStandalone: vi.fn(),
  updateProgramStandalone: vi.fn(),
  deleteProgramStandalone: vi.fn(),
}));

// Barrel `db/workouts` mockado no padrão de `useProgramWorkouts.test.ts`: o
// factory cobre TODOS os exports (forma com `db` + standalones), porque a
// nomenclatura exata consumida por `usePrograms` é a da TASK-010 — os dois
// nomes são configurados e as asserções aceitam qualquer uma das formas.
// Fonte: `lib/milon/db/workouts.ts` (re-export de `repositories/workouts.ts`).
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

// Espia o efeito colateral exigido pelo acceptanceCriteria 4 mantendo a
// implementação real (função pura de program-utils) por trás do mock.
vi.mock("@/lib/milon/program-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/milon/program-utils")>();
  return {
    ...actual,
    aplicarEfeitoColateralAtivacao: vi.fn(actual.aplicarEfeitoColateralAtivacao),
  };
});

// getEmail() do client mockado globalmente em __tests__/setup.ts (task 49).
const EMAIL = "teste@hestia.com";
const OUTRO = "parceiro@hestia.lan";
const GUARDA = "Adicione pelo menos um treino com exercícios para ativar";

// ---------------------------------------------------------------------------
// Helpers de teste (nunca reimplementam regra de produção — só observam)
// ---------------------------------------------------------------------------

function programa(
  campos: Partial<Program> & { id: string },
): Program {
  return {
    title: "Programa",
    owner: EMAIL,
    status: "rascunho",
    createdAt: "2026-09-01T00:00:00.000Z",
    created_by: EMAIL,
    ...campos,
  };
}

/**
 * Configura a lista mockada: `inicial` no fetch de montagem e, quando houver,
 * `depois` em qualquer recarga posterior (verdade pós-operação). As duas
 * casuísticas (hook que recarrega / hook que aplica o efeito em memória)
 * convergem para o mesmo resultado esperado.
 */
function mockList(inicial: Program[], depois?: Program[]): void {
  const lista = vi.mocked(listProgramsStandalone);
  lista.mockReset();
  if (depois) {
    lista.mockResolvedValueOnce(inicial).mockResolvedValue(depois);
  } else {
    lista.mockResolvedValue(inicial);
  }
}

/**
 * Executa operação do hook DENTRO de `await act(async () => ...)`, espelhando
 * `useExercises.test.ts` — as atualizações de estado são processadas pelo React
 * antes das asserções e a produção NÃO precisa de `flushSync` (contorno que o
 * teste jamais deve forçar em código de produção).
 *
 * Não depende de a operação relançar ou não: os critérios verificam `errorMsg`
 * + estado da lista, não o throw (implementação pode relançar como em
 * useExercises ou apenas setar a mensagem).
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

/**
 * Igual a `executar`, mas DEVOLVE o erro relançado — usado nos casos em que o
 * contrato exige relançamento (plan.md §3: falha da consulta da guarda de
 * ativação e bloqueio de exclusão com `MSG_PROGRAMA_COM_TREINOS`).
 */
async function executarECapturar(operacao: () => unknown): Promise<unknown> {
  let thrown: unknown;
  await act(async () => {
    try {
      await operacao();
    } catch (err: unknown) {
      thrown = err;
    }
  });
  return thrown;
}

// ---------------------------------------------------------------------------
// Guardas frescos do barrel `db/workouts` (TASK-009 → TASK-010)
// plan.md §3: `runActivation` consulta `hasWorkoutWithExercise(program.id)` e
// `remove` consulta `hasWorkouts(program.id)` NO MOMENTO DA AÇÃO. O barrel
// expõe a forma com `db` (repositório) e a standalone (`...Standalone(id)`):
// os dois nomes são configurados juntos e as leituras aceitam qualquer forma,
// porque a nomenclatura consumida pelo hook é a da TASK-010.
// ---------------------------------------------------------------------------
const guardaComDb = vi.mocked(hasWorkoutWithExercise);
const guardaStandalone = vi.mocked(hasWorkoutWithExerciseStandalone);
const treinosComDb = vi.mocked(hasWorkouts);
const treinosStandalone = vi.mocked(hasWorkoutsStandalone);

function quandoGuardaDeAtivacao(valor: boolean): void {
  guardaComDb.mockResolvedValue(valor);
  guardaStandalone.mockResolvedValue(valor);
}

function quandoFalhaGuardaDeAtivacao(erro: Error): void {
  guardaComDb.mockRejectedValue(erro);
  guardaStandalone.mockRejectedValue(erro);
}

function quandoHaTreinos(valor: boolean): void {
  treinosComDb.mockResolvedValue(valor);
  treinosStandalone.mockResolvedValue(valor);
}

function quandoFalhaConsultaTreinos(erro: Error): void {
  treinosComDb.mockRejectedValue(erro);
  treinosStandalone.mockRejectedValue(erro);
}

/** Zera calls + implementações SÓ dos 4 mocks de guarda. */
function resetarGuardas(): void {
  guardaComDb.mockReset();
  guardaStandalone.mockReset();
  treinosComDb.mockReset();
  treinosStandalone.mockReset();
}

/** A guarda de ativação foi consultada (em qualquer das formas) para o id? */
function guardaConsultadaPara(programId: string): boolean {
  if (guardaStandalone.mock.calls.some(([id]) => id === programId)) return true;
  return guardaComDb.mock.calls.some((args) =>
    (args as unknown[]).includes(programId),
  );
}

/** `hasWorkouts` foi consultado (em qualquer das formas) para o id? */
function treinosConsultadosPara(programId: string): boolean {
  if (treinosStandalone.mock.calls.some(([id]) => id === programId)) return true;
  return treinosComDb.mock.calls.some((args) =>
    (args as unknown[]).includes(programId),
  );
}

function expectGuardaConsultada(programId: string): void {
  expect(
    guardaConsultadaPara(programId),
    `a guarda de ativação deveria ser consultada fresca para o programa ${programId}`,
  ).toBe(true);
}

function expectGuardaNaoConsultada(): void {
  expect(guardaStandalone).not.toHaveBeenCalled();
  expect(guardaComDb).not.toHaveBeenCalled();
}

function expectTreinosConsultados(programId: string): void {
  expect(
    treinosConsultadosPara(programId),
    `hasWorkouts deveria ser consultado fresco para o programa ${programId}`,
  ).toBe(true);
}

function expectTreinosNaoConsultados(): void {
  expect(treinosStandalone).not.toHaveBeenCalled();
  expect(treinosComDb).not.toHaveBeenCalled();
}

/**
 * Zera calls/implementações SÓ dos mocks deste arquivo (o client global de
 * setup.ts é preservado — `getUserEmail` continua respondendo; o spy do
 * `program-utils` perde só as chamadas) e instala o PADRÃO dos guardas frescos
 * = "sem conteúdo" — espelha a #2, em que a ativação nascia bloqueada e a
 * exclusão de rascunho era liberada. Cada caso sobrescreve quando precisar do
 * outro valor.
 */
function prepararMocks(): void {
  vi.clearAllMocks();
  vi.mocked(listProgramsStandalone).mockReset();
  vi.mocked(createProgramStandalone).mockReset();
  vi.mocked(updateProgramStandalone).mockReset();
  vi.mocked(deleteProgramStandalone).mockReset();
  resetarGuardas();
  quandoGuardaDeAtivacao(false);
  quandoHaTreinos(false);
}

/**
 * `id:status` da lista COMPLETA (`programs`, não `filteredPrograms`).
 * §4 ("preserva o ativo de outro dono") é propriedade da lista da família:
 * ler a lista filtrada esconderia `p-outro` porque o `ownerFilter` padrão é o
 * próprio usuário (critério §2 — que permanece intacto).
 */
function statusesDaLista(result: { current: { programs: Program[] } }): string[] {
  return result.current.programs.map((p) => `${p.id}:${p.status}`);
}

// ---------------------------------------------------------------------------

describe("Mílon #3 — usePrograms com guardas frescos (contrato RED, TASK-009)", () => {
  beforeEach(() => {
    prepararMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Carregamento inicial (lista ordenada + loading states)
  // -------------------------------------------------------------------------
  describe("1. Carregamento inicial", () => {
    it("abre em loading, exibe a lista na ordem do repositório e sai do loading sem erro", async () => {
      const maisRecente = programa({
        id: "p-3",
        createdAt: "2026-09-25T00:00:00.000Z",
        status: "ativo",
      });
      const doMeio = programa({
        id: "p-2",
        createdAt: "2026-09-15T00:00:00.000Z",
        status: "inativo",
      });
      const maisAntigo = programa({
        id: "p-1",
        createdAt: "2026-09-05T00:00:00.000Z",
        status: "rascunho",
      });
      mockList([maisRecente, doMeio, maisAntigo]);

      const { result } = renderHook(() => usePrograms());
      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Ordem do repositório (created_at desc) preservada — status não reordena.
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-3", "p-2", "p-1"]);
      expect(result.current.programs.map((p) => p.status)).toEqual([
        "ativo",
        "inativo",
        "rascunho",
      ]);
      expect(result.current.errorMsg).toBeNull();
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });

    it("falha de carregamento vira errorMsg visível e reload (tentar de novo) recupera", async () => {
      vi.mocked(listProgramsStandalone)
        .mockRejectedValueOnce(new Error("falha de rede"))
        .mockResolvedValue([programa({ id: "p-1" })]);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.errorMsg).toContain("falha de rede");
      expect(result.current.programs).toEqual([]);

      await executar(() => result.current.reload());

      expect(result.current.errorMsg).toBeNull();
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-1"]);
      expect(listProgramsStandalone).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Filtro padrão ao montar + refiltração em memória
  // -------------------------------------------------------------------------
  describe("2. Filtros (dono = select, status = checks)", () => {
    const base: Program[] = [
      programa({ id: "p-meu-r", status: "rascunho", createdAt: "2026-09-20T00:00:00.000Z" }),
      programa({ id: "p-outro-r", status: "rascunho", owner: OUTRO, createdAt: "2026-09-15T00:00:00.000Z" }),
      programa({ id: "p-meu-a", status: "ativo", createdAt: "2026-09-10T00:00:00.000Z" }),
      programa({ id: "p-outro-i", status: "inativo", owner: OUTRO, createdAt: "2026-09-05T00:00:00.000Z" }),
    ];

    it("padrão ao montar: dono = getUserEmail() e todos os status marcados", async () => {
      mockList(base);
      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      await waitFor(() => expect(result.current.ownerFilter).toBe(EMAIL));

      expect([...result.current.statusFilters].sort()).toEqual([
        "ativo",
        "inativo",
        "rascunho",
      ]);
      expect(result.current.programs).toHaveLength(4);
      // Padrão = próprio dono → só os meus programas aparecem.
      expect(result.current.filteredPrograms.map((p) => p.id)).toEqual([
        "p-meu-r",
        "p-meu-a",
      ]);
      expect(result.current.errorMsg).toBeNull();
    });

    it("filtro de dono por igualdade: limpar vê a família inteira e trocar vê o outro dono", async () => {
      mockList(base);
      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.filteredPrograms.map((p) => p.id)).toEqual([
        "p-meu-r",
        "p-meu-a",
      ]);

      act(() => {
        result.current.setOwnerFilter("");
      });
      expect(result.current.filteredPrograms.map((p) => p.id)).toEqual([
        "p-meu-r",
        "p-outro-r",
        "p-meu-a",
        "p-outro-i",
      ]);

      act(() => {
        result.current.setOwnerFilter(OUTRO);
      });
      expect(result.current.filteredPrograms.map((p) => p.id)).toEqual([
        "p-outro-r",
        "p-outro-i",
      ]);

      // Refiltração é em memória: nenhum fetch novo.
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });

    it("checks de status por inclusão: desmarcar some, marcar devolve e vazio não é erro", async () => {
      const proprios: Program[] = [
        programa({ id: "p-r", status: "rascunho", createdAt: "2026-09-20T00:00:00.000Z" }),
        programa({ id: "p-a", status: "ativo", createdAt: "2026-09-10T00:00:00.000Z" }),
        programa({ id: "p-i", status: "inativo", createdAt: "2026-09-05T00:00:00.000Z" }),
      ];
      mockList(proprios);
      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.filteredPrograms).toHaveLength(3);

      act(() => {
        result.current.toggleStatusFilter("ativo");
      });
      expect(result.current.filteredPrograms.map((p) => p.id)).toEqual(["p-r", "p-i"]);

      act(() => {
        result.current.toggleStatusFilter("rascunho");
      });
      expect(result.current.filteredPrograms.map((p) => p.id)).toEqual(["p-i"]);

      // Todos desmarcados: sem resultados, sem mensagem de erro.
      act(() => {
        result.current.toggleStatusFilter("inativo");
      });
      expect(result.current.filteredPrograms).toEqual([]);
      expect(result.current.errorMsg).toBeNull();

      act(() => {
        result.current.toggleStatusFilter("rascunho");
      });
      act(() => {
        result.current.toggleStatusFilter("ativo");
      });
      expect(result.current.filteredPrograms.map((p) => p.id)).toEqual(["p-r", "p-a"]);

      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Guarda de ativação — consulta fresca = false (bloqueio)
  // -------------------------------------------------------------------------
  describe("3. Guarda de ativação: consulta fresca = false bloqueia", () => {
    it("activate consulta a guarda no momento da ação, bloqueia com a mensagem exata e não chama o repository", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([rascunho]);
      quandoGuardaDeAtivacao(false);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      // Frescor (plan.md §2): a montagem não consulta — o valor vem da ação.
      expectGuardaNaoConsultada();

      await executar(() => result.current.activate(rascunho));

      expectGuardaConsultada("p-r");
      expect(result.current.errorMsg).toBe(GUARDA);
      expect(result.current.errorOrigin).toBe("bloqueio");
      expect(updateProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.programs[0].status).toBe("rascunho");
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });

    it("reactivate consulta a guarda no momento da ação, bloqueia com a mensagem exata e não chama o repository", async () => {
      const inativo = programa({ id: "p-i", status: "inativo" });
      mockList([inativo]);
      quandoGuardaDeAtivacao(false);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expectGuardaNaoConsultada();

      await executar(() => result.current.reactivate(inativo));

      expectGuardaConsultada("p-i");
      expect(result.current.errorMsg).toBe(GUARDA);
      expect(result.current.errorOrigin).toBe("bloqueio");
      expect(updateProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.programs[0].status).toBe("inativo");
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });

    it("guarda também bloqueia quando o pedido vem pelo fluxo de confirmação", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([rascunho]);
      quandoGuardaDeAtivacao(false);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.requestConfirm("ativar", rascunho);
      });
      // A consulta fresca acontece na ação (confirm), não em requestConfirm.
      expectGuardaNaoConsultada();
      await executar(() => result.current.confirm());

      expectGuardaConsultada("p-r");
      expect(result.current.errorMsg).toBe(GUARDA);
      expect(result.current.errorOrigin).toBe("bloqueio");
      expect(updateProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.programs[0].status).toBe("rascunho");
      expect(result.current.confirmAction).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Ativação/reativação liberadas (consulta fresca = true) + efeito colateral
  // -------------------------------------------------------------------------
  describe("4. Ativação/reativação com guarda fresca = true", () => {
    it("activate consulta a guarda, chama repository, desativa o anterior do mesmo dono e preserva o ativo de outro dono", async () => {
      const pRascunho = programa({ id: "p-novo", status: "rascunho", createdAt: "2026-09-25T00:00:00.000Z" });
      const pAtivo = programa({ id: "p-ativo", status: "ativo", createdAt: "2026-09-10T00:00:00.000Z" });
      const pOutro = programa({ id: "p-outro", status: "ativo", owner: OUTRO, createdAt: "2026-09-01T00:00:00.000Z" });
      const depois: Program[] = [
        { ...pRascunho, status: "ativo" },
        { ...pAtivo, status: "inativo" },
        pOutro,
      ];
      mockList([pRascunho, pAtivo, pOutro], depois);
      vi.mocked(updateProgramStandalone).mockResolvedValue({ ...pRascunho, status: "ativo" });
      quandoGuardaDeAtivacao(true);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expectGuardaNaoConsultada();

      await executar(() => result.current.activate(pRascunho));

      expectGuardaConsultada("p-novo");
      expect(updateProgramStandalone).toHaveBeenCalledWith("p-novo", { status: "ativo" });
      await waitFor(() => {
        expect(statusesDaLista(result)).toEqual([
          "p-novo:ativo",
          "p-ativo:inativo",
          "p-outro:ativo",
        ]);
      });
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      // Efeito colateral aplicado via program-utils (critério 4 da #2, literal).
      expect(vi.mocked(aplicarEfeitoColateralAtivacao)).toHaveBeenCalledWith(
        expect.any(Array),
        EMAIL,
      );
    });

    it("reactivate consulta a guarda, chama repository, desativa o anterior do mesmo dono e preserva o ativo de outro dono", async () => {
      const pInativo = programa({ id: "p-inativo", status: "inativo", createdAt: "2026-09-25T00:00:00.000Z" });
      const pAtivo = programa({ id: "p-ativo", status: "ativo", createdAt: "2026-09-10T00:00:00.000Z" });
      const pOutro = programa({ id: "p-outro", status: "ativo", owner: OUTRO, createdAt: "2026-09-01T00:00:00.000Z" });
      const depois: Program[] = [
        { ...pInativo, status: "ativo" },
        { ...pAtivo, status: "inativo" },
        pOutro,
      ];
      mockList([pInativo, pAtivo, pOutro], depois);
      vi.mocked(updateProgramStandalone).mockResolvedValue({ ...pInativo, status: "ativo" });
      quandoGuardaDeAtivacao(true);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expectGuardaNaoConsultada();

      await executar(() => result.current.reactivate(pInativo));

      expectGuardaConsultada("p-inativo");
      expect(updateProgramStandalone).toHaveBeenCalledWith("p-inativo", { status: "ativo" });
      await waitFor(() => {
        expect(statusesDaLista(result)).toEqual([
          "p-inativo:ativo",
          "p-ativo:inativo",
          "p-outro:ativo",
        ]);
      });
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(vi.mocked(aplicarEfeitoColateralAtivacao)).toHaveBeenCalledWith(
        expect.any(Array),
        EMAIL,
      );
    });

    it.each([
      ["activate", "rascunho"],
      ["reactivate", "inativo"],
    ] as const)(
      "falha na consulta da guarda em %s vira origem 'operacao', não chama o repository e é relançada",
      async (metodo, status) => {
        const alvo = programa({ id: "p-alvo", status });
        mockList([alvo]);
        quandoFalhaGuardaDeAtivacao(new Error("falha na consulta da guarda"));

        const { result } = renderHook(() => usePrograms());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const erro = await executarECapturar(() => result.current[metodo](alvo));

        expectGuardaConsultada("p-alvo");
        expect(erro).toBeInstanceOf(Error);
        expect((erro as Error).message).toBe("falha na consulta da guarda");
        expect(result.current.errorMsg).toBe("falha na consulta da guarda");
        expect(result.current.errorOrigin).toBe("operacao");
        expect(updateProgramStandalone).not.toHaveBeenCalled();
        expect(statusesDaLista(result)).toEqual([`p-alvo:${status}`]);
        expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
      },
    );
  });

  // -------------------------------------------------------------------------
  // 5. remove: só status 'rascunho' + guarda fresca de treinos (D6)
  // -------------------------------------------------------------------------
  describe("5. remove: só rascunho + consulta fresca de treinos", () => {
    it("remove de rascunho consulta hasWorkouts no momento da ação, chama repository e recarrega a lista", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho", createdAt: "2026-09-20T00:00:00.000Z" });
      const restante = programa({ id: "p-a", status: "ativo", createdAt: "2026-09-10T00:00:00.000Z" });
      mockList([rascunho, restante], [restante]);
      vi.mocked(deleteProgramStandalone).mockResolvedValue(undefined);
      quandoHaTreinos(false);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      // Frescor (plan.md §2): a montagem não consulta.
      expectTreinosNaoConsultados();

      await executar(() => result.current.remove(rascunho));

      expectTreinosConsultados("p-r");
      expect(deleteProgramStandalone).toHaveBeenCalledWith("p-r");
      await waitFor(() =>
        expect(result.current.programs.map((p) => p.id)).toEqual(["p-a"]),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });

    it.each(["ativo", "inativo"] as const)(
      "remove bloqueado em status '%s': sem consulta de treinos, sem repository, com aviso e lista intacta",
      async (status) => {
        const bloqueado = programa({ id: "p-x", status });
        mockList([bloqueado]);

        const { result } = renderHook(() => usePrograms());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await executar(() => result.current.remove(bloqueado));

        // plan.md §3: a checagem de status vem ANTES da consulta de treinos.
        expectTreinosNaoConsultados();
        expect(deleteProgramStandalone).not.toHaveBeenCalled();
        expect(result.current.errorMsg).not.toBeNull();
        expect(result.current.errorOrigin).toBe("bloqueio");
        expect(result.current.programs).toHaveLength(1);
        expect(result.current.programs[0].status).toBe(status);
        expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
      },
    );

    it("excluir rascunho COM treinos bloqueia com MSG_PROGRAMA_COM_TREINOS, origem 'bloqueio' e sem delete", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([rascunho]);
      quandoHaTreinos(true);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expectTreinosNaoConsultados();

      const erro = await executarECapturar(() => result.current.remove(rascunho));

      expectTreinosConsultados("p-r");
      // Literal de MSG_PROGRAMA_COM_TREINOS (D6 do spec §3, valor já travado
      // em __tests__/lib/milon/workout-utils.test.ts).
      expect(result.current.errorMsg).toBe(MSG_PROGRAMA_COM_TREINOS);
      expect((erro as Error).message).toBe(MSG_PROGRAMA_COM_TREINOS);
      expect(result.current.errorOrigin).toBe("bloqueio");
      expect(deleteProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-r"]);
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });

    it("bloqueio de exclusão vindo da confirmação fecha o modal e mantém a lista (D6)", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([rascunho]);
      quandoHaTreinos(true);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.requestConfirm("excluir", rascunho);
      });
      const erro = await executarECapturar(() => result.current.confirm());

      expectTreinosConsultados("p-r");
      expect((erro as Error).message).toBe(MSG_PROGRAMA_COM_TREINOS);
      expect(result.current.confirmAction).toBeNull();
      expect(result.current.errorMsg).toBe(MSG_PROGRAMA_COM_TREINOS);
      expect(result.current.errorOrigin).toBe("bloqueio");
      expect(deleteProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-r"]);
    });

    it("falha na consulta de hasWorkouts vira origem 'operacao' sem chamar o delete", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([rascunho]);
      quandoFalhaConsultaTreinos(new Error("falha na consulta de treinos"));

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.remove(rascunho));

      expectTreinosConsultados("p-r");
      expect(result.current.errorMsg).toBe("falha na consulta de treinos");
      expect(result.current.errorOrigin).toBe("operacao");
      expect(deleteProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-r"]);
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 6. confirmAction — confirmação antes de ativar/reativar/excluir
  // -------------------------------------------------------------------------
  describe("6. confirmAction (confirmação obrigatória)", () => {
    it("requestConfirm guarda ação+programa sem executar; cancelConfirm descarta", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      const inativo = programa({ id: "p-i", status: "inativo" });
      mockList([rascunho, inativo]);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.confirmAction).toBeNull();

      act(() => {
        result.current.requestConfirm("excluir", rascunho);
      });
      expect(result.current.confirmAction).toMatchObject({
        action: "excluir",
        program: { id: "p-r" },
      });
      expect(deleteProgramStandalone).not.toHaveBeenCalled();

      act(() => {
        result.current.cancelConfirm();
      });
      expect(result.current.confirmAction).toBeNull();
      expect(deleteProgramStandalone).not.toHaveBeenCalled();

      act(() => {
        result.current.requestConfirm("ativar", rascunho);
      });
      expect(result.current.confirmAction).toMatchObject({
        action: "ativar",
        program: { id: "p-r" },
      });
      expect(updateProgramStandalone).not.toHaveBeenCalled();

      act(() => {
        result.current.requestConfirm("reativar", inativo);
      });
      expect(result.current.confirmAction).toMatchObject({
        action: "reativar",
        program: { id: "p-i" },
      });
      expect(updateProgramStandalone).not.toHaveBeenCalled();
      // Nada executado: só um fetch (montagem).
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });

    it("confirm executa a exclusão pendente e limpa confirmAction", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      const restante = programa({ id: "p-outro", status: "ativo", owner: OUTRO });
      mockList([rascunho, restante], [restante]);
      vi.mocked(deleteProgramStandalone).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.requestConfirm("excluir", rascunho);
      });
      await executar(() => result.current.confirm());

      expect(deleteProgramStandalone).toHaveBeenCalledWith("p-r");
      expect(result.current.confirmAction).toBeNull();
      await waitFor(() =>
        expect(result.current.programs.map((p) => p.id)).toEqual(["p-outro"]),
      );
    });

    it("confirm executa a ativação pendente quando a guarda libera", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      const depois: Program[] = [{ ...rascunho, status: "ativo" }];
      mockList([rascunho], depois);
      vi.mocked(updateProgramStandalone).mockResolvedValue({ ...rascunho, status: "ativo" });
      quandoGuardaDeAtivacao(true);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.requestConfirm("ativar", rascunho);
      });
      await executar(() => result.current.confirm());

      expect(updateProgramStandalone).toHaveBeenCalledWith("p-r", { status: "ativo" });
      expect(result.current.confirmAction).toBeNull();
      expect(result.current.errorMsg).toBeNull();
      await waitFor(() => expect(statusesDaLista(result)).toEqual(["p-r:ativo"]));
    });
  });

  // -------------------------------------------------------------------------
  // 7. Erro de repository → errorMsg visível e estado preservado
  // -------------------------------------------------------------------------
  describe("7. Erro de repository preserva o estado", () => {
    it("falha em remove mantém lista e filtros e expõe a mensagem", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho", createdAt: "2026-09-20T00:00:00.000Z" });
      const outro = programa({ id: "p-outro", status: "rascunho", owner: OUTRO, createdAt: "2026-09-15T00:00:00.000Z" });
      const ativo = programa({ id: "p-a", status: "ativo", createdAt: "2026-09-10T00:00:00.000Z" });
      mockList([rascunho, outro, ativo]);
      vi.mocked(deleteProgramStandalone).mockRejectedValue(
        new Error("Erro ao excluir programa"),
      );

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Estado de filtro montado antes do erro (para verificarmos preservação).
      act(() => {
        result.current.setOwnerFilter("");
      });
      act(() => {
        result.current.toggleStatusFilter("rascunho");
      });
      expect(result.current.filteredPrograms.map((p) => p.id)).toEqual(["p-a"]);

      await executar(() => result.current.remove(rascunho));

      expect(result.current.errorMsg).toContain("Erro ao excluir programa");
      expect(result.current.programs.map((p) => p.id)).toEqual([
        "p-r",
        "p-outro",
        "p-a",
      ]);
      expect(result.current.programs.map((p) => p.status)).toEqual([
        "rascunho",
        "rascunho",
        "ativo",
      ]);
      expect(result.current.ownerFilter).toBe("");
      expect([...result.current.statusFilters].sort()).toEqual(["ativo", "inativo"]);
      expect(result.current.filteredPrograms.map((p) => p.id)).toEqual(["p-a"]);
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });

    it("falha em activate preserva os status e expõe a mensagem", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho", createdAt: "2026-09-20T00:00:00.000Z" });
      const ativo = programa({ id: "p-a", status: "ativo", createdAt: "2026-09-10T00:00:00.000Z" });
      mockList([rascunho, ativo]);
      vi.mocked(updateProgramStandalone).mockRejectedValue(
        new Error("Erro ao atualizar programa"),
      );
      quandoGuardaDeAtivacao(true);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.activate(rascunho));

      expect(result.current.errorMsg).toContain("Erro ao atualizar programa");
      expect(statusesDaLista(result)).toEqual(["p-r:rascunho", "p-a:ativo"]);
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 8. save — criação/edição (spec §3: título não-vazio; dono = filtro/sessão)
  // -------------------------------------------------------------------------
  describe("8. save (criação e edição)", () => {
    it("cria com o dono do filtro ativo, normaliza o título e recarrega a lista", async () => {
      const existente = programa({ id: "p-1", createdAt: "2026-09-20T00:00:00.000Z" });
      const salvo = programa({
        id: "p-novo",
        title: "Ficha Monstro",
        createdAt: "2026-09-25T00:00:00.000Z",
      });
      mockList([existente], [salvo, existente]);
      vi.mocked(createProgramStandalone).mockResolvedValue(salvo);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      await waitFor(() => expect(result.current.ownerFilter).toBe(EMAIL));

      let retornado: Program | undefined;
      await act(async () => {
        retornado = await result.current.save("   Ficha Monstro  ");
      });

      expect(createProgramStandalone).toHaveBeenCalledWith({
        title: "Ficha Monstro",
        owner: EMAIL,
        status: "rascunho",
      });
      expect(retornado?.id).toBe("p-novo");
      await waitFor(() =>
        expect(result.current.programs.map((p) => p.id)).toEqual(["p-novo", "p-1"]),
      );
      expect(result.current.errorMsg).toBeNull();
      expect(updateProgramStandalone).not.toHaveBeenCalled();
    });

    it("dono vazio no filtro usa o e-mail da sessão como dono do novo programa", async () => {
      const existente = programa({ id: "p-1" });
      const salvo = programa({ id: "p-novo", title: "Ficha da sessão" });
      mockList([existente], [salvo, existente]);
      vi.mocked(createProgramStandalone).mockResolvedValue(salvo);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setOwnerFilter("");
      });

      await act(async () => {
        await result.current.save("Ficha da sessão");
      });

      expect(createProgramStandalone).toHaveBeenCalledWith({
        title: "Ficha da sessão",
        owner: EMAIL,
        status: "rascunho",
      });
    });

    it("sem e-mail de sessão cria com dono '' e o filtro de dono permanece vazio (sem erro)", async () => {
      vi.mocked(createBrowserDatabaseClient).mockReturnValueOnce({
        from: () => {
          throw new Error("não usado: os barrels são mockados neste teste");
        },
        getUserEmail: () => Promise.resolve(null),
      } as unknown as IDatabaseClient);

      const salvo = programa({ id: "p-novo", title: "Sem sessão" });
      mockList([], [salvo]);
      vi.mocked(createProgramStandalone).mockResolvedValue(salvo);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.ownerFilter).toBe("");
      expect(result.current.errorMsg).toBeNull();

      await act(async () => {
        await result.current.save("Sem sessão");
      });

      expect(createProgramStandalone).toHaveBeenCalledWith({
        title: "Sem sessão",
        owner: "",
        status: "rascunho",
      });
      expect(result.current.errorMsg).toBeNull();
    });

    it("sessão cujo getUserEmail rejeita não vira erro de carregamento", async () => {
      vi.mocked(createBrowserDatabaseClient).mockReturnValueOnce({
        from: () => {
          throw new Error("não usado: os barrels são mockados neste teste");
        },
        getUserEmail: () => Promise.reject(new Error("sessão indisponível")),
      } as unknown as IDatabaseClient);

      mockList([]);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.ownerFilter).toBe("");
      expect(result.current.errorMsg).toBeNull();
    });

    it("edita pelo id: normaliza o título, manda só o id+título e recarrega", async () => {
      const atual = programa({ id: "p-1", title: "Antigo" });
      const editado = programa({ id: "p-1", title: "Editado" });
      mockList([atual], [editado]);
      vi.mocked(updateProgramStandalone).mockResolvedValue(editado);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let retornado: Program | undefined;
      await act(async () => {
        retornado = await result.current.save("  Editado ", "p-1");
      });

      expect(updateProgramStandalone).toHaveBeenCalledWith("p-1", { title: "Editado" });
      expect(createProgramStandalone).not.toHaveBeenCalled();
      expect(retornado?.id).toBe("p-1");
      await waitFor(() =>
        expect(result.current.programs.map((p) => p.title)).toEqual(["Editado"]),
      );
      expect(result.current.errorMsg).toBeNull();
    });

    it("título vazio é bloqueado antes de qualquer chamada ao repository", async () => {
      mockList([programa({ id: "p-1" })]);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let thrown: unknown;
      await act(async () => {
        try {
          await result.current.save("   ");
        } catch (err: unknown) {
          thrown = err;
        }
      });

      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toContain("Título não pode estar vazio");
      expect(createProgramStandalone).not.toHaveBeenCalled();
      expect(updateProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.programs).toHaveLength(1);
    });

    it("recarga pós-criação falha: o programa novo entra em memória sem perder o save", async () => {
      const existente = programa({ id: "p-1", createdAt: "2026-09-20T00:00:00.000Z" });
      const salvo = programa({ id: "p-novo", title: "Sobrevive", createdAt: "2026-09-25T00:00:00.000Z" });
      vi.mocked(listProgramsStandalone)
        .mockResolvedValueOnce([existente])
        .mockRejectedValueOnce(new Error("reload caiu"));
      vi.mocked(createProgramStandalone).mockResolvedValue(salvo);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let retornado: Program | undefined;
      await act(async () => {
        retornado = await result.current.save("Sobrevive");
      });

      expect(retornado?.id).toBe("p-novo");
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-novo", "p-1"]);
      expect(result.current.errorMsg).toBeNull();
    });

    it("recarga pós-edição falha: o item é substituído em memória", async () => {
      const atual = programa({ id: "p-1", title: "Antigo" });
      const editado = programa({ id: "p-1", title: "Editado" });
      vi.mocked(listProgramsStandalone)
        .mockResolvedValueOnce([atual])
        .mockRejectedValueOnce(new Error("reload caiu"));
      vi.mocked(updateProgramStandalone).mockResolvedValue(editado);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.save("Editado", "p-1");
      });

      expect(result.current.programs.map((p) => p.title)).toEqual(["Editado"]);
      expect(result.current.errorMsg).toBeNull();
    });

    it("erro do repository é relançado ao modal sem alimentar o errorMsg da lista", async () => {
      mockList([programa({ id: "p-1" })]);
      vi.mocked(createProgramStandalone).mockRejectedValue(
        new Error("título já usado em outro programa"),
      );

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let thrown: unknown;
      await act(async () => {
        try {
          await result.current.save("Duplicado");
        } catch (err: unknown) {
          thrown = err;
        }
      });

      expect((thrown as Error).message).toBe("título já usado em outro programa");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-1"]);
      expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
    });

    it("erro sem formato de Error vira mensagem padrão na relançagem", async () => {
      mockList([programa({ id: "p-1" })]);
      vi.mocked(updateProgramStandalone).mockRejectedValue("falha crua do driver");

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let thrown: unknown;
      await act(async () => {
        try {
          await result.current.save("Qualquer", "p-1");
        } catch (err: unknown) {
          thrown = err;
        }
      });

      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toBe("Erro ao salvar programa");
      expect(result.current.errorMsg).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 9. Fallbacks quando a recarga posterior falha
  // -------------------------------------------------------------------------
  describe("9. Recargas com falha preservam o resultado local", () => {
    it("reload com falha expõe a mensagem e uma nova tentativa recupera", async () => {
      mockList([programa({ id: "p-1" })]);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      vi.mocked(listProgramsStandalone).mockRejectedValueOnce(
        new Error("rede caiu no reload"),
      );
      await executar(() => result.current.reload());

      expect(result.current.errorMsg).toContain("rede caiu no reload");
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-1"]);

      vi.mocked(listProgramsStandalone).mockResolvedValue([
        programa({ id: "p-1" }),
        programa({ id: "p-2", createdAt: "2026-09-25T00:00:00.000Z" }),
      ]);
      await executar(() => result.current.reload());

      expect(result.current.errorMsg).toBeNull();
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-1", "p-2"]);
    });

    it("recarga pós-exclusão falha: o item sai da lista em memória", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      vi.mocked(listProgramsStandalone)
        .mockResolvedValueOnce([rascunho])
        .mockRejectedValueOnce(new Error("reload caiu"));
      vi.mocked(deleteProgramStandalone).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.remove(rascunho));

      expect(deleteProgramStandalone).toHaveBeenCalledWith("p-r");
      expect(result.current.programs).toEqual([]);
      expect(result.current.errorMsg).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 10. confirm com reativação (ramo "reativar" da confirmação)
  // -------------------------------------------------------------------------
  it("confirm executa a reativação pendente quando a guarda libera", async () => {
    const inativo = programa({ id: "p-i", status: "inativo" });
    mockList([inativo], [{ ...inativo, status: "ativo" }]);
    vi.mocked(updateProgramStandalone).mockResolvedValue({ ...inativo, status: "ativo" });
    quandoGuardaDeAtivacao(true);

    const { result } = renderHook(() => usePrograms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.requestConfirm("reativar", inativo);
    });
    await executar(() => result.current.confirm());

    expect(updateProgramStandalone).toHaveBeenCalledWith("p-i", { status: "ativo" });
    expect(result.current.confirmAction).toBeNull();
    expect(result.current.errorMsg).toBeNull();
    await waitFor(() => expect(statusesDaLista(result)).toEqual(["p-i:ativo"]));
  });

  it("hooks/index exporta usePrograms como caminho oficial", () => {
    expect(typeof hooksIndex.usePrograms).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Patch v4 (D15, R13–R17) — ORIGEM DA MENSAGEM: carga × operação × bloqueio
// Contrato RED da TASK-022. Fonte: spec.md "Patch v4" (D15, R13–R17, CA-P3-13…15)
// + plan.md "Aditivo Patch v4" §3 (contratos: tipo, hook, ProgramList) e §5
// decisão 1 (canal de origem = SEGUNDO CAMPO `errorOrigin`, não objeto/código/
// booleano) + tasks.json TASK-022 acceptanceCriteria.
//
// CONTRATO CONSUMIDO (plan.md §3, ainda INEXISTENTE na produção):
//   - `lib/milon/types.ts` exporta `ProgramErrorOrigin` = "carga" | "operacao" |
//     "bloqueio";
//   - `UseProgramsReturn` ganha `errorOrigin: ProgramErrorOrigin | null`.
//
// STATUS: RED esperado (TASK-023/Hefesto torna verde, sem mexer neste arquivo).
// Hoje o hook não expõe `errorOrigin`: toda asserção de origem falha com
// `undefined` — o motivo exato exigido pelo acceptanceCriteria 5 ("falha por
// campo/prop inexistente"), não erro de sintaxe. O cast fixa os NOMES travados
// no plan para o tsc --noEmit continuar verde até a TASK-023.
// ---------------------------------------------------------------------------

interface ContratoUseProgramsComOrigem {
  errorOrigin: "carga" | "operacao" | "bloqueio" | null;
}

/** Lê o campo `errorOrigin` do contrato do plan (hoje ausente → `undefined`). */
function origemDe(result: { current: unknown }): ContratoUseProgramsComOrigem["errorOrigin"] {
  return (result.current as ContratoUseProgramsComOrigem).errorOrigin;
}

const MENSAGEM_EXCLUSAO = "Somente programas em rascunho podem ser excluídos";

describe("Mílon #2 — usePrograms: origem da mensagem (Patch v4, TASK-022 RED)", () => {
  beforeEach(() => {
    prepararMocks();
  });

  // -------------------------------------------------------------------------
  // 1. As 6 gravações de origem (TASK-022 acceptanceCriteria 1)
  // -------------------------------------------------------------------------
  describe("1. Gravação da origem nos pontos mapeados", () => {
    it("fetch de carga falhando na montagem grava errorMsg não nulo com origem 'carga'", async () => {
      vi.mocked(listProgramsStandalone).mockRejectedValue(new Error("falha de rede"));

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.errorMsg).toContain("falha de rede");
      expect(origemDe(result)).toBe("carga");
    });

    it("falha no fetchList (reload) também grava origem 'carga'", async () => {
      mockList([programa({ id: "p-1" })]);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      vi.mocked(listProgramsStandalone).mockRejectedValueOnce(
        new Error("rede caiu no reload"),
      );
      await executar(() => result.current.reload());

      expect(result.current.errorMsg).toContain("rede caiu no reload");
      expect(origemDe(result)).toBe("carga");
    });

    it("guarda de ativação bloqueando grava origem 'bloqueio' sem chamar o repositório", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([rascunho]);
      quandoGuardaDeAtivacao(false);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.activate(rascunho));

      expectGuardaConsultada("p-r");
      expect(result.current.errorMsg).toBe(GUARDA);
      expect(origemDe(result)).toBe("bloqueio");
      expect(updateProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.programs[0].status).toBe("rascunho");
    });

    it("guarda de reativação bloqueando grava origem 'bloqueio' sem chamar o repositório", async () => {
      const inativo = programa({ id: "p-i", status: "inativo" });
      mockList([inativo]);
      quandoGuardaDeAtivacao(false);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.reactivate(inativo));

      expectGuardaConsultada("p-i");
      expect(result.current.errorMsg).toBe(GUARDA);
      expect(origemDe(result)).toBe("bloqueio");
      expect(updateProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.programs[0].status).toBe("inativo");
    });

    it.each([
      ["activate", "rascunho"],
      ["reactivate", "inativo"],
    ] as const)(
      "falha de repositório em %s grava origem 'operacao' preservando o status",
      async (metodo, status) => {
        const alvo = programa({ id: "p-alvo", status });
        mockList([alvo]);
        vi.mocked(updateProgramStandalone).mockRejectedValue(
          new Error("Erro ao atualizar programa"),
        );
        quandoGuardaDeAtivacao(true);

        const { result } = renderHook(() => usePrograms());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await executar(() => result.current[metodo](alvo));

        expect(result.current.errorMsg).toContain("Erro ao atualizar programa");
        expect(origemDe(result)).toBe("operacao");
        expect(result.current.programs[0].status).toBe(status);
        expect(listProgramsStandalone).toHaveBeenCalledTimes(1);
      },
    );

    it(`regra de exclusão de não-rascunho grava origem 'bloqueio' com a mensagem exata e sem chamar o repositório`, async () => {
      const ativo = programa({ id: "p-a", status: "ativo" });
      mockList([ativo]);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.remove(ativo));

      // Status guardado ANTES da consulta de treinos (plan.md §3).
      expectTreinosNaoConsultados();
      expect(result.current.errorMsg).toBe(MENSAGEM_EXCLUSAO);
      expect(origemDe(result)).toBe("bloqueio");
      expect(deleteProgramStandalone).not.toHaveBeenCalled();
      expect(result.current.programs[0].status).toBe("ativo");
    });

    it("falha de delete em remove grava origem 'operacao' preservando a lista", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([rascunho]);
      vi.mocked(deleteProgramStandalone).mockRejectedValue(
        new Error("Erro ao excluir programa"),
      );
      quandoHaTreinos(false);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.remove(rascunho));

      expect(result.current.errorMsg).toContain("Erro ao excluir programa");
      expect(origemDe(result)).toBe("operacao");
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-r"]);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Sucesso zera errorMsg e errorOrigin (TASK-022 acceptanceCriteria 1,
  //    última parte; plan.md §3 "qualquer sucesso zera os dois campos")
  // -------------------------------------------------------------------------
  describe("2. Sucesso zera errorMsg e errorOrigin", () => {
    it("recuperação após falha de carga zera os dois campos", async () => {
      vi.mocked(listProgramsStandalone)
        .mockRejectedValueOnce(new Error("falha de rede"))
        .mockResolvedValue([programa({ id: "p-1" })]);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(origemDe(result)).toBe("carga");

      await executar(() => result.current.reload());

      expect(result.current.errorMsg).toBeNull();
      expect(origemDe(result)).toBeNull();
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-1"]);
    });

    it("ativação bem-sucedida após falha de operação zera os dois campos", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([rascunho]);
      vi.mocked(updateProgramStandalone)
        .mockRejectedValueOnce(new Error("Erro ao atualizar programa"))
        .mockResolvedValue({ ...rascunho, status: "ativo" });
      quandoGuardaDeAtivacao(true);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.activate(rascunho));
      expect(origemDe(result)).toBe("operacao");

      await executar(() => result.current.activate(rascunho));

      expect(result.current.errorMsg).toBeNull();
      expect(origemDe(result)).toBeNull();
      expect(result.current.programs[0].status).toBe("ativo");
    });

    it("ativação liberada após bloqueio da guarda zera os dois campos (valor fresco por ação)", async () => {
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([rascunho], [{ ...rascunho, status: "ativo" }]);
      vi.mocked(updateProgramStandalone).mockResolvedValue({ ...rascunho, status: "ativo" });
      quandoGuardaDeAtivacao(false);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.activate(rascunho));
      expect(result.current.errorMsg).toBe(GUARDA);
      expect(origemDe(result)).toBe("bloqueio");
      expect(updateProgramStandalone).not.toHaveBeenCalled();

      // O dado fresco muda entre uma ação e outra — sem remontar o hook.
      quandoGuardaDeAtivacao(true);
      await executar(() => result.current.activate(rascunho));

      expectGuardaConsultada("p-r");
      expect(updateProgramStandalone).toHaveBeenCalledTimes(1);
      expect(result.current.errorMsg).toBeNull();
      expect(origemDe(result)).toBeNull();
      expect(result.current.programs[0].status).toBe("ativo");
    });

    it("exclusão de rascunho após bloqueio anterior zera os dois campos", async () => {
      const ativo = programa({ id: "p-a", status: "ativo" });
      const rascunho = programa({ id: "p-r", status: "rascunho" });
      mockList([ativo, rascunho], [ativo]);
      vi.mocked(deleteProgramStandalone).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await executar(() => result.current.remove(ativo));
      expect(origemDe(result)).toBe("bloqueio");

      await executar(() => result.current.remove(rascunho));

      expect(result.current.errorMsg).toBeNull();
      expect(origemDe(result)).toBeNull();
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-a"]);
    });
  });

  // -------------------------------------------------------------------------
  // 3. save() fica FORA do canal de origem (TASK-022 acceptanceCriteria 2;
  //    plan.md §3 "`save()` não grava em nenhum dos dois (relança para o modal)"
  //    + Restrição Global "erro de save continua não alimentando a lista")
  // -------------------------------------------------------------------------
  describe("3. save() não alimenta o canal de origem", () => {
    it("falha de repositório no save relança ao modal sem tocar em errorMsg nem errorOrigin", async () => {
      mockList([programa({ id: "p-1" })]);
      vi.mocked(createProgramStandalone).mockRejectedValue(
        new Error("título já usado em outro programa"),
      );

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let thrown: unknown;
      await act(async () => {
        try {
          await result.current.save("Duplicado");
        } catch (err: unknown) {
          thrown = err;
        }
      });

      expect((thrown as Error).message).toBe("título já usado em outro programa");
      expect(result.current.errorMsg).toBeNull();
      expect(origemDe(result)).toBeNull();
    });

    it("validação de título vazio também não toca em errorMsg nem errorOrigin", async () => {
      mockList([programa({ id: "p-1" })]);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(result.current.save("   ")).rejects.toBeInstanceOf(Error);
      });

      expect(result.current.errorMsg).toBeNull();
      expect(origemDe(result)).toBeNull();
      expect(createProgramStandalone).not.toHaveBeenCalled();
      expect(updateProgramStandalone).not.toHaveBeenCalled();
    });

    it("save bem-sucedido deixa errorMsg e errorOrigin nulos", async () => {
      const existente = programa({ id: "p-1" });
      const salvo = programa({ id: "p-novo", title: "Ficha Novo" });
      mockList([existente], [salvo, existente]);
      vi.mocked(createProgramStandalone).mockResolvedValue(salvo);

      const { result } = renderHook(() => usePrograms());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.save("Ficha Novo");
      });

      expect(result.current.errorMsg).toBeNull();
      expect(origemDe(result)).toBeNull();
      expect(result.current.programs.map((p) => p.id)).toEqual(["p-novo", "p-1"]);
    });
  });
});
