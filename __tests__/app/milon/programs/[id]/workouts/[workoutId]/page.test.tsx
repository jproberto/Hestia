import fs from "node:fs";
import path from "node:path";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import WorkoutPage from "@/app/milon/programs/[id]/workouts/[workoutId]/page";
import { useWorkoutDetail } from "@/lib/milon/hooks/useWorkoutDetail";
import { MSG_EXERCICIO_JA_NO_PROGRAMA } from "@/lib/milon/workout-utils";
import type {
  Exercise,
  Program,
  Workout,
  WorkoutEntry,
  WorkoutEntryView,
  WorkoutSeries,
} from "@/lib/milon/types";

/**
 * Contrato — tasks.json TASK-015 (description + acceptanceCriteria verbatim) +
 * plan.md §3 "Página do treino" + §4 "Detalhe do treino (lista de
 * exercícios)" + spec.md §5 (estados centralizados, D27/R31, D6, D10, D14):
 *
 * - `MilonLayout` com `pageTitle` "Treino" e a MESMA navegação (YAGNI: nenhuma
 *   aba nova — Exercícios + Programas);
 * - `AsyncState` centralizado externo envolvendo o cabeçalho com o nome do
 *   treino, o botão "Adicionar exercício" (oculto em Programa inativo) e o
 *   `WorkoutEntriesList` ligado ao `useWorkoutDetail`: carregando / erro de
 *   carga com "Tentar novamente" / não encontrado;
 * - `errorMsg`/`errorOrigin` da página: retry APENAS quando a origem é
 *   `carga` (origem ausente também vale carga) — `operacao`/`bloqueio` sem
 *   retry e com o conteúdo visível (banner ACIMA, D19);
 * - "Adicionar exercício" abre o `ExercisePickerModal` (muscleOptions
 *   derivado de `exercises`); seleção bloqueada pelo D14 RELANÇA
 *   `MSG_EXERCICIO_JA_NO_PROGRAMA` e o modal permanece ABERTO, sem retry;
 * - remover exercício: com ≥1 série abre `WorkoutConfirmModal`
 *   (`remover-exercicio`) e só chama `removeEntry` ao confirmar; sem séries é
 *   ação direta (D6);
 * - reduzir quantidade com série preenchida → `WorkoutConfirmModal`
 *   (`reduzir-series`) → só grava ao confirmar;
 * - Programa `inativo` = somente leitura: sem adicionar/editar/remover e sem
 *   campos (D12);
 * - mensagens/estados NÃO são reimplementados: o arquivo da página importa
 *   `components/ui/AsyncState` e não contém o rótulo "Tentar novamente".
 *
 * RED (Expected: FAIL) HOJE: a rota
 * `app/milon/programs/[id]/workouts/[workoutId]/page.tsx` ainda não existe
 * (TASK-016) — falha de import/rota, não falha de sintaxe.
 *
 * Espelho: `__tests__/app/milon/programs/[id]/page.test.tsx` (mesmos mocks de
 * hooks por arquivo, factories com defaults e `clickConnectedButton`).
 */

// Hook dedicado mockado no padrão das páginas do módulo (leaf module — o
// re-export pelo index entrega o mesmo mock quando a página importar o index).
vi.mock("@/lib/milon/hooks/useWorkoutDetail", () => ({
  useWorkoutDetail: vi.fn(),
}));

// next/navigation mockado por arquivo (sobrescreve o mock global do setup):
// useParams devolve id + workoutId da rota aninhada e usePathname a URL
// completa para a regra de prefixo marcar a aba "Programas" ativa
// (/milon/programs/<id>/workouts/<wid>.startsWith('/milon/programs/')).
const mockUseParams = vi.hoisted(() =>
  vi.fn(() => ({ id: "prog-1", workoutId: "wout-1" })),
);
const mockUsePathname = vi.hoisted(() =>
  vi.fn(() => "/milon/programs/prog-1/workouts/wout-1"),
);

vi.mock("next/navigation", () => ({
  useParams: mockUseParams,
  usePathname: mockUsePathname,
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({ get: vi.fn() })),
}));

const mockedUseWorkoutDetail = useWorkoutDetail as Mock;

const DONO = "ana@hestia.lan";

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "prog-1",
    title: "Ficha Verão 2026",
    owner: DONO,
    status: "rascunho",
    createdAt: "2026-09-29T00:00:00Z",
    created_by: DONO,
    ...overrides,
  };
}

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: "wout-1",
    programId: "prog-1",
    name: "Treino A",
    createdAt: "2026-10-01T00:00:00Z",
    created_by: DONO,
    ...overrides,
  };
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: null,
    loadUnit: null,
    deletedAt: null,
    createdAt: "2026-09-12T00:00:00Z",
    created_by: DONO,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<WorkoutEntry> = {}): WorkoutEntry {
  return {
    id: "ent-1",
    workoutId: "wout-1",
    programId: "prog-1",
    exerciseId: "ex-1",
    position: 1,
    restSeconds: 60,
    createdAt: "2026-10-01T00:10:00Z",
    created_by: DONO,
    ...overrides,
  };
}

function makeSeries(overrides: Partial<WorkoutSeries> = {}): WorkoutSeries {
  return {
    id: "ser-1",
    entryId: "ent-1",
    position: 1,
    reps: 10,
    durationSeconds: null,
    load: null,
    createdAt: "2026-10-01T00:11:00Z",
    created_by: DONO,
    ...overrides,
  };
}

function makeView(
  entry: WorkoutEntry,
  exercise: Exercise,
  series: WorkoutSeries[],
): WorkoutEntryView {
  return { entry, exercise, series };
}

/** Retorno exato do useWorkoutDetail (plan.md §3) com defaults de não-encontrado. */
function defaultHookState(overrides: Record<string, unknown> = {}) {
  return {
    workout: null as Workout | null,
    program: null as Program | null,
    entries: [] as WorkoutEntryView[],
    exercises: [] as Exercise[],
    programUsedExerciseIds: [] as string[],
    loading: false,
    errorMsg: null as string | null,
    errorOrigin: null as "carga" | "operacao" | "bloqueio" | null,
    successNotice: null as string | null,
    retry: vi.fn(async () => {}),
    addExercise: vi.fn(async () => {}),
    removeEntry: vi.fn(async () => {}),
    reorderEntries: vi.fn(async () => {}),
    setQuantity: vi.fn(async () => {}),
    setRest: vi.fn(async () => {}),
    updateSeries: vi.fn(async () => {}),
    applyToAll: vi.fn(async () => {}),
    saveExercise: vi.fn(async () => makeExercise()),
    createExerciseAndAdd: vi.fn(async () => makeExercise()),
    confirmLoadUnit: vi.fn(async () => {}),
    ...overrides,
  };
}

function setupHook(overrides: Record<string, unknown> = {}) {
  const state = defaultHookState(overrides);
  mockedUseWorkoutDetail.mockReturnValue(state);
  return state;
}

/**
 * Clica num botão que só existe depois da composição pós-fetch (padrão
 * `clickConnectedButton` das páginas do módulo). `ordinal` resolve botões
 * homônimos (ex.: "Adicionar exercício" da página e da lista).
 */
async function clickConnectedButton(name: RegExp, ordinal = 0): Promise<void> {
  await waitFor(() => {
    const alvos = screen.getAllByRole("button", { name });
    expect(alvos[ordinal]?.isConnected).toBe(true);
  });
  fireEvent.click(screen.getAllByRole("button", { name })[ordinal]);
}

/** Estado "conteúdo" padrão dos testes: treino existente, 1 entrada com 2 séries. */
function conteudoComUmaEntrada(overrides: Record<string, unknown> = {}) {
  const view = makeView(
    makeEntry({ id: "ent-1", position: 1, restSeconds: 60 }),
    makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" }),
    [
      makeSeries({ id: "ser-1", entryId: "ent-1", position: 1, reps: 10 }),
      makeSeries({ id: "ser-2", entryId: "ent-1", position: 2, reps: null }),
    ],
  );
  return setupHook({
    workout: makeWorkout({ name: "Treino A" }),
    program: makeProgram(),
    entries: [view],
    exercises: [makeExercise({ id: "ex-1", name: "Supino reto" })],
    ...overrides,
  });
}

describe("WorkoutPage /milon/programs/[id]/workouts/[workoutId] (TASK-015 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Defaults do hook em todo render (padrão das páginas do módulo).
    setupHook();
  });

  it("loading: AsyncState centralizado mostra carregamento sem conteúdo, sem erro e sem não-encontrado", () => {
    setupHook({ loading: true, workout: makeWorkout() });

    render(<WorkoutPage />);

    expect(document.body.textContent ?? "").toMatch(/carregando/i);
    expect(screen.queryByText(/não encontrado/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Treino A" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("erro de carga exibe a mensagem com 'Tentar novamente' que aciona o retry", async () => {
    const state = setupHook({
      errorMsg: "Falha ao carregar o treino",
      errorOrigin: "carga",
    });

    render(<WorkoutPage />);

    // getAllByText: o banner pode ser composto também pela lista (mesma origem).
    expect(
      screen.getAllByText("Falha ao carregar o treino").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/não encontrado/i)).not.toBeInTheDocument();

    await clickConnectedButton(/tentar novamente/i, 0);
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it("erro de operação exibe a mensagem como banner ACIMA do conteúdo e SEM 'Tentar novamente'", () => {
    conteudoComUmaEntrada({
      errorMsg: "Falha ao salvar a série",
      errorOrigin: "operacao",
    });

    render(<WorkoutPage />);

    expect(screen.getAllByText("Falha ao salvar a série").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    // D19: o banner nunca substitui o conteúdo — o treino segue visível.
    expect(screen.getByRole("heading", { name: "Treino A" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Supino reto" }),
    ).toBeInTheDocument();
  });

  it("treino não encontrado: estado vazio de não encontrado, sem retry e sem carregamento", () => {
    // Defaults do hook: workout nulo, sem erro e sem loading (spec §5).
    setupHook();

    render(<WorkoutPage />);

    expect(screen.getAllByText(/não encontrado/i).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/carregando/i);
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("lista as entradas do treino na ordem de position com séries, descanso e cabeçalho do treino", () => {
    const supino = makeExercise({ id: "ex-1", name: "Supino reto" });
    const rosca = makeExercise({ id: "ex-2", name: "Rosca direta", muscle: "Bíceps" });
    // Entradas fora de ordem: a lista ordena por position.
    conteudoComUmaEntrada({
      workout: makeWorkout({ name: "Treino A" }),
      entries: [
        makeView(
          makeEntry({ id: "ent-2", exerciseId: "ex-2", position: 2, restSeconds: 90 }),
          rosca,
          [makeSeries({ id: "ser-3", entryId: "ent-2", position: 1, reps: 8 })],
        ),
        makeView(
          makeEntry({ id: "ent-1", exerciseId: "ex-1", position: 1, restSeconds: 60 }),
          supino,
          [
            makeSeries({ id: "ser-1", entryId: "ent-1", position: 1, reps: 10 }),
            makeSeries({ id: "ser-2", entryId: "ent-1", position: 2, reps: null }),
          ],
        ),
      ],
      exercises: [supino, rosca],
    });

    render(<WorkoutPage />);

    // pageTitle do MilonLayout (plan §3) + cabeçalho com o nome do treino.
    const pageTitle = screen.getByRole("heading", { level: 1, name: "Treino" });
    expect(pageTitle.className).toMatch(/font-display/);
    const cabecalho = screen.getByRole("heading", { name: "Treino A" });
    expect(cabecalho.className).toMatch(/font-display/);

    // Uma ordem fixa de position: Supino (1) antes de Rosca (2), dentro da
    // seção "Exercícios do treino" do WorkoutEntriesList.
    const secao = screen.getByRole("region", {
      name: "Exercícios do treino",
    });
    expect(
      within(secao).getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(["Supino reto", "Rosca direta"]);

    // Séries renderizadas por card (rótulo "Série N"): card 1 com 2, card 2 com 1.
    expect(screen.getAllByText(/^Série 1$/)).toHaveLength(2);
    expect(screen.getAllByText(/^Série 2$/)).toHaveLength(1);

    // Descanso da entrada (campo único, D4) chega ao card.
    expect(screen.getAllByLabelText("Descanso (s)")[0]).toHaveValue("60");
  });

  it("'Adicionar exercício' abre o ExercisePickerModal com a biblioteca e o filtro de músculo derivado", async () => {
    conteudoComUmaEntrada({
      exercises: [
        makeExercise({ id: "ex-1", name: "Supino reto" }),
        makeExercise({ id: "ex-2", name: "Rosca direta", muscle: "Bíceps" }),
      ],
    });

    render(<WorkoutPage />);
    await clickConnectedButton(/adicionar exercício/i, 0);

    const seletor = screen
      .getByRole("heading", { name: "Escolher exercício" })
      .closest(".fixed") as HTMLElement;
    expect(seletor).not.toBeNull();
    expect(within(seletor).getByLabelText(/buscar/i)).toBeInTheDocument();
    // Biblioteca ativa listada dentro do seletor (o card também cita Supino).
    expect(within(seletor).getByText("Supino reto")).toBeInTheDocument();
    expect(within(seletor).getByText("Rosca direta")).toBeInTheDocument();

    // muscleOptions derivado de `exercises` na própria página (plan §3).
    // Scope ao modal (seletor) pois agora há dois filtros (lista + modal).
    const filtro = within(seletor).getByLabelText(
      /filtrar por músculo/i,
    ) as HTMLSelectElement;
    expect(
      Array.from(filtro.options).map((opcao) => opcao.textContent),
    ).toContain("Peito");
  });

  it("D14: seleção bloqueada mantém o ExercisePickerModal aberto com MSG_EXERCICIO_JA_NO_PROGRAMA e sem retry", async () => {
    const state = conteudoComUmaEntrada({
      exercises: [
        makeExercise({ id: "ex-1", name: "Supino reto" }),
        makeExercise({ id: "ex-2", name: "Rosca direta", muscle: "Bíceps" }),
      ],
      addExercise: vi.fn(async () => {
        throw new Error(MSG_EXERCICIO_JA_NO_PROGRAMA);
      }),
    });

    render(<WorkoutPage />);
    await clickConnectedButton(/adicionar exercício/i, 0);
    await clickConnectedButton(/supino reto/i, 0);

    await waitFor(() =>
      expect(state.addExercise).toHaveBeenCalledWith("ex-1"),
    );
    expect(
      screen.getAllByText(MSG_EXERCICIO_JA_NO_PROGRAMA).length,
    ).toBeGreaterThan(0);
    // Modal permanece aberto (D14) e a biblioteca continua listada.
    const seletor = screen
      .getByRole("heading", { name: "Escolher exercício" })
      .closest(".fixed") as HTMLElement;
    expect(seletor).not.toBeNull();
    expect(within(seletor).getByText("Rosca direta")).toBeInTheDocument();
    // Erro de modal: sem "Tentar novamente" (o retry é do AsyncState, não do modal).
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("remover exercício COM séries abre o WorkoutConfirmModal e só chama removeEntry ao confirmar", async () => {
    const state = conteudoComUmaEntrada();

    render(<WorkoutPage />);
    await clickConnectedButton(/excluir/i, 0);

    const modal = screen.getByRole("heading", {
      name: "Remover exercício?",
    }).closest(".fixed") as HTMLElement;
    expect(modal).not.toBeNull();
    expect(within(modal).getByText(/supino reto/i)).toBeInTheDocument();
    // D6: nada é removido enquanto a confirmação está aberta.
    expect(state.removeEntry).not.toHaveBeenCalled();

    await clickConnectedButton(/^remover$/i, 0);
    await waitFor(() =>
      expect(state.removeEntry).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ent-1" }),
      ),
    );
    expect(
      screen.queryByRole("heading", { name: "Remover exercício?" }),
    ).not.toBeInTheDocument();
  });

  it("remover exercício SEM séries remove direto, sem confirmação (D6)", async () => {
    const state = conteudoComUmaEntrada({
      entries: [
        makeView(
          makeEntry({ id: "ent-1", position: 1 }),
          makeExercise({ id: "ex-1", name: "Supino reto" }),
          [],
        ),
      ],
    });

    render(<WorkoutPage />);
    await clickConnectedButton(/excluir/i, 0);

    await waitFor(() =>
      expect(state.removeEntry).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ent-1" }),
      ),
    );
    expect(
      screen.queryByRole("heading", { name: "Remover exercício?" }),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".fixed.inset-0")).toBeNull();
  });

  it("reduzir quantidade com série preenchida abre a confirmação e só grava ao confirmar", async () => {
    const state = conteudoComUmaEntrada();

    render(<WorkoutPage />);

    const campo = screen.getByLabelText("Séries");
    fireEvent.change(campo, { target: { value: "1" } });
    fireEvent.blur(campo);

    const modal = (
      await screen.findByRole("heading", { name: "Reduzir séries?" })
    ).closest(".fixed") as HTMLElement;
    expect(within(modal).getByText(/preenchid/i)).toBeInTheDocument();
    expect(state.setQuantity).not.toHaveBeenCalled();

    await clickConnectedButton(/^reduzir$/i, 0);
    await waitFor(() =>
      expect(state.setQuantity).toHaveBeenCalledWith("ent-1", 1),
    );
    expect(
      screen.queryByRole("heading", { name: "Reduzir séries?" }),
    ).not.toBeInTheDocument();
  });

  it("Programa inativo esconde adicionar, editar e remover — conteúdo permanece visível", () => {
    conteudoComUmaEntrada({ program: makeProgram({ status: "inativo" }) });

    render(<WorkoutPage />);

    expect(
      screen.queryByRole("button", { name: /adicionar exercício/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /editar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /excluir/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Séries")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Descanso (s)")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /arrastar para reordenar/i }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 3, name: "Supino reto" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Série 1")).toBeInTheDocument();
  });

  it("nenhuma aba nova: MilonLayout mantém exatamente as duas abas com 'Programas' ativa (R18)", () => {
    setupHook({ workout: makeWorkout(), program: makeProgram() });

    render(<WorkoutPage />);

    const nav = screen.getByRole("navigation", {
      name: "Navegação do módulo Mílon",
    });
    expect(within(nav).getAllByRole("link")).toHaveLength(2);

    const programas = within(nav).getByRole("link", { name: "Programas" });
    const exercicios = within(nav).getByRole("link", { name: "Exercícios" });
    expect(programas).toHaveAttribute("aria-current", "page");
    expect(exercicios).not.toHaveAttribute("aria-current", "page");

    expect(
      screen.getByRole("heading", { level: 1, name: "Treino" }),
    ).toBeInTheDocument();

    // id/workoutId lidos da rota via useParams (plan §5 decisão 6).
    expect(mockUseParams).toHaveBeenCalled();
  });
});

/** Fonte da página do treino (raiz = 7 níveis acima do diretório [workoutId]). */
function workoutPageSource(): string {
  return fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../../../../../app/milon/programs/[id]/workouts/[workoutId]/page.tsx",
    ),
    "utf8",
  );
}

describe("TASK-015 — estados centralizados na página do treino (fonte)", () => {
  it("a página compõe o AsyncState centralizado (proibido reimplementar estados)", () => {
    expect(workoutPageSource()).toMatch(
      /from\s+["']@\/components\/ui\/AsyncState["']/,
    );
  });

  it("'Tentar novamente' em app/milon/programs/[id]/workouts/[workoutId]/page.tsx => 0 ocorrências", () => {
    expect(workoutPageSource().split("Tentar novamente").length - 1).toBe(0);
  });
});
