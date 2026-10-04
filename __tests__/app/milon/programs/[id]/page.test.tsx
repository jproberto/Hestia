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
import ProgramDetailPage from "@/app/milon/programs/[id]/page";
import { useProgramDetail } from "@/lib/milon/hooks/useProgramDetail";
import { useProgramWorkouts } from "@/lib/milon/hooks/useProgramWorkouts";
import { useRouter } from "next/navigation";
import { MSG_TREINO_COM_EXERCICIOS } from "@/lib/milon/workout-utils";
import type { Program, ProgramErrorOrigin, Workout } from "@/lib/milon/types";

/**
 * Contrato — tasks.json TASK-026 (acceptanceCriteria verbatim) +
 * spec.md Patch v4 §Q3/Q4 (R18, R19, CA-P3-17, CA-P3-20) +
 * plan.md "Aditivo - Patch v4" §3 "Página de detalhe" + §5 decisões 4/6 +
 * plan.md §3 "Página do Programa" (TASK-015, lista de treinos — ver bloco
 * TASK-015 abaixo):
 *
 * - CA-P3-17: quem acessa `/milon/programs/<id>` de um programa existente
 *   vê título, dono e status daquele programa;
 * - CA-P3-20: nenhum placeholder de treinos ("Treinos em breve") — a
 *   asserção `queryByText(/treinos em breve/i) não presente` permanece
 *   cobrindo os 4 estados (TASK-015 AC3, verbatim);
 * - R19: id desconhecido ⇒ estado "Programa não encontrado." com explicação,
 *   DISTINTO do estado de falha de fetch (sem "Tentar novamente") e sem
 *   programa errado nem tela em branco;
 * - R18 (atualizado Mílon #4 spec §2/§6, mudança aprovada — não regressão):
 *   render dentro de MilonLayout com exatamente as três abas ordenadas
 *   (Treino do Dia → Programas → Exercícios) e a aba "Programas" com
 *   `aria-current='page'` (regra de prefixo do Patch v3:
 *   pathname `/milon/programs/<id>`.startsWith('/milon/programs/'));
 * - título do programa no token `font-display` (AGENTS.md: título de
 *   conteúdo h1/h2/h3 usa o token central);
 * - plan §3: `pageTitle="Programa"` (sem subtítulo); id lido via `useParams`
 *   (§5 decisão 6 — Next 16 params é Promise em client components) e passado
 *   ao hook dedicado `useProgramDetail` (§5 decisão 4).
 *
 * Estados mutuamente exclusivos do contrato (plan §3): carregando
 * ("Carregando programa…"), falha de fetch (banner + "Tentar novamente"),
 * id desconhecido ("Programa não encontrado.") e cabeçalho do programa.
 */

// Hook dedicado mockado no padrão das páginas do módulo (leaf module — o
// re-export pelo index entrega o mesmo mock quando a página importar o index).
vi.mock("@/lib/milon/hooks/useProgramDetail", () => ({
  useProgramDetail: vi.fn(),
}));

// next/navigation mockado por arquivo (sobrescreve o mock global do setup):
// useParams devolve o id da rota [id] e usePathname a URL completa para a
// regra de prefixo do Patch v3 marcar a aba "Programas" ativa.
const mockUseParams = vi.hoisted(() => vi.fn(() => ({ id: "prog-1" })));
const mockUsePathname = vi.hoisted(() => vi.fn(() => "/milon/programs/prog-1"));

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

const mockedUseProgramDetail = useProgramDetail as Mock;

// ---------------------------------------------------------------------------
// TASK-015 (Mílon #3) — a página do Programa passa a compor a lista de treinos
// via useProgramWorkouts (plan.md §3 "Página do Programa"):
//   useProgramWorkouts(id) + botão "Adicionar treino" (oculto em Programa
//   inativo) + WorkoutList (readOnly = inativo) + WorkoutModal (criar com
//   sugerirNomeTreino; renomear com otherNames sem o próprio) + exclusão
//   direta onDelete -> remove (sem confirmação) com banner `bloqueio`.
// RED (Expected: FAIL) hoje: a página ainda não importa o hook nem o
// WorkoutList — o motivo esperado é a ausência dos botões/itens novos.
// ---------------------------------------------------------------------------
vi.mock("@/lib/milon/hooks/useProgramWorkouts", () => ({
  useProgramWorkouts: vi.fn(),
}));

const mockedUseProgramWorkouts = useProgramWorkouts as Mock;

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

/** Retorno exato do useProgramWorkouts (plan.md §3) com defaults de sucesso. */
function defaultWorkoutsState() {
  return {
    workouts: [] as Workout[],
    subtitles: {} as Record<string, string>,
    loading: false,
    errorMsg: null as string | null,
    errorOrigin: null as ProgramErrorOrigin | null,
    successNotice: null as string | null,
    retry: vi.fn(async () => {}),
    create: vi.fn(async () => makeWorkout()),
    rename: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  };
}

function setupWorkouts(overrides: Record<string, unknown> = {}) {
  const state = { ...defaultWorkoutsState(), ...overrides };
  mockedUseProgramWorkouts.mockReturnValue(state);
  return state;
}

/**
 * Clique em botão que só existe depois da composição pós-fetch (padrão
 * `clickConnectedButton` das páginas do módulo): espera o alvo conectado ao
 * documento antes do click — falha legível quando a página ainda não monta a
 * ação. `ordinal` resolve botões homônimos (1º item da lista).
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

// Factory de defaults do hook (padrão das páginas do módulo): estado padrão =
// não encontrado (program e error nulos, loading false).
function defaultHookState(overrides: Record<string, unknown> = {}) {
  return {
    program: null as Program | null,
    loading: false,
    error: null as string | null,
    retry: vi.fn(async () => {}),
    ...overrides,
  };
}

function setupHook(overrides: Record<string, unknown> = {}) {
  const state = defaultHookState(overrides);
  mockedUseProgramDetail.mockReturnValue(state);
  return state;
}

describe("ProgramDetailPage /milon/programs/[id] (TASK-026 — CA-P3-17 / CA-P3-20 / R18 / R19)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Defaults do useProgramWorkouts em todo render (hooks mockados no
    // padrão das páginas do módulo): lista vazia, sem erro, sem sucesso.
    setupWorkouts();
  });

  it("cabeçalho exibe título, dono e status do programa buscado pelo id da rota (CA-P3-17)", () => {
    setupHook({ program: makeProgram() });

    render(<ProgramDetailPage />);

    // usePathname/useParams do caminho de decisão 6: id da URL vai ao hook dedicado.
    expect(mockUseParams).toHaveBeenCalled();
    expect(mockedUseProgramDetail).toHaveBeenCalledWith("prog-1");

    const titulo = screen.getByRole("heading", { name: /ficha verão 2026/i });
    expect(titulo.className).toMatch(/font-display/);
    expect(screen.getByText(/ana@hestia\.lan/)).toBeInTheDocument();
    // Badge de status via STATUS_LABEL (program-utils.ts: rascunho → "Rascunho").
    expect(screen.getByText("Rascunho")).toBeInTheDocument();

    // Estados mutuamente exclusivos: no sucesso não há loading nem não-encontrado.
    expect(screen.queryByText(/carregando programa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/programa não encontrado/i)).not.toBeInTheDocument();
  });

  it("compõe MilonLayout com pageTitle 'Programa' e sem subtítulo (plan.md §3)", () => {
    setupHook({ program: makeProgram() });

    render(<ProgramDetailPage />);

    const pageTitle = screen.getByRole("heading", { level: 1, name: "Programa" });
    expect(pageTitle).toBeInTheDocument();
    const header = pageTitle.closest("header");
    expect(header?.querySelector("p") ?? null).toBeNull();
  });

  it("estado de carregamento exibe 'Carregando programa…' e nenhum programa", () => {
    setupHook({ loading: true });

    render(<ProgramDetailPage />);

    expect(screen.getByText(/carregando programa/i)).toBeInTheDocument();
    expect(screen.queryByText(/programa não encontrado/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it("falha de fetch mostra banner com 'Tentar novamente' que aciona o retry (distinto do não-encontrado)", async () => {
    const state = setupHook({ error: "Falha ao carregar o programa" });

    render(<ProgramDetailPage />);

    expect(screen.getByText("Falha ao carregar o programa")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(state.retry).toHaveBeenCalledTimes(1);

    // Distinção R19: erro de carga NÃO é o estado de não-encontrado.
    expect(screen.queryByText(/programa não encontrado/i)).not.toBeInTheDocument();
  });

  it("id desconhecido: 'Programa não encontrado.' com explicação, sem erro de carga nem loading (R19)", () => {
    // program nulo + error nulo + loading false = estado de não-encontrado,
    // distinto do estado de falha de fetch (spec.md R19 / plan.md §3).
    setupHook();

    render(<ProgramDetailPage />);

    expect(screen.getByText(/programa não encontrado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/carregando programa/i)).not.toBeInTheDocument();
  });

  it("renderiza dentro de MilonLayout com exatamente as três abas ordenadas e 'Programas' ativa (R18 + Mílon #4 spec §2/§6)", () => {
    setupHook({ program: makeProgram() });

    render(<ProgramDetailPage />);

    const nav = screen.getByRole("navigation", {
      name: "Navegação do módulo Mílon",
    });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(3);
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

    const treinoDoDia = within(nav).getByRole("link", { name: "Treino do Dia" });
    const programas = within(nav).getByRole("link", { name: "Programas" });
    const exercicios = within(nav).getByRole("link", { name: "Exercícios" });
    expect(programas).toHaveAttribute("aria-current", "page");
    expect(treinoDoDia).not.toHaveAttribute("aria-current", "page");
    expect(exercicios).not.toHaveAttribute("aria-current", "page");
  });

  it("nenhum dos quatro estados da página exibe o placeholder de treinos 'Treinos em breve' (CA-P3-20)", () => {
    const cenarios: Array<{
      program: Program | null;
      loading: boolean;
      error: string | null;
    }> = [
      { program: makeProgram(), loading: false, error: null }, // cabeçalho
      { program: null, loading: false, error: null }, // não encontrado
      { program: null, loading: true, error: null }, // carregando
      { program: null, loading: false, error: "Falha ao carregar" }, // falha de fetch
    ];

    for (const cenario of cenarios) {
      cleanup();
      setupHook(cenario);
      render(<ProgramDetailPage />);

      // CA-P3-20 (tasks.json TASK-015 AC3, verbatim): a asserção de
      // ausência do placeholder de treinos permanece em todos os estados.
      expect(screen.queryByText(/treinos em breve/i)).not.toBeInTheDocument();
      // O placeholder abrangente "em breve" também não aparece em outro texto.
      expect(
        (document.body.textContent ?? "").toLowerCase(),
      ).not.toContain("em breve");
    }
  });
});

// ===========================================================================
// Patch v5 — adoção do AsyncState na rota de detalhe (TASK-036 RED → TASK-037)
// ===========================================================================
//
// Contrato — tasks.json TASK-036/037 (acceptanceCriteria verbatim) +
// spec.md Patch v5 (D19, D20, D21, R19, R24, R25, R26, CA-P5-1, CA-P5-3,
// CA-P5-5, CA-P5-7) + plan.md "Patch v5" §3 "Página de detalhe":
//
// - A cadeia ternária das linhas 21–47 (loading → erro com retry próprio →
//   não-encontrado → cabeçalho) sai do arquivo e a página passa a compor o
//   `AsyncState` dentro de `MilonLayout` (D21/R26);
// - A página compõe o componente **sem informar `errorOrigin`** — o hook
//   `useProgramDetail` não expõe origem (plan §3 "Página de detalhe" e
//   TASK-037 AC1) —, de modo que a origem AUSENTE é tratada como `carga`
//   dentro do componente (D20/default de R25 exercido em tela real) e a falha
//   de fetch mantém "Tentar novamente" ligado a `retry`;
// - Precedência D19: loading → erro (banner ACIMA, children visível) → empty
//   (id desconhecido) → children (cabeçalho: título `font-display`, dono,
//   badge `STATUS_LABEL`);
// - R19 preservado: id desconhecido continua DISTINT de falha de carga — faixa
//   de vazio "Programa não encontrado." + explicação, SEM "Tentar novamente";
// - Textos invariáveis (CA-P5-5): "Carregando programa…" (reticência
//   horizontal U+2026), "Programa não encontrado." e a explicação; `noResults`
//   fixo nessa tela (nunca aparece);
// - CA-P5-7: 0 ocorrências de "Tentar novamente" no arquivo da página (o
//   rótulo passa a viver só em `components/ui/AsyncState.tsx`).
//
// Expected: FAIL (RED) hoje para —
//   (a) programa + erro: a cadeia SUBSTITUI o cabeçalho pelo banner (motivo
//       esperado: o título do programa não está no documento);
//   (b) a página ainda não importa `AsyncState`;
//   (c) a busca "Tentar novamente" no arquivo ainda retorna 1 (retry próprio).
// Os demais cenários são travas de regressão verdes hoje e depois
// (R19/R26/CA-P5-5) — nenhum teste existente é alterado.

const DETALHE_MENSAGEM = "Erro ao carregar programa";
const DETALHE_TITULO = "Ficha Verão 2026";
const DETALHE_DONO = "ana@hestia.lan";
const EXPLICACAO_NAO_ENCONTRADO =
  "Este programa não existe ou foi removido. Volte para a lista e escolha outro programa.";
const LOADING_TEXTO = "Carregando programa…";
// Defaults do próprio AsyncState — na rota de detalhe `noResults` é fixo
// false (plan §3), portanto nenhum destes textos pode aparecer.
const NO_RESULTS_TITULO = "Nada encontrado para essa combinação.";
const NO_RESULTS_TEXTO = "Ajuste os filtros para ver mais programas.";

/** O nó `earlier` aparece antes de `later` na árvore (banner ACIMA). */
function expectAppearsBefore(earlier: HTMLElement, later: HTMLElement): void {
  const position = earlier.compareDocumentPosition(later);
  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

describe("Patch v5 — rota de detalhe compõe o AsyncState (TASK-036 RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    setupWorkouts(); // defaults do useProgramWorkouts em todo render
  });

  it("R24/CA-P5-1: programa + erro => banner ACIMA do cabeçalho, cabeçalho visível e 'Tentar novamente' aciona retry", () => {
    const state = setupHook({
      program: makeProgram({ title: DETALHE_TITULO, owner: DETALHE_DONO }),
      error: DETALHE_MENSAGEM,
    });

    render(<ProgramDetailPage />);

    const banner = screen.getByText(DETALHE_MENSAGEM);
    // O conteúdo (cabeçalho) permanece visível e legível sob o erro…
    const titulo = screen.getByRole("heading", { level: 2, name: /ficha verão 2026/i });
    expect(titulo.className).toMatch(/font-display/);
    expect(screen.getByText(DETALHE_DONO)).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    // …e o banner aparece ACIMA dele (nunca o substitui — R24/CA-P5-1).
    expectAppearsBefore(banner, titulo);

    // Origem ausente na rota de detalhe ⇒ `carga` ⇒ retry ligado a `retry`.
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(state.retry).toHaveBeenCalledTimes(1);

    // Estados exclusivos sob erro: nem loading nem não-encontrado (D19).
    expect(screen.queryByText(LOADING_TEXTO)).not.toBeInTheDocument();
    expect(screen.queryByText("Programa não encontrado.")).not.toBeInTheDocument();
    expect(screen.queryByText(EXPLICACAO_NAO_ENCONTRADO)).not.toBeInTheDocument();
  });

  it("falha de fetch SEM conteúdo => somente o banner com 'Tentar novamente' (origem ausente ⇒ carga, default em tela real)", () => {
    const state = setupHook({ program: null, error: DETALHE_MENSAGEM });

    render(<ProgramDetailPage />);

    expect(screen.getByText(DETALHE_MENSAGEM)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(state.retry).toHaveBeenCalledTimes(1);

    // D19d: falha de carga nunca chega a dizer "não encontrado" nem
    // "carregando" — e não há cabeçalho (programa nulo) nem retry escondido.
    expect(screen.queryByText("Programa não encontrado.")).not.toBeInTheDocument();
    expect(screen.queryByText(EXPLICACAO_NAO_ENCONTRADO)).not.toBeInTheDocument();
    expect(screen.queryByText(LOADING_TEXTO)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("R19: id desconhecido => faixa de vazio 'Programa não encontrado.' + explicação exata, SEM 'Tentar novamente'", () => {
    // program nulo + error nulo + loading false = estado de não-encontrado,
    // distinto do estado de falha de fetch (spec R19 / plan §3) — aqui ele é
    // a prop `empty` do AsyncState.
    setupHook();

    render(<ProgramDetailPage />);

    expect(screen.getByText("Programa não encontrado.")).toBeInTheDocument();
    expect(screen.getByText(EXPLICACAO_NAO_ENCONTRADO)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(LOADING_TEXTO)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("D19/CA-P5-5: carregando => somente 'Carregando programa…' (texto idêntico ao de hoje), sem banner, cabeçalho ou retry", () => {
    // loading real de retry: o hook mantém o programa já carregado.
    setupHook({ loading: true, program: makeProgram({ title: DETALHE_TITULO }) });

    render(<ProgramDetailPage />);

    expect(screen.getByText(LOADING_TEXTO)).toBeInTheDocument();
    expect(screen.queryByText(DETALHE_MENSAGEM)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Programa não encontrado.")).not.toBeInTheDocument();
  });

  it("precedência D19: carregando vence erro e cabeçalho — só o texto de carregamento", () => {
    setupHook({
      loading: true,
      program: makeProgram({ title: DETALHE_TITULO }),
      error: DETALHE_MENSAGEM,
    });

    render(<ProgramDetailPage />);

    expect(screen.getByText(LOADING_TEXTO)).toBeInTheDocument();
    expect(screen.queryByText(DETALHE_MENSAGEM)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it("precedência D19: erro vence o vazio — program nulo + erro => banner com retry, nunca a faixa de não-encontrado", () => {
    setupHook({ program: null, error: DETALHE_MENSAGEM });

    render(<ProgramDetailPage />);

    expect(screen.getByText(DETALHE_MENSAGEM)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.queryByText("Programa não encontrado.")).not.toBeInTheDocument();
    expect(screen.queryByText(EXPLICACAO_NAO_ENCONTRADO)).not.toBeInTheDocument();
  });

  it("CA-P5-5/R26: textos do detalhe idênticos aos de hoje nos 4 estados e noResults nunca aparece", () => {
    const cenarios: Array<{
      nome: string;
      estado: Record<string, unknown>;
      esperados: string[];
    }> = [
      {
        nome: "carregando",
        estado: { loading: true, program: makeProgram() },
        esperados: [LOADING_TEXTO],
      },
      {
        nome: "falha de fetch",
        estado: { program: null, error: DETALHE_MENSAGEM },
        esperados: [DETALHE_MENSAGEM],
      },
      {
        nome: "id desconhecido",
        estado: {},
        esperados: ["Programa não encontrado.", EXPLICACAO_NAO_ENCONTRADO],
      },
      {
        nome: "cabeçalho",
        estado: {
          program: makeProgram({ title: DETALHE_TITULO, owner: DETALHE_DONO }),
        },
        esperados: [DETALHE_TITULO, DETALHE_DONO, "Rascunho"],
      },
    ];

    for (const cenario of cenarios) {
      cleanup();
      setupHook(cenario.estado);
      render(<ProgramDetailPage />);

      for (const texto of cenario.esperados) {
        expect(screen.getByText(texto), `estado "${cenario.nome}"`).toBeInTheDocument();
      }
      // `noResults` fixo nessa tela (plan §3): nenhum cartão de no-results.
      expect(screen.queryByText(NO_RESULTS_TITULO)).not.toBeInTheDocument();
      expect(screen.queryByText(NO_RESULTS_TEXTO)).not.toBeInTheDocument();
    }
  });
});

/** Fonte da página de detalhe (mesmo padrão de leitura de page.test.tsx da raiz). */
function detalhePageSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../../../app/milon/programs/[id]/page.tsx"),
    "utf8",
  );
}

/** Fonte do componente centralizado. */
function asyncStateSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../../../components/ui/AsyncState.tsx"),
    "utf8",
  );
}

describe("TASK-037 — critérios de substituição (buscas por placeholder → 0)", () => {
  it("D21/R26: a página compõe o AsyncState (import de '@/components/ui/AsyncState')", () => {
    expect(detalhePageSource()).toMatch(/from\s+["']@\/components\/ui\/AsyncState["']/);
  });

  it("CA-P5-7: 'Tentar novamente' em app/milon/programs/[id]/page.tsx => 0 ocorrências", () => {
    expect(detalhePageSource().split("Tentar novamente").length - 1).toBe(0);
  });

  it("CA-P5-7 (reafirmação): 'lib/milon' em components/ui/AsyncState.tsx => 0 ocorrências", () => {
    expect(asyncStateSource().split("lib/milon").length - 1).toBe(0);
  });
});

// ===========================================================================
// TASK-015 — a página do Programa compõe a lista de treinos (RED)
// ===========================================================================
//
// Contrato — tasks.json TASK-015 (description + acceptanceCriteria verbatim)
// + plan.md §3 "Página do Programa" + §4 "Detalhe do Programa (lista de
// treinos)":
//
// - a página mantém o cabeçalho existente e passa também a compor
//   `useProgramWorkouts(id)` + `WorkoutList` (subtítulos derivados repassados);
// - botão "Adicionar treino" (OCULTO quando program.status === 'inativo')
//   abre `WorkoutModal` em modo criar com `defaultName` vindo de
//   `sugerirNomeTreino` (Programa vazio ⇒ "Treino A"; "Treino A" + "Push" ⇒
//   "Treino B" — primeira posição livre);
// - renomear abre o MESMO modal em modo renomear com o nome atual do item e
//   `otherNames` sem o próprio treino (renomear sem alterar o texto é aceito);
// - excluir é ação direta do item da lista → `remove(workout)` SEM modal de
//   confirmação (plan §4: "Excluir é ação direta do item");
// - `MSG_TREINO_COM_EXERCICIOS` vindo do hook (origem `bloqueio`) vira banner
//   DENTRO da lista e a lista permanece visível (R: mensagem visível sem
//   fechar a tela de onde partiu a ação — sem "Tentar novamente");
// - `WorkoutList.readOnly` = status `inativo` (sem Renomear/Excluir);
// - CA-P3-20 permanece no teste do bloco TASK-026 (AC3).
//
// Expected: FAIL (RED) HOJE: a página ainda não importa o hook
// `useProgramWorkouts` nem o `WorkoutList` — o motivo esperado é a ausência
// dos botões/itens/seção novos (não falha de sintaxe nem de mock).

describe("TASK-015 — detalhe do Programa compõe a lista de treinos (RED)", () => {
  it("renderiza a seção 'Treinos' com os treinos do mock, subtítulo e link de detalhe de cada um", () => {
    setupHook({ program: makeProgram() });
    setupWorkouts({
      workouts: [
        makeWorkout({ id: "wout-1", name: "Treino A" }),
        makeWorkout({
          id: "wout-2",
          name: "Push",
          createdAt: "2026-10-01T01:00:00Z",
        }),
      ],
      subtitles: { "wout-1": "Peito, Tríceps e Ombros" },
    });

    render(<ProgramDetailPage />);

    const titulo = screen.getByRole("heading", { level: 2, name: "Treinos" });
    expect(titulo.className).toMatch(/font-display/);
    const secao = titulo.closest("section");
    expect(secao?.getAttribute("aria-label")).toBe("Treinos");

    // Ordem de criação preservada e href por treino (plan §3 WorkoutList).
    const links = screen
      .getAllByRole("link")
      .filter((link) =>
        (link.getAttribute("href") ?? "").includes("/workouts/"),
      );
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/milon/programs/prog-1/workouts/wout-1",
      "/milon/programs/prog-1/workouts/wout-2",
    ]);

    // Subtítulo derivado repassado ao WorkoutList (plan §4 — derivado no hook).
    expect(screen.getByText("Peito, Tríceps e Ombros")).toBeInTheDocument();
    // O cabeçalho do programa continua no lugar (nada é substituído).
    expect(
      screen.getByRole("heading", { name: /ficha verão 2026/i }),
    ).toBeInTheDocument();
  });

  it("Programa sem treinos mostra o estado vazio da lista com a orientação de adicionar", () => {
    setupHook({ program: makeProgram() });
    setupWorkouts({ workouts: [] });

    render(<ProgramDetailPage />);

    expect(screen.getByText("Nenhum treino ainda.")).toBeInTheDocument();
    expect(
      screen.getByText(/adicione o primeiro treino/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("lista em carregamento usa o estado do WorkoutList ('Carregando treinos…')", () => {
    setupHook({ program: makeProgram() });
    setupWorkouts({ loading: true });

    render(<ProgramDetailPage />);

    expect(screen.getByText(/carregando treinos/i)).toBeInTheDocument();
    expect(screen.queryByText("Nenhum treino ainda.")).not.toBeInTheDocument();
  });

it("'Adicionar treino' em Programa vazio abre o modal com sugestão 'Treino A' e grava via hook", async () => {
    setupHook({ program: makeProgram() });
    const state = setupWorkouts({ workouts: [] });

    render(<ProgramDetailPage />);
    await clickConnectedButton(/adicionar treino/i);

    expect(
      screen.getByRole("heading", { name: "Novo treino" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Treino A");

    await clickConnectedButton(/^salvar$/i);
    await waitFor(() =>
      expect(state.create).toHaveBeenCalledWith({ name: "Treino A" }),
    );
  });

  it("criar treino redireciona para a página de detalhamento do treino criado", async () => {
    setupHook({ program: makeProgram() });
    const createdWorkout = makeWorkout({ id: "wout-new", name: "Treino A" });
    const state = setupWorkouts({
      workouts: [],
      create: vi.fn(async () => createdWorkout),
    });
    const mockPush = vi.fn();
    // Sobrescreve o mock do useRouter para capturar o push
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    });

    render(<ProgramDetailPage />);
    await clickConnectedButton(/adicionar treino/i);
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() =>
      expect(state.create).toHaveBeenCalledWith({ name: "Treino A" }),
    );
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        "/milon/programs/prog-1/workouts/wout-new",
      ),
    );
  });

  it("a sugestão usa a primeira posição livre: com 'Treino A' e 'Push' o modal abre com 'Treino B'", async () => {
    setupHook({ program: makeProgram() });
    setupWorkouts({
      workouts: [
        makeWorkout({ id: "wout-1", name: "Treino A" }),
        makeWorkout({
          id: "wout-2",
          name: "Push",
          createdAt: "2026-10-01T01:00:00Z",
        }),
      ],
    });

    render(<ProgramDetailPage />);
    await clickConnectedButton(/adicionar treino/i);

    expect(screen.getByLabelText("Nome")).toHaveValue("Treino B");
    expect(screen.getByRole("heading", { name: "Novo treino" })).toBeInTheDocument();
  });

  it("Programa inativo: sem 'Adicionar treino' e a lista fica somente leitura (sem Renomear/Excluir)", () => {
    setupHook({ program: makeProgram({ status: "inativo" }) });
    setupWorkouts({ workouts: [makeWorkout({ id: "wout-1", name: "Treino A" })] });

    render(<ProgramDetailPage />);

    expect(
      screen.queryByRole("button", { name: /adicionar treino/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /renomear/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /excluir/i }),
    ).not.toBeInTheDocument();
    // Somente leitura esconde as AÇÕES, não o conteúdo (regra da #2).
    expect(
      screen.getByRole("heading", { level: 3, name: "Treino A" }),
    ).toBeInTheDocument();
  });

  it("renomear abre o modal em modo renomear com o nome atual e grava sem colidir com o próprio nome", async () => {
    setupHook({ program: makeProgram() });
    const state = setupWorkouts({
      workouts: [
        makeWorkout({ id: "wout-1", name: "Treino A" }),
        makeWorkout({
          id: "wout-2",
          name: "Push",
          createdAt: "2026-10-01T01:00:00Z",
        }),
      ],
    });

    render(<ProgramDetailPage />);
    // Ordem de criação: ordinal 0 é o botão Renomear do 1º item ("Treino A").
    await clickConnectedButton(/renomear/i, 0);

    expect(
      screen.getByRole("heading", { name: "Renomear treino" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Treino A");

    await clickConnectedButton(/^salvar$/i);
    await waitFor(() =>
      expect(state.rename).toHaveBeenCalledWith("wout-1", {
        name: "Treino A",
      }),
    );
  });

  it("'Excluir' na linha do treino chama remove do hook com o treino clicado (ação direta, sem confirmação)", async () => {
    setupHook({ program: makeProgram() });
    const state = setupWorkouts({
      workouts: [
        makeWorkout({ id: "wout-1", name: "Treino A" }),
        makeWorkout({
          id: "wout-2",
          name: "Push",
          createdAt: "2026-10-01T01:00:00Z",
        }),
      ],
    });

    render(<ProgramDetailPage />);
    await clickConnectedButton(/excluir/i, 0);

    await waitFor(() =>
      expect(state.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: "wout-1", name: "Treino A" }),
      ),
    );
    // D6: a exclusão de treino aqui é ação direta — nenhum modal de
    // confirmação é aberto antes do remove (nenhuma sobreposição na tela).
    expect(document.querySelector(".fixed.inset-0")).toBeNull();
  });

  it("MSG_TREINO_COM_EXERCICIOS (origem bloqueio) vira banner da lista e a lista permanece visível", () => {
    setupHook({ program: makeProgram() });
    setupWorkouts({
      workouts: [makeWorkout({ id: "wout-1", name: "Treino A" })],
      errorMsg: MSG_TREINO_COM_EXERCICIOS,
      errorOrigin: "bloqueio",
    });

    render(<ProgramDetailPage />);

    expect(screen.getByText(MSG_TREINO_COM_EXERCICIOS)).toBeInTheDocument();
    // Origem `bloqueio` => sem retry (D27/R31: retry só em carga/ausente).
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    // A tela de onde partiu a ação permanece: o conteúdo continua montado.
    expect(
      screen.getByRole("heading", { level: 3, name: "Treino A" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Treinos" }),
    ).toBeInTheDocument();
  });
});
