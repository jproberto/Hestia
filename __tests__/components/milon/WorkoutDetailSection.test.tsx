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
      makeSeries({ id: "ser-1", entryId: "ent-1", position: 1, reps: 10 }),
      makeSeries({ id: "ser-2", entryId: "ent-1", position: 2, reps: null }),
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
          [makeSeries({ id: "ser-3", entryId: "ent-2", position: 1, reps: 8 })],
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
            makeSeries({ id: "ser-1", entryId: "ent-1", position: 1, reps: 10 }),
            makeSeries({ id: "ser-2", entryId: "ent-1", position: 2, reps: null }),
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
    await clickConnectedButton(/supino reto/i, 0);

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
