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
import { WorkoutDetailSection } from "@/components/milon/WorkoutDetailSection";
import { useWorkoutDetail } from "@/lib/milon/hooks/useWorkoutDetail";
import { useWorkoutExecution } from "@/lib/milon/hooks/useWorkoutExecution";
import { MSG_EXERCICIO_JA_NO_TREINO } from "@/lib/milon/workout-utils";
import type {
  Exercise,
  Program,
  Workout,
  WorkoutEntry,
  WorkoutEntryView,
  WorkoutSeries,
} from "@/lib/milon/types";

/**
 * Contrato RED — Mílon #4 Treino do Dia (TASK-002):
 * `components/milon/WorkoutDetailSection.tsx`.
 *
 * Fonte da verdade: `.agents/modules/milon/04-treino-do-dia/spec.md` §3
 * (paridade total com a manutenção) + `plan.md` §2 (tabela Create:
 * WorkoutDetailSection) + §3 (contrato textual WorkoutDetailSectionProps)
 * + `tasks.json` TASK-002 (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da extração (outside-in): falha porque
 * `@/components/milon/WorkoutDetailSection` ainda não existe —
 * Expected: FAIL com "módulo não encontrado" (nenhum arquivo de
 * produção alterado). Hefesto fará GREEN movendo (não reescrevendo)
 * o corpo da manutenção para a seção.
 *
 * Padrão espelhado de
 * `__tests__/app/milon/programs/[id]/workouts/[workoutId]/page.test.tsx`:
 * `useWorkoutDetail` mockado por arquivo, factories com defaults e
 * `clickConnectedButton` para clique pós-fetch.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — WorkoutDetailSectionProps):
 * - props: `workoutId` (string; vazio = detalhe não resolve, AsyncState
 *   herdado cobre o não-encontrado), `backTarget` (variante `program` com
 *   `programId` OU variante `none`; manutenção usa `program`, Treino do
 *   Dia usa `none`), `title` opcional (default mantém "Treino"),
 *   `headerActions`/`entryFooter`/`footer` opcionais default nulo
 *   (`entryFooter` recebe a view da entrada para as features 5/6/7);
 * - a seção é a ÚNICA dona da orquestração de detalhe: chama
 *   `useWorkoutDetail(workoutId)`, estados de picker/modal/confirmação/
 *   overrides de unidade, `AsyncState`, cabeçalho, `WorkoutEntriesList`,
 *   `ExercisePickerModal`, `ExerciseModal`, `WorkoutConfirmModal`;
 * - read-only derivado DENTRO da seção por
 *   `program.status === "inativo"` (a página nova não recalcula);
 * - bloqueio D14 mantém o modal aberto com mensagem visível;
 * - nenhum texto "Tentar novamente" reimplementado (só via AsyncState).
 *
 * Convenção fixada aqui (não dita literalmente pela spec; derivada do
 * contrato do plano): `backTarget` é união discriminada por `kind` —
 * `{ kind: "program"; programId: string } | { kind: "none" }`.
 */

// Hook dedicado mockado no padrão das páginas do módulo.
vi.mock("@/lib/milon/hooks/useWorkoutDetail", () => ({
  useWorkoutDetail: vi.fn(),
}));

// Hook de execução (Mílon #5, TASK-003/TASK-004): mockado para o modo
// execução da seção — consumido só quando `executionEnabled` está ligada.
vi.mock("@/lib/milon/hooks/useWorkoutExecution", () => ({
  useWorkoutExecution: vi.fn(),
}));

// next/navigation mockado por arquivo (seção usa roteador só p/ voltar ao
// programa; MilonLayout usa o pathname p/ marcar a aba ativa).
const mockPush = vi.hoisted(() => vi.fn());
const mockUsePathname = vi.hoisted(() =>
  vi.fn(() => "/milon/programs/prog-1/workouts/wout-1"),
);

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ id: "prog-1", workoutId: "wout-1" })),
  usePathname: mockUsePathname,
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({ get: vi.fn() })),
}));

const mockedUseWorkoutDetail = useWorkoutDetail as Mock;
const mockedUseWorkoutExecution = useWorkoutExecution as Mock;

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
    value: 10,
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

/** Retorno exato do useWorkoutDetail (plan.md §3) com defaults. */
function defaultHookState(overrides: Record<string, unknown> = {}) {
  return {
    workout: null as Workout | null,
    program: null as Program | null,
    entries: [] as WorkoutEntryView[],
    exercises: [] as Exercise[],
    workoutUsedExerciseIds: [] as string[],
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
 * homônimos (ex.: "Adicionar exercício" da seção e da lista).
 */
async function clickConnectedButton(name: RegExp, ordinal = 0): Promise<void> {
  await waitFor(() => {
    const alvos = screen.getAllByRole("button", { name });
    expect(alvos[ordinal]?.isConnected).toBe(true);
  });
  fireEvent.click(screen.getAllByRole("button", { name })[ordinal]);
}

/** Estado "conteúdo" padrão: treino existente, 1 entrada com 2 séries. */
function conteudoComUmaEntrada(overrides: Record<string, unknown> = {}) {
  const view = makeView(
    makeEntry({ id: "ent-1", position: 1, restSeconds: 60 }),
    makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" }),
    [
      makeSeries({ id: "ser-1", entryId: "ent-1", position: 1, value: 10 }),
      makeSeries({ id: "ser-2", entryId: "ent-1", position: 2, value: null }),
    ],
  );
  return setupHook({
    workout: makeWorkout({ name: "Treino A" }),
    program: makeProgram(),
    entries: [view],
    exercises: [makeExercise({ id: "ex-1", name: "Supino reto" })],
    workoutUsedExerciseIds: ["ex-1"],
    ...overrides,
  });
}

const backProgram = { kind: "program", programId: "prog-1" } as const;
const backNone = { kind: "none" } as const;

describe("WorkoutDetailSection (TASK-002 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setupHook();
  });

  it("chama useWorkoutDetail com o workoutId recebido por prop", () => {
    setupHook({ workout: makeWorkout(), program: makeProgram() });

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

    expect(mockedUseWorkoutDetail).toHaveBeenCalledWith("wout-1");
  });

  it("paridade de render: cabeçalho do treino + entradas na ordem de position com séries e descanso", () => {
    const supino = makeExercise({ id: "ex-1", name: "Supino reto" });
    const rosca = makeExercise({
      id: "ex-2",
      name: "Rosca direta",
      muscle: "Bíceps",
    });
    conteudoComUmaEntrada({
      workout: makeWorkout({ name: "Treino A" }),
      entries: [
        makeView(
          makeEntry({
            id: "ent-2",
            exerciseId: "ex-2",
            position: 2,
            restSeconds: 90,
          }),
          rosca,
          [makeSeries({ id: "ser-3", entryId: "ent-2", position: 1, value: 8 })],
        ),
        makeView(
          makeEntry({
            id: "ent-1",
            exerciseId: "ex-1",
            position: 1,
            restSeconds: 60,
          }),
          supino,
          [
            makeSeries({ id: "ser-1", entryId: "ent-1", position: 1, value: 10 }),
            makeSeries({ id: "ser-2", entryId: "ent-1", position: 2, value: null }),
          ],
        ),
      ],
      exercises: [supino, rosca],
    });

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

    const cabecalho = screen.getByRole("heading", { name: "Treino A" });
    expect(cabecalho.className).toMatch(/font-display/);

    const secao = screen.getByRole("region", {
      name: "Exercícios do treino",
    });
    expect(
      within(secao).getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(["Supino reto", "Rosca direta"]);

    expect(screen.getAllByText(/^Série 1$/)).toHaveLength(2);
    expect(screen.getAllByText(/^Série 2$/)).toHaveLength(1);
    expect(screen.getAllByLabelText("Descanso (s)")[0]).toHaveValue("60");
  });

  it("readOnly: programa inativo esconde adicionar/editar/remover sem esconder o conteúdo", () => {
    conteudoComUmaEntrada({ program: makeProgram({ status: "inativo" }) });

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

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

  it("D14: seleção bloqueada mantém o ExercisePickerModal aberto com mensagem visível e sem retry", async () => {
    const state = conteudoComUmaEntrada({
      exercises: [
        makeExercise({ id: "ex-1", name: "Supino reto" }),
        makeExercise({ id: "ex-2", name: "Rosca direta", muscle: "Bíceps" }),
      ],
      addExercise: vi.fn(async () => {
        throw new Error(MSG_EXERCICIO_JA_NO_TREINO);
      }),
    });

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );
    await clickConnectedButton(/adicionar exercício/i, 0);
    // A query é escopada ao diálogo do picker: "Supino reto" também existe
    // como h3 do card da entry e nos rótulos acessíveis Editar/Excluir
    // ("Editar Supino reto"), então o índice global 0 clicaria no card.
    await waitFor(() => {
      const dialogo = screen
        .getByRole("heading", { name: "Escolher exercício" })
        .closest(".fixed") as HTMLElement;
      expect(
        within(dialogo).getByRole("button", { name: /supino reto/i })
          .isConnected,
      ).toBe(true);
    });
    fireEvent.click(
      within(
        screen
          .getByRole("heading", { name: "Escolher exercício" })
          .closest(".fixed") as HTMLElement,
      ).getByRole("button", { name: /supino reto/i }),
    );

    await waitFor(() =>
      expect(state.addExercise).toHaveBeenCalledWith("ex-1"),
    );
    expect(
      screen.getAllByText(MSG_EXERCICIO_JA_NO_TREINO).length,
    ).toBeGreaterThan(0);
    const seletor = screen
      .getByRole("heading", { name: "Escolher exercício" })
      .closest(".fixed") as HTMLElement;
    expect(seletor).not.toBeNull();
    expect(within(seletor).getByText("Rosca direta")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("backTarget program exibe voltar ao programa; backTarget none omite o botão", () => {
    conteudoComUmaEntrada();

    const { unmount } = render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );
    expect(
      screen.getByRole("button", { name: /voltar ao programa/i }),
    ).toBeInTheDocument();
    unmount();
    cleanup();

    conteudoComUmaEntrada();
    render(<WorkoutDetailSection workoutId="wout-1" backTarget={backNone} />);

    expect(
      screen.queryByRole("button", { name: /voltar ao programa/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Treino A" }),
    ).toBeInTheDocument();
  });

  it("slots nulos na v1: sem headerActions/footer nada extra é renderizado; slots explícitos aparecem", () => {
    conteudoComUmaEntrada();

    const { unmount } = render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backNone} />,
    );
    expect(screen.queryByTestId("slot-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("slot-footer")).not.toBeInTheDocument();
    unmount();
    cleanup();

    conteudoComUmaEntrada();
    render(
      <WorkoutDetailSection
        workoutId="wout-1"
        backTarget={backNone}
        headerActions={<div data-testid="slot-header">acao</div>}
        footer={<div data-testid="slot-footer">rodape</div>}
        entryFooter={() => <div data-testid="slot-entry">por-exercicio</div>}
      />,
    );

    expect(screen.getByTestId("slot-header")).toBeInTheDocument();
    expect(screen.getByTestId("slot-footer")).toBeInTheDocument();
    expect(screen.getAllByTestId("slot-entry").length).toBeGreaterThan(0);
  });
});

/** Fonte da seção (raiz = 4 níveis acima de __tests__/components/milon). */
function sectionSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../components/milon/WorkoutDetailSection.tsx"),
    "utf8",
  );
}

describe("TASK-002 — seção como dona única do detalhe (fonte)", () => {
  it("a seção compõe o AsyncState centralizado (proibido reimplementar estados)", () => {
    expect(sectionSource()).toMatch(
      /from\s+["']@\/components\/ui\/AsyncState["']/,
    );
  });

  it("'Tentar novamente' em components/milon/WorkoutDetailSection.tsx => 0 ocorrências", () => {
    expect(sectionSource().split("Tentar novamente").length - 1).toBe(0);
  });

  it("a seção declara os slots de extensão com default nulo (casca p/ #5/#6/#7)", () => {
    const src = sectionSource();
    expect(src).toMatch(/headerActions/);
    expect(src).toMatch(/entryFooter/);
    expect(src).toMatch(/footer/);
    expect(src).toMatch(/=\s*null/);
  });
});

/**
 * Contrato layout-único (pós-04-treino-do-dia, causa raiz: layout duplo):
 * `WorkoutDetailSection.tsx:417` renderizava
 * `<MilonLayout pageTitle={title}>` enquanto `app/milon/today/page.tsx:29`
 * também envolvia com `<MilonLayout pageTitle="Treino do Dia">` →
 * banner + abas duplicados e título "Treino" após "Treino do Dia".
 *
 * Contrato novo: 1 MilonLayout por rota, seção SEM layout. A seção é pura
 * (só AsyncState + conteúdo); o layout mora nas páginas (today + wrapper
 * da manutenção). `title` vira apenas fallback interno se necessário —
 * nunca `pageTitle` de layout.
 *
 * Expected: FAIL até Hefesto implementar (produção ainda com layout duplo).
 */
describe("WorkoutDetailSection pura sem layout (contrato layout-único — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("não renderiza navegação do módulo (layout mora nas páginas)", () => {
    conteudoComUmaEntrada();

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

    expect(
      screen.queryByRole("navigation", {
        name: "Navegação do módulo Mílon",
      }),
    ).not.toBeInTheDocument();
  });

  it("não renderiza mascote/título do módulo nem header de página (só conteúdo do treino)", () => {
    conteudoComUmaEntrada();

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backNone} />,
    );

    expect(screen.queryByText("Mílon")).not.toBeInTheDocument();
    // Conteúdo próprio permanece: cabeçalho do treino + entradas.
    expect(
      screen.getByRole("heading", { name: "Treino A" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Exercícios do treino" }),
    ).toBeInTheDocument();
  });

  it("com backTarget none não há duplicata de título de página (regressão today: Treino após Treino do Dia)", () => {
    conteudoComUmaEntrada();

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backNone} />,
    );

    // A seção pura não cria header de página; o único h1 da rota deve vir
    // da página (MilonLayout pageTitle). Aqui: nenhum header de layout.
    expect(
      screen.queryByRole("navigation", {
        name: "Navegação do módulo Mílon",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Treino do Dia" }),
    ).not.toBeInTheDocument();
  });
});

describe("TASK-004 — seção sem MilonLayout (fonte, contrato layout-único — RED)", () => {
  it("'MilonLayout' em components/milon/WorkoutDetailSection.tsx => 0 ocorrências (layout mora nas páginas)", () => {
    expect(sectionSource().split("MilonLayout").length - 1).toBe(0);
  });

  it("a seção não importa o layout do módulo", () => {
    expect(sectionSource()).not.toMatch(
      /from\s+["']@\/components\/milon\/MilonLayout["']/,
    );
  });

  it("'ModuleLayout' em components/milon/WorkoutDetailSection.tsx => 0 ocorrências (nem direto nem via MilonLayout)", () => {
    expect(sectionSource().split("ModuleLayout").length - 1).toBe(0);
  });
});

/**
 * Contrato RED — Mílon #5 Execução série a série (TASK-005):
 * flag `executionEnabled` da seção.
 *
 * Fonte: spec §3 (toque curto marca/desmarca; longo abre o modal; salvar
 * replica para a série e as seguintes; última desmarcada abre a pergunta
 * "nenhuma série marcada, deseja limpar essa execução"; confirmar limpa o
 * início; cancelar mantém desmarcada com início preservado) + plan.md §2
 * (flag opcional executionEnabled com padrão desligado; quando ligada
 * compõe o hook novo, monta o pacote de execução, hospeda o
 * SeriesEditModal e a confirmação de limpeza; quando desligada
 * comportamento idêntico ao atual) + §3 (flag executionEnabled default
 * desligado; pacote SeriesExecutionProps; modal e confirmação) + §4 (data
 * flow) + tasks.json TASK-005.
 *
 * CONTRATO FIXADO AQUI: `WorkoutDetailSectionProps` ganha
 * `executionEnabled?: boolean` (default desligado). Quando ligada, a seção
 * chama `useWorkoutExecution(workoutId)` e repassa o pacote montado a
 * partir de `doneSeriesIds`; hospeda o SeriesEditModal (estado do editor)
 * e a confirmação de limpeza (clearConfirmOpen/confirm/cancel).
 *
 * Expected: FAIL nos blocos com flag (prop ainda não existe — hook nunca
 * chamado, sem marcadores/modal/pergunta); o bloco sem flag passa como
 * trava de regressão. Hefesto fará GREEN na TASK-006.
 */
describe("modo execução da seção (Mílon #5 — RED)", () => {
  /** Estado default do hook de execução (contrato da TASK-003/TASK-004). */
  function setupExecHook(overrides: Record<string, unknown> = {}) {
    const state = {
      execution: null,
      doneSeriesIds: [] as string[],
      markedCount: 0,
      toggleSeries: vi.fn(async () => {}),
      saveSeriesExecution: vi.fn(async () => {}),
      clearConfirmOpen: false,
      confirmClearExecution: vi.fn(async () => {}),
      cancelClearExecution: vi.fn(),
      loading: false,
      errorMsg: null as string | null,
      errorOrigin: null as "carga" | "operacao" | "bloqueio" | null,
      successNotice: null as string | null,
      retry: vi.fn(async () => {}),
      ...overrides,
    };
    mockedUseWorkoutExecution.mockReturnValue(state);
    return state;
  }

  function comFlag(props: Record<string, unknown> = {}) {
    return {
      workoutId: "wout-1",
      backTarget: backNone,
      ...( { executionEnabled: true } as Record<string, unknown> ),
      ...props,
    };
  }

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setupHook();
    setupExecHook();
  });

  it("sem flag: comportamento idêntico ao atual (slots nulos, sem marcadores, hook de execução nunca chamado)", () => {
    conteudoComUmaEntrada();

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backNone} />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Série 1")).toBeInTheDocument();
    expect(mockedUseWorkoutExecution).not.toHaveBeenCalled();
  });

  it("com flag: compõe o hook novo com o workoutId", () => {
    conteudoComUmaEntrada();

    render(
      <WorkoutDetailSection
        {...(comFlag() as unknown as Parameters<typeof WorkoutDetailSection>[0])}
      />,
    );

    expect(mockedUseWorkoutExecution).toHaveBeenCalledWith(
      "wout-1",
      expect.any(Array),
    );
  });

  it("com flag: monta marcadores a partir de doneSeriesIds", () => {
    conteudoComUmaEntrada();
    setupExecHook({ doneSeriesIds: ["ser-1"], markedCount: 1 });

    render(
      <WorkoutDetailSection
        {...(comFlag() as unknown as Parameters<typeof WorkoutDetailSection>[0])}
      />,
    );

    const marcadores = screen.getAllByRole("button", { name: /^série/i });
    expect(marcadores).toHaveLength(2);
    expect(marcadores[0]).toHaveAttribute("aria-pressed", "true");
    expect(marcadores[0].className).toMatch(/B7602B/);
    expect(marcadores[1]).toHaveAttribute("aria-pressed", "false");
    expect(marcadores[1].className).not.toMatch(/B7602B/);
  });

  it("com flag: hospeda o modal de edição (título com font-display, sem opção de cópia)", async () => {
    conteudoComUmaEntrada();
    const state = setupExecHook({ doneSeriesIds: ["ser-1"], markedCount: 1 });

    render(
      <WorkoutDetailSection
        {...(comFlag() as unknown as Parameters<typeof WorkoutDetailSection>[0])}
      />,
    );

    // Toque longo na primeira série abre o editor (500ms, sem alternar).
    vi.useFakeTimers();
    try {
      fireEvent.pointerDown(screen.getByText("Série 1"), {
        pointerType: "touch",
      });
      vi.advanceTimersByTime(500);
      fireEvent.pointerUp(screen.getByText("Série 1"), {
        pointerType: "touch",
      });
    } finally {
      vi.useRealTimers();
    }

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /série/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: /série/i }).className,
    ).toMatch(/font-display/);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(state.toggleSeries).not.toHaveBeenCalled();
  });

  it("com flag: última desmarcada abre a pergunta com a série já desmarcada (sem excluir)", async () => {
    conteudoComUmaEntrada();
    const state = setupExecHook({
      doneSeriesIds: ["ser-1"],
      markedCount: 1,
      toggleSeries: vi.fn(async () => {
        // Hook remove a realizada e abre a confirmação sem excluir.
        mockedUseWorkoutExecution.mockReturnValue({
          ...setupExecHook(),
          doneSeriesIds: [],
          markedCount: 0,
          clearConfirmOpen: true,
        });
      }),
    });

    render(
      <WorkoutDetailSection
        {...(comFlag() as unknown as Parameters<typeof WorkoutDetailSection>[0])}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /^série/i })[0]);
    await waitFor(() => expect(state.toggleSeries).toHaveBeenCalled());

    await waitFor(() =>
      expect(
        screen.getByText(
          /Todas as séries foram desmarcada\. Deseja cancelar a execução desse treino\?/i,
        ),
      ).toBeInTheDocument(),
    );
    // A série clicada já aparece desmarcada antes de qualquer pergunta.
    expect(screen.getAllByRole("button", { name: /^série/i })[0]).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("com flag: confirmar limpa a execução e cancelar mantém início com zero marcadas", async () => {
    conteudoComUmaEntrada();
    const state = setupExecHook({
      doneSeriesIds: [],
      markedCount: 0,
      clearConfirmOpen: true,
    });

    render(
      <WorkoutDetailSection
        {...(comFlag() as unknown as Parameters<typeof WorkoutDetailSection>[0])}
      />,
    );

    expect(
      screen.getByText(
        /Todas as séries foram desmarcada\. Deseja cancelar a execução desse treino\?/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /limpar/i }));
    await waitFor(() =>
      expect(state.confirmClearExecution).toHaveBeenCalledTimes(1),
    );
  });

  it("com flag: salvar replica origem mais seguintes com feito preservado (via hook)", async () => {
    conteudoComUmaEntrada();
    const state = setupExecHook({ doneSeriesIds: ["ser-2"], markedCount: 1 });

    render(
      <WorkoutDetailSection
        {...(comFlag() as unknown as Parameters<typeof WorkoutDetailSection>[0])}
      />,
    );

    vi.useFakeTimers();
    try {
      fireEvent.pointerDown(screen.getByText("Série 1"), {
        pointerType: "touch",
      });
      vi.advanceTimersByTime(500);
      fireEvent.pointerUp(screen.getByText("Série 1"), {
        pointerType: "touch",
      });
    } finally {
      vi.useRealTimers();
    }

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /salvar/i }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(state.saveSeriesExecution).toHaveBeenCalledTimes(1),
    );
    const chamada = state.saveSeriesExecution.mock.calls[0];
    // Entrada + série de origem identificadas; sem indicador de cópia.
    expect(JSON.stringify(chamada)).toMatch(/ent-1/);
    expect(JSON.stringify(chamada)).toMatch(/ser-1/);
    expect(JSON.stringify(chamada)).not.toMatch(/copiar|copy|applyToAll/);
  });
});

/**
 * Paridade UI do replano composta na seção (Mílon #5, TASK-001 RED).
 *
 * Fonte: plan.md §2 (seção liga o callback de escolha de unidade do modal
 * ao caminho de persistência de unidade já existente; salvamento do editor
 * sobre a operação do hook que replica sempre) + §3 (escolha de unidade
 * com a mesma semântica do toggle da manutenção; salvamento origem +
 * seguintes incluindo marcadas) + D17 (sem botão aplicar em execução) +
 * D18 (unidade só no salvar).
 *
 * Expected: FAIL nos casos de chrome e de unidade — o chrome segue oculto
 * em execução e o modal segue sem kg/lb. O caso de replicação passa como
 * trava verde (regra vigente mantida). Hefesto fará GREEN na TASK-004 sem
 * mudar estes testes.
 */
describe("WorkoutDetailSection — paridade do replano (TASK-001 — RED)", () => {
  function setupExecReplano(overrides: Record<string, unknown> = {}) {
    const state = {
      execution: null,
      doneSeriesIds: [] as string[],
      markedCount: 0,
      toggleSeries: vi.fn(async () => {}),
      saveSeriesExecution: vi.fn(async () => {}),
      clearConfirmOpen: false,
      confirmClearExecution: vi.fn(async () => {}),
      cancelClearExecution: vi.fn(),
      loading: false,
      errorMsg: null as string | null,
      errorOrigin: null as "carga" | "operacao" | "bloqueio" | null,
      successNotice: null as string | null,
      retry: vi.fn(async () => {}),
      ...overrides,
    };
    mockedUseWorkoutExecution.mockReturnValue(state);
    return state;
  }

  type SectionProps = Parameters<typeof WorkoutDetailSection>[0];

  function comExecucao(props: Record<string, unknown> = {}): SectionProps {
    return {
      workoutId: "wout-1",
      backTarget: backNone,
      executionEnabled: true,
      ...props,
    } as unknown as SectionProps;
  }

  async function abrirEditorDaPrimeiraSerie(): Promise<void> {
    vi.useFakeTimers();
    try {
      fireEvent.pointerDown(screen.getByText("Série 1"), {
        pointerType: "touch",
      });
      vi.advanceTimersByTime(500);
      fireEvent.pointerUp(screen.getByText("Série 1"), {
        pointerType: "touch",
      });
    } finally {
      vi.useRealTimers();
    }
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /salvar/i }),
      ).toBeInTheDocument(),
    );
  }

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setupHook();
    setupExecReplano();
  });

  it("com flag: chrome de manutenção visível em execução (quantidade, descanso, editar, excluir, handle)", () => {
    conteudoComUmaEntrada();
    setupExecReplano();

    render(<WorkoutDetailSection {...comExecucao()} />);

    expect(screen.getByLabelText(/séries/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descanso/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /excluir/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /arrastar para reordenar/i }),
    ).toBeInTheDocument();
  });

  it("com flag: modal não oferece escolha de unidade (2ª volta: unidade herdada, sem botões kg/lb)", async () => {
    conteudoComUmaEntrada();
    setupExecReplano();

    render(<WorkoutDetailSection {...comExecucao()} />);
    await abrirEditorDaPrimeiraSerie();

    const dialog = screen.getByRole("heading", {
      name: /editar série/i,
    }).parentElement as HTMLElement;
    const modal = within(dialog);
    expect(
      modal.queryByRole("button", { name: /^kg$/i }),
    ).not.toBeInTheDocument();
    expect(
      modal.queryByRole("button", { name: /^lb$/i }),
    ).not.toBeInTheDocument();
  });

  it("com flag: salvar mantém replicação sempre para origem + seguintes (sem indicador de cópia)", async () => {
    conteudoComUmaEntrada();
    const state = setupExecReplano({
      doneSeriesIds: ["ser-2"],
      markedCount: 1,
    });

    render(<WorkoutDetailSection {...comExecucao()} />);
    await abrirEditorDaPrimeiraSerie();
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(state.saveSeriesExecution).toHaveBeenCalledTimes(1),
    );
    const chamada = state.saveSeriesExecution.mock.calls[0];
    expect(JSON.stringify(chamada)).toMatch(/ent-1/);
    expect(JSON.stringify(chamada)).toMatch(/ser-1/);
    expect(JSON.stringify(chamada)).not.toMatch(/copiar|copy|applyToAll/);
  });
});

/**
 * Sem banner de sucesso na execução (correção humana 2026-10-08 — RED).
 *
 * Verdade humana: NESTA tela (Treino do Dia em execução) NÃO há
 * banner/aviso de confirmação a cada alteração ou marcar/desmarcar —
 * o card já é o feedback; banner de ERRO mantido. O polish visual do
 * card será proposto e julgado em homologação (sem trava de pixel aqui).
 *
 * Trava desta tarefa:
 * - toggle/save/confirm em execução NÃO exibem successNotice nem chamam
 *   o banner de sucesso (hook sempre nulo + seção sem banner verde);
 * - erro segue no banner com origem operacao (role=alert, sem retry);
 * - manutenção inalterada (comportamento atual preservado).
 *
 * Expected: FAIL no caso do banner verde em execução — a produção ainda
 * renderiza `ctx.execSuccessNotice`. Hefesto fará GREEN removendo o
 * banner de sucesso da execução sem tocar no erro nem na manutenção.
 */
describe("WorkoutDetailSection — sem banner de sucesso na execução (correção humana — RED)", () => {
  function setupExecSemSucesso(overrides: Record<string, unknown> = {}) {
    const state = {
      execution: null,
      doneSeriesIds: [] as string[],
      markedCount: 0,
      toggleSeries: vi.fn(async () => {}),
      saveSeriesExecution: vi.fn(async () => {}),
      clearConfirmOpen: false,
      confirmClearExecution: vi.fn(async () => {}),
      cancelClearExecution: vi.fn(),
      loading: false,
      errorMsg: null as string | null,
      errorOrigin: null as "carga" | "operacao" | "bloqueio" | null,
      successNotice: null as string | null,
      retry: vi.fn(async () => {}),
      ...overrides,
    };
    mockedUseWorkoutExecution.mockReturnValue(state);
    return state;
  }

  type SectionProps = Parameters<typeof WorkoutDetailSection>[0];

  function comExecucao(props: Record<string, unknown> = {}): SectionProps {
    return {
      workoutId: "wout-1",
      backTarget: backNone,
      executionEnabled: true,
      ...props,
    } as unknown as SectionProps;
  }

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setupHook();
    setupExecSemSucesso();
  });

  it("em execução: mesmo com successNotice do hook, NENHUM banner verde aparece (o card já é o feedback)", () => {
    conteudoComUmaEntrada();
    setupExecSemSucesso({ successNotice: "Alteração salva com sucesso." });

    render(<WorkoutDetailSection {...comExecucao()} />);

    expect(
      screen.queryByText("Alteração salva com sucesso."),
    ).not.toBeInTheDocument();
  });

  it("em execução: após marcar/desmarcar com successNotice nulo, nenhum banner verde aparece", async () => {
    conteudoComUmaEntrada();
    const state = setupExecSemSucesso({
      doneSeriesIds: [],
      markedCount: 0,
      successNotice: null,
    });

    render(<WorkoutDetailSection {...comExecucao()} />);

    fireEvent.click(screen.getAllByRole("button", { name: /^série/i })[0]);
    await waitFor(() => expect(state.toggleSeries).toHaveBeenCalledTimes(1));

    expect(
      screen.queryByText("Alteração salva com sucesso."),
    ).not.toBeInTheDocument();
  });

  it("trava: em execução o banner de ERRO segue visível (role=alert, sem retry)", () => {
    conteudoComUmaEntrada();
    setupExecSemSucesso({
      errorMsg: "Erro ao alternar série",
      errorOrigin: "operacao",
    });

    render(<WorkoutDetailSection {...comExecucao()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Erro ao alternar série");
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("trava: manutenção inalterada — sem flag, o successNotice atual segue exibido", () => {
    conteudoComUmaEntrada({ successNotice: "Treino salvo com sucesso." });

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

    expect(
      screen.getByText("Treino salvo com sucesso."),
    ).toBeInTheDocument();
    expect(mockedUseWorkoutExecution).not.toHaveBeenCalled();
  });
});

/**
 * REMOÇÃO da foto — badge "Em execução", executionBlocked e template ao vivo.
 *
 * Fonte: spec alinhada §3 (indicacao visual de "em execução" ao lado do nome
 * enquanto houver execução aberta; template do treino bloqueado na manutenção
 * enquanto houver execução aberta; Treino do Dia exibe o template ao vivo com
 * marcadores de feito — sem foto; valores reais ficam p/ #7).
 *
 * Badge + executionBlocked preservados (travas verdes). Display é ao vivo:
 * a seção IGNORA frozenEntries/snapshot e exibe sempre o template.
 * Expected: FAIL no caso ao vivo enquanto a seção ainda prefere frozenEntries
 * (RED da remoção). Hefesto fará GREEN removendo a foto sem mudar estes testes.
 */
describe("WorkoutDetailSection — 2ª volta: badge, executionBlocked e frozenEntries (RED)", () => {
  function setupExec2aVolta(overrides: Record<string, unknown> = {}) {
    const state = {
      execution: null,
      doneSeriesIds: [] as string[],
      markedCount: 0,
      toggleSeries: vi.fn(async () => {}),
      saveSeriesExecution: vi.fn(async () => {}),
      clearConfirmOpen: false,
      confirmClearExecution: vi.fn(async () => {}),
      cancelClearExecution: vi.fn(),
      loading: false,
      errorMsg: null as string | null,
      errorOrigin: null as "carga" | "operacao" | "bloqueio" | null,
      successNotice: null as string | null,
      retry: vi.fn(async () => {}),
      frozenEntries: [] as WorkoutEntryView[],
      ...overrides,
    };
    mockedUseWorkoutExecution.mockReturnValue(state);
    return state;
  }

  type SectionProps = Parameters<typeof WorkoutDetailSection>[0];

  function comExecucao(props: Record<string, unknown> = {}): SectionProps {
    return {
      workoutId: "wout-1",
      backTarget: backNone,
      executionEnabled: true,
      ...props,
    } as unknown as SectionProps;
  }

  function makeExecution(overrides: Record<string, unknown> = {}) {
    return {
      id: "exec-1",
      workoutId: "wout-1",
      programId: "prog-1",
      startedAt: "2026-10-08T10:00:00.000Z",
      finishedAt: null,
      createdAt: "2026-10-08T10:00:00.000Z",
      created_by: DONO,
      ...overrides,
    };
  }

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setupHook();
    setupExec2aVolta();
  });

  it("exibe badge 'Em execução' ao lado do nome do treino quando exec.execution !== null", () => {
    conteudoComUmaEntrada();
    setupExec2aVolta({ execution: makeExecution() });

    render(<WorkoutDetailSection {...comExecucao()} />);

    expect(screen.getByText("Em execução")).toBeInTheDocument();
  });

  it("sem execução aberta, não exibe o badge 'Em execução'", () => {
    conteudoComUmaEntrada();
    setupExec2aVolta({ execution: null });

    render(<WorkoutDetailSection {...comExecucao()} />);

    expect(screen.queryByText("Em execução")).not.toBeInTheDocument();
  });

  it("executionBlocked=true desabilita o chrome de manutenção (quantidade, descanso, editar, excluir, reordenar)", () => {
    conteudoComUmaEntrada();
    setupExec2aVolta({ execution: makeExecution() });

    render(
      <WorkoutDetailSection
        {...(comExecucao({ executionBlocked: true }) as SectionProps)}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /adicionar exercício/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /editar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /excluir/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /arrastar para reordenar/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Séries")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Descanso (s)")).not.toBeInTheDocument();
  });

  it("trava: sem execução aberta (executionBlocked=false), o chrome de manutenção segue visível", () => {
    conteudoComUmaEntrada();
    setupExec2aVolta({ execution: null });

    render(
      <WorkoutDetailSection
        {...(comExecucao({ executionBlocked: false }) as SectionProps)}
      />,
    );

    expect(
      screen.getByRole("button", { name: /adicionar exercício/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  it("REMOVIDO foto: com execução aberta exibe o template ao vivo (edição aparece na hora, sem frozen)", () => {
    // Template ao vivo tem valor 15; a foto antiga congelaria valor 10.
    // A seção deve IGNORAR frozenEntries/snapshot e exibir sempre o template.
    // Expected: FAIL enquanto a seção ainda prefere frozenEntries (RED).
    const viewTemplate = makeView(
      makeEntry({ id: "ent-1", position: 1, restSeconds: 60 }),
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" }),
      [makeSeries({ id: "ser-1", entryId: "ent-1", position: 1, value: 15 })],
    );
    const viewCongelada = makeView(
      makeEntry({ id: "ent-1", position: 1, restSeconds: 60 }),
      makeExercise({
        id: "ex-1",
        name: "Supino congelado",
        muscle: "Peito",
        loadUnit: "kg",
      }),
      [
        makeSeries({
          id: "ser-1",
          entryId: "ent-1",
          position: 1,
          value: 10,
          load: 40,
        }),
      ],
    );
    conteudoComUmaEntrada({ entries: [viewTemplate] });
    setupExec2aVolta({
      execution: makeExecution({ snapshot: { entries: [] } }),
      frozenEntries: [viewCongelada],
    });

    render(<WorkoutDetailSection {...comExecucao()} />);

    // Display ao vivo: o que se vê é sempre o valor atual do template.
    expect(
      screen.getByRole("heading", { level: 3, name: "Supino reto" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "Supino congelado" }),
    ).not.toBeInTheDocument();
  });

  it("trava: sem execução aberta exibe o template (entries) sem foto", () => {
    conteudoComUmaEntrada();
    setupExec2aVolta({
      execution: null,
      frozenEntries: [],
    });

    render(<WorkoutDetailSection {...comExecucao()} />);

    expect(
      screen.getByRole("heading", { level: 3, name: "Supino reto" }),
    ).toBeInTheDocument();
  });
});

/**
 * Contrato RED da TASK-006 (Mílon #5, aditamento 2026-10-09 dos 3 achados).
 *
 * Fonte: tasks.json TASK-006 (WorkoutDetailSection: aviso visível com a
 * frase exata quando executionBlocked é verdadeiro no ramo de manutenção;
 * ausência do aviso quando falso) + plan.md Aditamento §1 Mudança C + §3
 * (Aviso de bloqueio: no ramo de manutenção, com executionBlocked
 * verdadeiro, alerta visível contendo a frase exata "não pode ser editado
 * pois está em execução", acima da lista, além dos controles já
 * desabilitados) + spec §3 (aviso visível de que não pode ser editado
 * pois está em execução) + D28.
 *
 * Contrato fixado aqui (nomes que a TASK-009 deve implementar):
 * - ramo de manutenção (executionEnabled desligado) com
 *   `executionBlocked === true` exibe alerta visível (role="alert")
 *   contendo EXATAMENTE "não pode ser editado pois está em execução";
 * - com `executionBlocked === false`/ausente, nenhum aviso aparece;
 * - controles seguem desabilitados via readOnly efetivo (trava verde).
 *
 * Expected: FAIL no caso do aviso — a seção atual desabilita o chrome
 * mas não exibe nenhum aviso textual. Hefesto fará GREEN na TASK-009
 * sem mudar estes testes.
 */
describe("WorkoutDetailSection — aviso visível de bloqueio (TASK-006 — RED)", () => {
  type SectionProps = Parameters<typeof WorkoutDetailSection>[0];

  function manutencao(props: Record<string, unknown> = {}): SectionProps {
    return {
      workoutId: "wout-1",
      backTarget: backProgram,
      ...props,
    } as unknown as SectionProps;
  }

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setupHook();
    mockedUseWorkoutExecution.mockReturnValue({
      execution: null,
      doneSeriesIds: [],
      markedCount: 0,
      toggleSeries: vi.fn(async () => {}),
      saveSeriesExecution: vi.fn(async () => {}),
      clearConfirmOpen: false,
      confirmClearExecution: vi.fn(async () => {}),
      cancelClearExecution: vi.fn(),
      loading: false,
      errorMsg: null,
      errorOrigin: null,
      successNotice: null,
      retry: vi.fn(async () => {}),
    });
  });

  it("manutenção bloqueada exibe aviso com a frase exata", () => {
    conteudoComUmaEntrada();

    render(<WorkoutDetailSection {...manutencao({ executionBlocked: true })} />);

    expect(
      screen.getByText(/não pode ser editado pois está em execução/),
    ).toBeInTheDocument();
  });

  it("aviso de bloqueio usa role alert (alerta visível, sem retry)", () => {
    conteudoComUmaEntrada();

    render(<WorkoutDetailSection {...manutencao({ executionBlocked: true })} />);

    const aviso = screen.getByText(
      /não pode ser editado pois está em execução/,
    );
    const alerta = aviso.closest('[role="alert"]');
    expect(alerta).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("manutenção bloqueada mantém os controles desabilitados além do aviso", () => {
    conteudoComUmaEntrada();

    render(<WorkoutDetailSection {...manutencao({ executionBlocked: true })} />);

    expect(
      screen.getByText(/não pode ser editado pois está em execução/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /adicionar exercício/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /editar/i }),
    ).not.toBeInTheDocument();
  });

  it("manutenção desbloqueada não exibe o aviso", () => {
    conteudoComUmaEntrada();

    render(
      <WorkoutDetailSection {...manutencao({ executionBlocked: false })} />,
    );

    expect(
      screen.queryByText(/não pode ser editado pois está em execução/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /adicionar exercício/i }),
    ).toBeInTheDocument();
  });

  it("sem executionBlocked não exibe o aviso (default desbloqueado)", () => {
    conteudoComUmaEntrada();

    render(<WorkoutDetailSection {...manutencao()} />);

    expect(
      screen.queryByText(/não pode ser editado pois está em execução/),
    ).not.toBeInTheDocument();
  });
});

/**
 * Contrato RED da TASK-010 (Mílon #5, Aditamento 2026-10-09 "0012 CORRETA").
 *
 * Fonte: tasks.json TASK-010 (WorkoutDetailSection: ajustes de modo/unidade
 * da entry + ausência do ajuste de unidade da biblioteca no caminho do
 * treino) + plan.md Aditamento 0012 CORRETA §1 Mudança C + §3 (Hook de
 * detalhe + Card da entry) + D31/D32/D33 + spec §3.
 *
 * CONTRATO FIXADO AQUI (o que a TASK-012 deve implementar):
 * - o card da entry exibe seletores de Modo/Unidade vinculados à entry
 *   (radiogroup rotulado OU select rotulado OU grupo rotulado; rótulos
 *   "Modo"/"Unidade"; valores literais repeticao|tempo e kg|lb);
 * - trocar o Modo chama `setEntryMode(entryId, mode)` do hook de detalhe;
 *   trocar a Unidade chama `setEntryLoadUnit(entryId, unit)` do hook;
 * - os cards/séries da entry exibem modo e unidade DA ENTRY (divergência da
 *   biblioteca prova a fonte);
 * - o caminho do treino NÃO usa mais o ajuste de unidade da biblioteca
 *   (`setExerciseLoadUnitStandalone` fora da seção).
 *
 * Expected: FAIL — a seção atual não tem os seletores da entry, alimenta os
 * cards com a biblioteca e persiste unidade via setExerciseLoadUnitStandalone.
 * Hefesto fará GREEN na TASK-012 sem mudar estes testes (o hook é mockado
 * por arquivo; as chaves novas vão por overrides do estado mockado).
 */
describe("WorkoutDetailSection — ajustes de modo/unidade da entry (TASK-010 — RED)", () => {
  /** Entry COM modo/unidade (forma pós-0012; cast compila antes e depois). */
  function makeEntryComModo(
    mode: "repeticao" | "tempo",
    loadUnit: "kg" | "lb",
    overrides: Partial<WorkoutEntry> = {},
  ): WorkoutEntry {
    return makeEntry({
      ...overrides,
      ...({ mode, loadUnit } as unknown as Partial<WorkoutEntry>),
    });
  }

  /** Conteúdo com biblioteca DIVERGENTE de propósito (fonte = entry). */
  function conteudoDivergente() {
    const view = makeView(
      makeEntryComModo("tempo", "lb", { id: "ent-1", restSeconds: 60 }),
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" }),
      [
        makeSeries({ id: "ser-1", entryId: "ent-1", position: 1, value: 10 }),
        makeSeries({ id: "ser-2", entryId: "ent-1", position: 2, value: null }),
      ],
    );
    return setupHook({
      workout: makeWorkout({ name: "Treino A" }),
      program: makeProgram(),
      entries: [view],
      exercises: [makeExercise({ id: "ex-1", name: "Supino reto" })],
      workoutUsedExerciseIds: ["ex-1"],
      setEntryMode: vi.fn(async () => {}),
      setEntryLoadUnit: vi.fn(async () => {}),
    }) as unknown as {
      setEntryMode: Mock;
      setEntryLoadUnit: Mock;
    };
  }

  function elementoDaEntry(): HTMLElement {
    const el = document.querySelector('[data-entry-id="ent-1"]');
    if (!el) throw new Error("Card da entry não renderizado");
    return el as HTMLElement;
  }

  /** Localiza o seletor da entry aceitando radiogroup, select ou grupo. */
  function controleDaEntry(rotulo: RegExp): HTMLElement | null {
    const escopo = within(elementoDaEntry());
    return (
      escopo.queryByRole("radiogroup", { name: rotulo }) ??
      escopo.queryByRole("combobox", { name: rotulo }) ??
      escopo.queryByRole("group", { name: rotulo })
    );
  }

  function escolherOpcao(controle: HTMLElement, opcao: RegExp): void {
    const radio = within(controle).queryByRole("radio", { name: opcao });
    if (radio) {
      fireEvent.click(radio);
      return;
    }
    const combo =
      controle instanceof HTMLSelectElement
        ? controle
        : controle.querySelector("select");
    if (combo instanceof HTMLSelectElement) {
      const item = Array.from(combo.querySelectorAll("option")).find((o) =>
        opcao.test(o.textContent ?? ""),
      );
      fireEvent.change(combo, {
        target: { value: item?.value ?? item?.textContent ?? "" },
      });
      return;
    }
    throw new Error("Controle da entry sem opção selecionável");
  }

  it("exibe seletor de Modo da entry refletindo tempo (biblioteca sem modo)", () => {
    conteudoDivergente();

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

    expect(controleDaEntry(/modo/i)).not.toBeNull();
  });

  it("exibe seletor de Unidade da entry refletindo lb (biblioteca em kg)", () => {
    conteudoDivergente();

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

    expect(controleDaEntry(/unidade/i)).not.toBeNull();
  });

  it("trocar o Modo da entry chama setEntryMode do hook com (entryId, modo)", () => {
    const state = conteudoDivergente();

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

    escolherOpcao(controleDaEntry(/modo/i) as HTMLElement, /repeti/i);
    expect(state.setEntryMode).toHaveBeenCalledWith("ent-1", "repeticao");
  });

  it("trocar a Unidade da entry chama setEntryLoadUnit do hook com (entryId, unidade)", () => {
    const state = conteudoDivergente();

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

    escolherOpcao(controleDaEntry(/unidade/i) as HTMLElement, /^(kg)$/i);
    expect(state.setEntryLoadUnit).toHaveBeenCalledWith("ent-1", "kg");
  });

  it("card da entry exibe o rótulo DO MODO DA ENTRY (Tempo (s) com biblioteca sem modo)", () => {
    conteudoDivergente();

    render(
      <WorkoutDetailSection workoutId="wout-1" backTarget={backProgram} />,
    );

    // Rótulo deriva do modo da entry: fixture com 2 séries => 2 ocorrências.
    expect(
      within(elementoDaEntry()).getAllByText("Tempo (s)"),
    ).toHaveLength(2);
  });

  it("código vivo sem o ajuste de unidade da biblioteca no caminho do treino (substituição, D33)", () => {
    const src = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../../components/milon/WorkoutDetailSection.tsx",
      ),
      "utf8",
    );
    expect(src).not.toMatch(/setExerciseLoadUnitStandalone/);
  });
});
