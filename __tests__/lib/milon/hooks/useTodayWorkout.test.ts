/**
 * Contrato RED — Mílon #4 Treino do Dia (TASK-001): `lib/milon/hooks/useTodayWorkout.ts`.
 *
 * Fonte da verdade: `.agents/modules/milon/04-treino-do-dia/spec.md`
 * (§3 "Navegação e seleção do treino exibido" + §3 "Vazios" + §2 estados +
 * §5 Critérios de Aceite) + `plan.md` §2 (tabela Create: `useTodayWorkout`) +
 * §3 (contrato textual `UseTodayWorkoutReturn`) + `tasks.json` TASK-001
 * (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/hooks/useTodayWorkout` ainda não existe — Expected: FAIL
 * com "módulo não encontrado" (nenhum arquivo de produção alterado).
 * Hefesto fará GREEN apenas com o contrato do plano — sem inventar APIs.
 *
 * Padrão espelhado de `__tests__/lib/milon/hooks/useProgramWorkouts.test.ts`:
 * `vi.mock` dos barrels `db/programs` + `db/workouts` cobrindo TODOS os
 * exports (forma com `db` + standalones + const de unicidade), promise-chain +
 * flag `cancelled` no hook, `waitFor` para a carga. E-mail da sessão vem do
 * mock global de `__tests__/setup.ts` ("teste@hestia.com"); casos sem sessão
 * sobrescrevem `createBrowserDatabaseClient` via `mockReturnValueOnce`
 * (padrão `usePrograms.test.ts`:987-993).
 *
 * CONTRATO CONSUMIDO (plan.md §3 — `UseTodayWorkoutReturn`):
 * - retorno: `{ program, workouts, selectedWorkoutId, selectWorkout,
 *   loading, errorMsg, errorOrigin, retry }` (+ `successNotice` nulo na v1,
 *   sem escrita própria — asserção tolerante: se exposto, deve ser nulo);
 * - cadeia: `createBrowserDatabaseClient().getUserEmail()`
 *   → `findActiveProgramByOwnerStandalone(email)` → se nulo, vazio orientador
 *   (sem erro); se programa, `listWorkoutsByProgramStandalone(program.id)`
 *   → se vazio, vazio orientador; senão `selectedWorkoutId` = id do primeiro
 *   da lista devolvida pelo standalone (ordem de criação);
 * - `selectWorkout(workoutId)`: troca somente se o id existir na lista atual;
 *   fora da lista é ignorado sem erro;
 * - falha em qualquer etapa da cadeia → `errorMsg` não-nulo com
 *   `errorOrigin: 'carga'` e `retry` repete a cadeia com sucesso;
 * - sem `use-cases/`/`schemas/`/`mappers`/`services/` novos, sem repository/
 *   fake/contract/migration novos; operações só via barrels
 *   `lib/milon/db/programs` + `lib/milon/db/workouts` (critério estático,
 *   verificado pós-Hefesto via grep por `@supabase/*` fora de `lib/shared/`).
 *
 * Convenções fixadas aqui (não ditas literalmente pela spec; derivadas do
 * contrato do plano e do padrão do módulo):
 * - `workouts` preserva a ordem devolvida pelo standalone (o hook não
 *   reordena — ordenação por criação já é do repository);
 * - `selectWorkout` é síncrono sobre a lista atual (sem recarga, sem
 *   navegação — a página repassa o id à seção de detalhe);
 * - `retry` é `() => Promise<void>` que repete e-mail → ativo → treinos.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTodayWorkout } from "@/lib/milon/hooks/useTodayWorkout";
import * as hooksIndex from "@/lib/milon/hooks";
import { findActiveProgramByOwnerStandalone } from "@/lib/milon/db/programs";
import { listWorkoutsByProgramStandalone } from "@/lib/milon/db/workouts";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { Program, Workout } from "@/lib/milon/types";

// Barrel `db/programs` mockado no padrão dos testes de hook do projeto: o
// factory cobre TODOS os exports do barrel real (forma com `db` + standalones
// + const de unicidade), para o import do hook não quebrar.
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

// Barrel `db/workouts` mockado no padrão de `useProgramWorkouts.test.ts`: o
// factory cobre TODOS os exports (forma com `db` + standalones).
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

/** Sessão sem e-mail (dono sem login resolvido): `getUserEmail()` → nulo. */
function mockSemEmail(): void {
  vi.mocked(createBrowserDatabaseClient).mockReturnValueOnce({
    from: () => {
      throw new Error("não usado: os barrels são mockados neste teste");
    },
    getUserEmail: () => Promise.resolve(null),
  } as unknown as IDatabaseClient);
}

// ---------------------------------------------------------------------------

describe("Mílon #4 — useTodayWorkout (contrato RED, TASK-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Zera queues/implementações SÓ dos mocks deste teste (o client global de
    // setup.ts é preservado — getUserEmail continua respondendo "teste@hestia.com").
    vi.mocked(findActiveProgramByOwnerStandalone).mockReset();
    vi.mocked(listWorkoutsByProgramStandalone).mockReset();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. Contrato: nomes exatos do retorno (plan.md §3)
  // -------------------------------------------------------------------------
  describe("1. Contrato do retorno (nomes exatos)", () => {
    it("expõe program/workouts/selectedWorkoutId/selectWorkout/loading/errorMsg/errorOrigin/retry", async () => {
      // Dado um dono com programa ativo contendo treinos
      const programa = makeProgram({ id: "p-1" });
      const treinos = [
        makeWorkout({ id: "w-1", programId: "p-1", name: "Treino A" }),
        makeWorkout({
          id: "w-2",
          programId: "p-1",
          name: "Treino B",
          createdAt: "2026-10-01T11:00:00.000Z",
        }),
      ];
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);

      // Quando o hook resolve a cadeia
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então todos os campos do contrato existem com os nomes exatos
      expect(result.current.program).toEqual(programa);
      expect(result.current.workouts).toEqual(treinos);
      expect(result.current.selectedWorkoutId).toBe("w-1");
      expect(typeof result.current.selectWorkout).toBe("function");
      expect(result.current.loading).toBe(false);
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(typeof result.current.retry).toBe("function");
      // successNotice é nulo na v1 (sem escrita própria) — tolerante: se o
      // hook expuser o campo, deve ser nulo; se não expuser, o contrato dos
      // 8 campos acima já vale.
      if ("successNotice" in result.current) {
        expect(
          (result.current as { successNotice: unknown }).successNotice,
        ).toBeNull();
      }
      expect(findActiveProgramByOwnerStandalone).toHaveBeenCalledWith(EMAIL);
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledWith("p-1");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Vazios orientadores (sem erro de carga)
  // -------------------------------------------------------------------------
  describe("2. Vazios orientadores (sem erro)", () => {
    it("Dado sessão sem e-mail, Quando resolve, Então retorna vazio sem erro e sem chamar os standalones", async () => {
      // Dado sessão sem e-mail resolvido
      mockSemEmail();

      // Quando o hook monta
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então vazio orientador: página exibe "sem treino ativo" sem erro
      expect(result.current.program).toBeNull();
      expect(result.current.workouts).toEqual([]);
      expect(result.current.selectedWorkoutId).toBeNull();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(findActiveProgramByOwnerStandalone).not.toHaveBeenCalled();
      expect(listWorkoutsByProgramStandalone).not.toHaveBeenCalled();
    });

    it("Dado dono sem programa ativo, Quando resolve, Então retorna vazio sem erro e não lista treinos", async () => {
      // Dado dono logado sem programa ativo
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(null);

      // Quando o hook monta
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então vazio orientador (orienta ativar/criar programa), sem erro
      expect(result.current.program).toBeNull();
      expect(result.current.workouts).toEqual([]);
      expect(result.current.selectedWorkoutId).toBeNull();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(findActiveProgramByOwnerStandalone).toHaveBeenCalledWith(EMAIL);
      expect(listWorkoutsByProgramStandalone).not.toHaveBeenCalled();
    });

    it("Dado programa ativo sem treinos, Quando resolve, Então retorna vazio sem erro com o programa presente", async () => {
      // Dado programa ativo do dono sem treinos
      const programa = makeProgram({ id: "p-1" });
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue([]);

      // Quando o hook monta
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então vazio orientador (orienta adicionar o primeiro treino), sem erro
      expect(result.current.program).toEqual(programa);
      expect(result.current.workouts).toEqual([]);
      expect(result.current.selectedWorkoutId).toBeNull();
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Seleção: default no primeiro + troca restrita à lista
  // -------------------------------------------------------------------------
  describe("3. Seleção do treino do dia", () => {
    it("Dado programa ativo com treinos, Quando resolve, Então o selecionado é o primeiro da lista do standalone (ordem de criação)", async () => {
      // Dado programa ativo com treinos na ordem de criação do standalone
      const programa = makeProgram({ id: "p-1" });
      const treinos = [
        makeWorkout({ id: "w-1", programId: "p-1", name: "Treino A" }),
        makeWorkout({
          id: "w-2",
          programId: "p-1",
          name: "Treino B",
          createdAt: "2026-10-01T11:00:00.000Z",
        }),
        makeWorkout({
          id: "w-3",
          programId: "p-1",
          name: "Treino C",
          createdAt: "2026-10-01T12:00:00.000Z",
        }),
      ];
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);

      // Quando o hook monta
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então o primeiro por criação é o dia 1 (default), ordem preservada
      expect(result.current.workouts.map((w: Workout) => w.id)).toEqual([
        "w-1",
        "w-2",
        "w-3",
      ]);
      expect(result.current.selectedWorkoutId).toBe("w-1");
    });

    it("Dada a troca de treino, Quando o id está na lista, Então troca; Quando fora da lista, mantém o atual sem erro", async () => {
      // Dado programa ativo com dois treinos e o primeiro selecionado
      const programa = makeProgram({ id: "p-1" });
      const treinos = [
        makeWorkout({ id: "w-1", programId: "p-1", name: "Treino A" }),
        makeWorkout({
          id: "w-2",
          programId: "p-1",
          name: "Treino B",
          createdAt: "2026-10-01T11:00:00.000Z",
        }),
      ];
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);

      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.selectedWorkoutId).toBe("w-1");

      // Quando troca para um id da lista (treino do mesmo programa ativo)
      act(() => {
        result.current.selectWorkout("w-2");
      });

      // Então o selecionado muda, sem erro e sem recarga
      expect(result.current.selectedWorkoutId).toBe("w-2");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(1);

      // Quando tenta trocar para id fora da lista (outro programa/outro dono)
      act(() => {
        result.current.selectWorkout("w-de-outro-programa");
      });

      // Então mantém o atual, sem erro (ignorado silenciosamente)
      expect(result.current.selectedWorkoutId).toBe("w-2");
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Erro de carga com origem `carga` + retry recarrega
  // -------------------------------------------------------------------------
  describe("4. Erro de carga (origem 'carga') e retry", () => {
    it("Dada falha ao buscar o programa ativo, Quando monta, Então errorMsg com origem 'carga' e o retry recarrega com sucesso", async () => {
      // Dado que a 1ª chamada (montagem) REJEITA e o fallback resolve no retry
      // (FIFO: mockRejectedValueOnce consumido pela montagem, mockResolvedValue
      // alimenta o retry — padrão homologado de useProgramWorkouts.test.ts).
      const programa = makeProgram({ id: "p-1" });
      const treinos = [makeWorkout({ id: "w-1", programId: "p-1" })];
      vi.mocked(findActiveProgramByOwnerStandalone)
        .mockRejectedValueOnce(new Error("falha de rede"))
        .mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone).mockResolvedValue(treinos);

      // Quando o hook monta sob falha
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então erro de carga com origem `carga` (AsyncState da página com retry)
      expect(result.current.errorMsg).toContain("falha de rede");
      expect(result.current.errorOrigin).toBe("carga");
      expect(result.current.program).toBeNull();
      expect(result.current.workouts).toEqual([]);
      expect(result.current.selectedWorkoutId).toBeNull();

      // Quando aciona o retry
      await act(async () => {
        await result.current.retry();
      });

      // Então recarrega a cadeia com sucesso (programa + primeiro selecionado)
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.program).toEqual(programa);
      expect(result.current.selectedWorkoutId).toBe("w-1");
      expect(findActiveProgramByOwnerStandalone).toHaveBeenCalledTimes(2);
    });

    it("Dada falha ao listar os treinos, Quando monta, Então errorMsg com origem 'carga' e o retry recarrega com sucesso", async () => {
      // Dado programa ativo resolvido mas lista de treinos rejeitando na montagem
      const programa = makeProgram({ id: "p-1" });
      const treinos = [makeWorkout({ id: "w-1", programId: "p-1" })];
      vi.mocked(findActiveProgramByOwnerStandalone).mockResolvedValue(programa);
      vi.mocked(listWorkoutsByProgramStandalone)
        .mockRejectedValueOnce(new Error("falha ao listar treinos"))
        .mockResolvedValue(treinos);

      // Quando o hook monta sob falha
      const { result } = renderHook(() => useTodayWorkout());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Então erro de carga com origem `carga`
      expect(result.current.errorMsg).toContain("falha ao listar treinos");
      expect(result.current.errorOrigin).toBe("carga");
      expect(result.current.program).toEqual(programa);
      expect(result.current.workouts).toEqual([]);
      expect(result.current.selectedWorkoutId).toBeNull();

      // Quando aciona o retry
      await act(async () => {
        await result.current.retry();
      });

      // Então recarrega com sucesso
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.errorMsg).toBeNull();
      expect(result.current.errorOrigin).toBeNull();
      expect(result.current.workouts.map((w: Workout) => w.id)).toEqual(["w-1"]);
      expect(result.current.selectedWorkoutId).toBe("w-1");
      expect(listWorkoutsByProgramStandalone).toHaveBeenCalledTimes(2);
    });
  });

  it("hooks/index exporta useTodayWorkout como caminho oficial", () => {
    expect(typeof hooksIndex.useTodayWorkout).toBe("function");
  });
});
