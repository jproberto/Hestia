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
import { useState } from "react";
import TodayPage from "@/app/milon/today/page";
import { useTodayWorkout } from "@/lib/milon/hooks/useTodayWorkout";
import type { Program, Workout } from "@/lib/milon/types";

/**
 * Contrato RED — Mílon #4 Treino do Dia (TASK-003):
 * `app/milon/today/page.tsx` (rota `/milon/today`).
 *
 * Fonte da verdade: `.agents/modules/milon/04-treino-do-dia/spec.md`
 * ( §2 cenários/estados + §3 regras + §5 critérios de aceite) + `plan.md`
 * §2 (tabela Create: página today — composição pura) + §3 (contratos
 * textuais UseTodayWorkoutReturn / WorkoutDetailSectionProps /
 * TodayWorkoutSwitcherProps + textos de vazio) + §4 (data flow) +
 * `tasks.json` TASK-003 (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/app/milon/today/page` ainda não existe — Expected: FAIL com
 * "módulo não encontrado" (nenhum arquivo de produção alterado).
 * Hefesto fará GREEN compondo `useTodayWorkout` (TASK-001) +
 * `TodayWorkoutSwitcher` + `WorkoutDetailSection` sem voltar (TASK-002).
 *
 * CONTRATO CONSUMIDO (plan.md §2–§4):
 * - `MilonLayout pageTitle="Treino do Dia"` + 3 abas com Treino do Dia
 *   primeiro (`/milon/today`) e aba ativa acompanhando o destino;
 * - `AsyncState` da seleção: vazio orientador com "sem treino ativo"
 *   (insensível a caso) + orientação por caso, sem erro; erro de carga
 *   com retry; retry deriva de `errorOrigin` (`carga`/ausente com retry;
 *   `operacao`/`bloqueio` sem — norma D27/R31);
 * - com seleção válida: `TodayWorkoutSwitcher` (só com 2+ treinos) +
 *   `WorkoutDetailSection workoutId={selectedWorkoutId} backTarget={none}`
 *   com slots nulos na v1 (paridade por construção, sem reimplementar);
 * - programa inativo: somente leitura delegada à seção (a página não
 *   recalcula readOnly nem oferece ações próprias).
 *
 * Mapeamento dos 14 critérios da spec §5 aplicáveis à página:
 *  §5-01 redirect raiz → `__tests__/app/milon/page.test.tsx` (TASK-003);
 *  §5-02 3 abas ordenadas → `MilonLayout.test.tsx` + bloco navegação aqui;
 *  §5-03 aba ativa → bloco navegação aqui;
 *  §5-04 primeiro treino por criação → bloco seleção aqui;
 *  §5-05 troca restrita ao programa ativo → bloco seleção + switcher;
 *  §5-06 paridade de edição → wiring backTarget none + slots nulos aqui
 *    (comportamento vive na seção, já travado em WorkoutDetailSection.test);
 *  §5-07 vazios sem programa/sem treinos → bloco vazios aqui;
 *  §5-08 treino sem exercícios → seção herdada (bloco vazios aqui);
 *  §5-09 inativo sem ações → bloco inativo aqui (delegado à seção);
 *  §5-10 unicidade D14 → slots nulos + seção (comportamento na seção);
 *  §5-11 subtítulo derivado → seção (wiring aqui);
 *  §5-12 vazio ≠ zero → seção (wiring aqui);
 *  §5-13 carga com retry / operação-bloqueio sem → bloco erros aqui;
 *  §5-14 suite verde + cobertura → TASK-004 (fora deste arquivo).
 *
 * Padrão espelhado das páginas do módulo: hooks mockados por arquivo,
 * factories com defaults e `clickConnectedButton` para clique pós-fetch.
 * `WorkoutDetailSection` e `TodayWorkoutSwitcher` entram mockados por
 * arquivo (stubs que registram props): o que se trava aqui é a decisão
 * da PÁGINA (quando exibir cada peça e com quais props), não o interior
 * das peças (coberto pelos testes próprios de cada uma).
 */

// next/navigation mockado por arquivo: a página monta em /milon/today
// (acesso direto por endereço, sem clique anterior — spec §5-03).
const mockUsePathname = vi.hoisted(() => vi.fn(() => "/milon/today"));
const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({})),
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

vi.mock("@/lib/milon/hooks/useTodayWorkout", () => ({
  useTodayWorkout: vi.fn(),
}));

// Seção mockada por arquivo: registra as props para asserção de contrato
// (a página deve apenas repassar workoutId + backTarget none + slots nulos).
vi.mock("@/components/milon/WorkoutDetailSection", () => ({
  WorkoutDetailSection: vi.fn(
    (props: {
      workoutId?: string;
      backTarget?: { kind?: string; programId?: string };
      headerActions?: unknown;
      entryFooter?: unknown;
      footer?: unknown;
    }) => (
      <div
        data-testid="secao-detalhe"
        data-workout-id={props.workoutId ?? ""}
        data-back-target={props.backTarget?.kind ?? ""}
      />
    ),
  ),
}));

// Switcher mockado por arquivo com o mesmo contrato de props do real
// (workouts/selectedWorkoutId/onSelect + select com aria-label "Treino"):
// permite travar o wiring da página (lista filtrada, seleção, 2+ regra)
// sem duplicar os testes unitários do seletor.
vi.mock("@/components/milon/TodayWorkoutSwitcher", () => ({
  TodayWorkoutSwitcher: vi.fn(
    (props: {
      workouts?: { id: string; name: string }[];
      selectedWorkoutId?: string | null;
      onSelect?: (workoutId: string) => void;
    }) => (
      <label>
        Treino
        <select
          aria-label="Treino"
          value={props.selectedWorkoutId ?? ""}
          onChange={(e) => props.onSelect?.(e.target.value)}
        >
          {(props.workouts ?? []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
    ),
  ),
}));

import { WorkoutDetailSection as MockedSection } from "@/components/milon/WorkoutDetailSection";
import { TodayWorkoutSwitcher as MockedSwitcher } from "@/components/milon/TodayWorkoutSwitcher";

const mockedUseTodayWorkout = useTodayWorkout as Mock;

const DONO = "ana@hestia.lan";

// ---------------------------------------------------------------------------
// Factories com defaults (espelham `lib/milon/types.ts` — fonte única)
// ---------------------------------------------------------------------------
function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "prog-1",
    title: "Ficha Verão 2026",
    owner: DONO,
    status: "ativo",
    createdAt: "2026-09-29T00:00:00Z",
    created_by: DONO,
    ...overrides,
  };
}

function makeWorkout(overrides: Partial<Workout> & { id: string }): Workout {
  return {
    programId: "prog-1",
    name: "Treino A",
    createdAt: "2026-10-01T00:00:00Z",
    created_by: DONO,
    ...overrides,
  };
}

/** Treinos do programa ativo em ordem de criação (dia 1 = w-1). */
function treinosDoProgramaAtivo(): Workout[] {
  return [
    makeWorkout({ id: "w-1", name: "Treino A" }),
    makeWorkout({
      id: "w-2",
      name: "Treino B",
      createdAt: "2026-10-01T11:00:00Z",
    }),
    makeWorkout({
      id: "w-3",
      name: "Treino C",
      createdAt: "2026-10-01T12:00:00Z",
    }),
  ];
}

type TodayErrorOrigin = "carga" | "operacao" | "bloqueio" | null;

interface TodayHookState {
  program: Program | null;
  workouts: Workout[];
  selectedWorkoutId: string | null;
  selectWorkout: Mock;
  loading: boolean;
  errorMsg: string | null;
  errorOrigin: TodayErrorOrigin;
  successNotice: null;
  retry: Mock;
}

function defaultHookState(): TodayHookState {
  return {
    program: null,
    workouts: [],
    selectedWorkoutId: null,
    selectWorkout: vi.fn(),
    loading: false,
    errorMsg: null,
    errorOrigin: null,
    successNotice: null,
    retry: vi.fn(async () => {}),
  };
}

/**
 * Mock com seleção controlada por `useState` real (mesmo padrão do
 * `confirmAction` em `programs/page.test.tsx`): `selectWorkout` com id da
 * lista troca o selecionado e re-renderiza a página, como o hook real.
 * Default do selecionado = primeiro da lista (dia 1), salvo override
 * explícito (inclusive nulo para os vazios).
 */
function setupHook(overrides: Partial<TodayHookState> = {}): TodayHookState {
  const initialSelected =
    overrides.selectedWorkoutId !== undefined
      ? overrides.selectedWorkoutId
      : (overrides.workouts?.[0]?.id ?? null);
  const state: TodayHookState = {
    ...defaultHookState(),
    ...overrides,
    selectedWorkoutId: initialSelected,
  };
  mockedUseTodayWorkout.mockImplementation(function useTodayWorkoutMock() {
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
      state.selectedWorkoutId,
    );
    return {
      ...state,
      selectedWorkoutId,
      selectWorkout: (workoutId: string) => {
        state.selectWorkout(workoutId);
        if (state.workouts.some((w) => w.id === workoutId)) {
          setSelectedWorkoutId(workoutId);
        }
      },
    };
  });
  return state;
}

/** Conteúdo padrão: programa ativo do dono com 3 treinos (dia 1 = w-1). */
function conteudoComTreinos(
  overrides: Partial<TodayHookState> = {},
): TodayHookState {
  return setupHook({
    program: makeProgram({ status: "ativo" }),
    workouts: treinosDoProgramaAtivo(),
    ...overrides,
  });
}

/**
 * Clica num botão que só existe depois da composição pós-fetch (padrão
 * `clickConnectedButton` das páginas do módulo). `ordinal` resolve botões
 * homônimos.
 */
async function clickConnectedButton(
  name: RegExp,
  ordinal = 0,
): Promise<void> {
  await waitFor(() => {
    const alvos = screen.getAllByRole("button", { name });
    expect(alvos[ordinal]?.isConnected).toBe(true);
  });
  fireEvent.click(screen.getAllByRole("button", { name })[ordinal]);
}

function renderedSectionProps(): {
  workoutId?: string;
  backTarget?: unknown;
  headerActions?: unknown;
  entryFooter?: unknown;
  footer?: unknown;
} {
  const mock = MockedSection as unknown as ReturnType<typeof vi.fn>;
  const last = mock.mock.calls.at(-1) as
    | [
        {
          workoutId?: string;
          backTarget?: unknown;
          headerActions?: unknown;
          entryFooter?: unknown;
          footer?: unknown;
        },
      ]
    | undefined;
  return last?.[0] ?? {};
}

function renderedSwitcherProps(): {
  workouts?: Workout[];
  selectedWorkoutId?: string | null;
  onSelect?: (workoutId: string) => void;
} {
  const mock = MockedSwitcher as unknown as ReturnType<typeof vi.fn>;
  const last = mock.mock.calls.at(-1) as
    | [
        {
          workouts?: Workout[];
          selectedWorkoutId?: string | null;
          onSelect?: (workoutId: string) => void;
        },
      ]
    | undefined;
  return last?.[0] ?? {};
}

function moduloNav(): HTMLElement {
  return screen.getByRole("navigation", {
    name: "Navegação do módulo Mílon",
  });
}

// ---------------------------------------------------------------------------

describe("Treino do Dia — navegação e composição (TASK-003 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/milon/today");
    setupHook();
  });

  it("renderiza MilonLayout com pageTitle Treino do Dia e mascote do módulo", () => {
    render(<TodayPage />);

    expect(screen.getByText("Mílon")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Treino do Dia" }),
    ).toBeInTheDocument();
  });

  it("barra exibe exatamente 3 links na ordem Treino do Dia → Programas → Exercícios", () => {
    render(<TodayPage />);

    const links = within(moduloNav()).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Treino do Dia",
      "Programas",
      "Exercícios",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/milon/today",
      "/milon/programs",
      "/milon/exercises",
    ]);
  });

  it("aba Treino do Dia marcada ativa em acesso direto por endereço, sem clique anterior", () => {
    render(<TodayPage />);

    const nav = moduloNav();
    expect(
      within(nav).getByRole("link", { name: "Treino do Dia" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Programas" }),
    ).not.toHaveAttribute("aria-current");
    expect(
      within(nav).getByRole("link", { name: "Exercícios" }),
    ).not.toHaveAttribute("aria-current");
  });
});

describe("Treino do Dia — seleção do treino exibido (TASK-003 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/milon/today");
  });

  it("com programa ativo e treinos, a seção recebe o primeiro por criação (dia 1)", () => {
    conteudoComTreinos();

    render(<TodayPage />);

    expect(MockedSection).toHaveBeenCalled();
    expect(renderedSectionProps().workoutId).toBe("w-1");
    expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
      "data-workout-id",
      "w-1",
    );
  });

  it("switcher só aparece com 2+ treinos; com 1 treino a seção renderiza sem seletor", () => {
    conteudoComTreinos({ workouts: [makeWorkout({ id: "w-1" })] });

    render(<TodayPage />);

    expect(screen.getByTestId("secao-detalhe")).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /treino/i }),
    ).not.toBeInTheDocument();

    cleanup();
    conteudoComTreinos();

    render(<TodayPage />);

    expect(
      screen.getByRole("combobox", { name: /treino/i }),
    ).toBeInTheDocument();
  });

  it("troca no switcher alterna o treino da seção somente entre os treinos do programa ativo", async () => {
    const state = conteudoComTreinos({
      workouts: treinosDoProgramaAtivo().slice(0, 2),
    });

    render(<TodayPage />);

    // O seletor recebe exatamente a lista do programa ativo (nada de outro programa).
    expect(renderedSwitcherProps().workouts?.map((w) => w.id)).toEqual([
      "w-1",
      "w-2",
    ]);
    const opcoes = Array.from(
      screen.getByRole("combobox", { name: /treino/i }).querySelectorAll("option"),
    ).map((option) => option.textContent);
    expect(opcoes).toEqual(["Treino A", "Treino B"]);

    fireEvent.change(screen.getByRole("combobox", { name: /treino/i }), {
      target: { value: "w-2" },
    });

    await waitFor(() => expect(state.selectWorkout).toHaveBeenCalledWith("w-2"));
    await waitFor(() =>
      expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
        "data-workout-id",
        "w-2",
      ),
    );
    expect(renderedSectionProps().workoutId).toBe("w-2");
  });

  it("opções do switcher preservam a ordem de criação devolvida pelo hook", () => {
    conteudoComTreinos();

    render(<TodayPage />);

    const opcoes = Array.from(
      screen.getByRole("combobox", { name: /treino/i }).querySelectorAll("option"),
    ).map((option) => option.textContent);
    expect(opcoes).toEqual(["Treino A", "Treino B", "Treino C"]);
  });
});

describe("Treino do Dia — vazios orientadores sem erro (TASK-003 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/milon/today");
  });

  it("sem programa ativo: 'sem treino ativo' com orientação ativar/criar, sem erro e sem retry", () => {
    setupHook({ program: null, workouts: [], selectedWorkoutId: null });

    render(<TodayPage />);

    expect(screen.getByText(/sem treino ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/ativar|criar/i)).toBeInTheDocument();
    expect(screen.queryByTestId("secao-detalhe")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /treino/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("programa ativo sem treinos: 'sem treino ativo' orientando adicionar o primeiro treino", () => {
    setupHook({
      program: makeProgram({ status: "ativo" }),
      workouts: [],
      selectedWorkoutId: null,
    });

    render(<TodayPage />);

    expect(screen.getByText(/sem treino ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/adicionar|primeiro/i)).toBeInTheDocument();
    expect(screen.queryByTestId("secao-detalhe")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("treino sem exercícios: vazio herdado da seção (seção renderizada, sem vazio da página)", () => {
    conteudoComTreinos();

    render(<TodayPage />);

    expect(screen.getByTestId("secao-detalhe")).toBeInTheDocument();
    expect(screen.queryByText(/sem treino ativo/i)).not.toBeInTheDocument();
  });
});

describe("Treino do Dia — programa inativo somente leitura delegada (TASK-003 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/milon/today");
  });

  it("programa inativo: seção recebe o treino com backTarget none e a página não oferece ações próprias", () => {
    conteudoComTreinos({ program: makeProgram({ status: "inativo" }) });

    render(<TodayPage />);

    expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
      "data-workout-id",
      "w-1",
    );
    expect(renderedSectionProps().backTarget).toEqual({ kind: "none" });
    // A página não recalcula readOnly nem cria botões próprios de manutenção
    // (adicionar/editar/excluir vivem dentro da seção, que os esconde).
    expect(
      screen.queryByRole("button", { name: /adicionar exercício/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^editar$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^excluir$/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Treino do Dia — erros da seleção via AsyncState (TASK-003 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/milon/today");
  });

  it("falha de carga: mensagem com Tentar novamente que recarrega (clique pós-fetch)", async () => {
    const state = setupHook({
      errorMsg: "Erro ao carregar treino do dia",
      errorOrigin: "carga",
    });

    render(<TodayPage />);

    expect(screen.getByText(/erro ao carregar treino do dia/i)).toBeInTheDocument();
    await clickConnectedButton(/tentar novamente/i);
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it("origem ausente também oferece retry (default interno carga do AsyncState)", async () => {
    const state = setupHook({
      errorMsg: "Erro ao carregar treino do dia",
      errorOrigin: null,
    });

    render(<TodayPage />);

    expect(screen.getByText(/erro ao carregar treino do dia/i)).toBeInTheDocument();
    await clickConnectedButton(/tentar novamente/i);
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it("falha de operação: mensagem sem Tentar novamente", () => {
    setupHook({
      errorMsg: "Erro ao salvar treino do dia",
      errorOrigin: "operacao",
    });

    render(<TodayPage />);

    expect(screen.getByText(/erro ao salvar treino do dia/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("bloqueio de domínio: mensagem sem Tentar novamente", () => {
    setupHook({
      errorMsg: "Treino bloqueado por regra de domínio",
      errorOrigin: "bloqueio",
    });

    render(<TodayPage />);

    expect(
      screen.getByText(/treino bloqueado por regra de domínio/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Treino do Dia — paridade por construção (TASK-003 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/milon/today");
  });

  it("seção recebe backTarget none (sem botão voltar ao programa)", () => {
    conteudoComTreinos();

    render(<TodayPage />);

    expect(renderedSectionProps().backTarget).toEqual({ kind: "none" });
    expect(
      screen.queryByRole("button", { name: /voltar ao programa/i }),
    ).not.toBeInTheDocument();
  });

  it("slots de extensão nulos na v1 (headerActions/entryFooter/footer)", () => {
    conteudoComTreinos();

    render(<TodayPage />);

    const props = renderedSectionProps();
    expect(props.headerActions ?? null).toBeNull();
    expect(props.entryFooter ?? null).toBeNull();
    expect(props.footer ?? null).toBeNull();
  });

  it("carregando: indicador visível sem seção nem switcher", () => {
    setupHook({ loading: true });

    render(<TodayPage />);

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    expect(screen.queryByTestId("secao-detalhe")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /treino/i }),
    ).not.toBeInTheDocument();
  });
});

/** Fonte da rota nova (raiz = 4 níveis acima de __tests__/app/milon/today). */
function todayPageSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../../app/milon/today/page.tsx"),
    "utf8",
  );
}

describe("TASK-003 — página today como composição pura (fonte)", () => {
  it("a página consome useTodayWorkout (seleção do TASK-001)", () => {
    expect(todayPageSource()).toMatch(/useTodayWorkout/);
  });

  it("a página compõe MilonLayout + AsyncState centralizado", () => {
    const source = todayPageSource();
    expect(source).toMatch(/MilonLayout/);
    expect(source).toMatch(/from\s+["']@\/components\/ui\/AsyncState["']/);
  });

  it("a página compõe WorkoutDetailSection + TodayWorkoutSwitcher", () => {
    const source = todayPageSource();
    expect(source).toMatch(
      /from\s+["']@\/components\/milon\/WorkoutDetailSection["']/,
    );
    expect(source).toMatch(
      /from\s+["']@\/components\/milon\/TodayWorkoutSwitcher["']/,
    );
  });

  it("a página usa backTarget none (sem voltar — detalhe do plano §3)", () => {
    expect(todayPageSource()).toMatch(/none/);
  });

  it("'Tentar novamente' em app/milon/today/page.tsx => 0 ocorrências (retry vive no AsyncState)", () => {
    expect(todayPageSource().split("Tentar novamente").length - 1).toBe(0);
  });

  it("a página não importa @supabase/* (só via lib/shared no hook)", () => {
    expect(todayPageSource()).not.toContain("@supabase");
  });
});

/** Fonte da seção (raiz = 4 níveis acima de __tests__/app/milon/today). */
function sectionSourceFromToday(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../../components/milon/WorkoutDetailSection.tsx"),
    "utf8",
  );
}

/**
 * Contrato layout-único (causa raiz: `WorkoutDetailSection.tsx:417`
 * renderizava `<MilonLayout pageTitle={title}>` (default "Treino")
 * enquanto esta página também envolvia com
 * `<MilonLayout pageTitle="Treino do Dia">` → banner + abas duplicados
 * e título "Treino" após "Treino do Dia").
 *
 * Contrato novo: 1 MilonLayout por rota, seção sem layout. Esta página
 * é a ÚNICA dona do layout da rota /milon/today (pageTitle
 * "Treino do Dia"); a seção entra pura por dentro.
 *
 * Nota de isolamento: `WorkoutDetailSection` segue mockada neste arquivo
 * (o interior da seção é travado em `WorkoutDetailSection.test.tsx`);
 * o RED aqui vem do contrato de fonte cruzado (seção ainda com layout
 * na produção) + das travas de layout único abaixo, que Hefesto fará
 * GREEN esvaziando o layout da seção sem tocar nesta página.
 *
 * Expected: FAIL até Hefesto implementar (produção ainda com layout duplo).
 */
describe("Treino do Dia — layout único (contrato layout-único — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/milon/today");
  });

  it("renderiza exatamente 1 navegação do módulo (sem duplicata da seção)", () => {
    conteudoComTreinos();

    render(<TodayPage />);

    const navs = screen.getAllByRole("navigation", {
      name: "Navegação do módulo Mílon",
    });
    expect(navs).toHaveLength(1);
  });

  it("título de página 'Treino do Dia' aparece exatamente uma vez como heading", () => {
    conteudoComTreinos();

    render(<TodayPage />);

    expect(
      screen.getAllByRole("heading", { name: "Treino do Dia" }),
    ).toHaveLength(1);
  });

  it("a página declara exatamente 1 <MilonLayout (dona única do layout da rota)", () => {
    expect(todayPageSource().split("<MilonLayout").length - 1).toBe(1);
  });

  it("a seção não traz layout próprio (0 ocorrências de MilonLayout na seção — sem duplicata)", () => {
    expect(sectionSourceFromToday().split("MilonLayout").length - 1).toBe(0);
  });
});
