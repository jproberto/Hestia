import fs from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import ProgramDetailPage from "@/app/milon/programs/[id]/page";
import { useProgramDetail } from "@/lib/milon/hooks/useProgramDetail";
import type { Program } from "@/lib/milon/types";

/**
 * Contrato — tasks.json TASK-026 (acceptanceCriteria verbatim) +
 * spec.md Patch v4 §Q3/Q4 (R18, R19, CA-P3-17, CA-P3-20) +
 * plan.md "Aditivo - Patch v4" §3 "Página de detalhe" + §5 decisões 4/6:
 *
 * - CA-P3-17: quem acessa `/milon/programs/<id>` de um programa existente
 *   vê título, dono e status daquele programa — e nenhum texto de treinos;
 * - CA-P3-20: nenhum placeholder de treinos ("Treinos em breve", seção ou
 *   lista vazia) — busca case-insensitive por "treino" no render ⇒ 0;
 * - R19: id desconhecido ⇒ estado "Programa não encontrado." com explicação,
 *   DISTINTO do estado de falha de fetch (sem "Tentar novamente") e sem
 *   programa errado nem tela em branco;
 * - R18: render dentro de MilonLayout com exatamente as duas abas e a aba
 *   "Programas" com `aria-current='page'` (regra de prefixo do Patch v3:
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
 *
 * RED (Expected: FAIL): `app/milon/programs/[id]/page.tsx` e
 * `lib/milon/hooks/useProgramDetail.ts` ainda não existem (TASK-027).
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

  it("renderiza dentro de MilonLayout com exatamente as duas abas e 'Programas' ativa (R18)", () => {
    setupHook({ program: makeProgram() });

    render(<ProgramDetailPage />);

    const nav = screen.getByRole("navigation", {
      name: "Navegação do módulo Mílon",
    });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(2);

    const programas = within(nav).getByRole("link", { name: "Programas" });
    const exercicios = within(nav).getByRole("link", { name: "Exercícios" });
    expect(programas).toHaveAttribute("aria-current", "page");
    expect(exercicios).not.toHaveAttribute("aria-current", "page");
  });

  it("nenhum dos quatro estados da página menciona treinos (CA-P3-20)", () => {
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

      // Busca case-insensitive por "treino" no texto renderizado ⇒ 0 ocorrências
      // (cobre "Treinos em breve", seção de treinos e lista vazia de treinos).
      const texto = (document.body.textContent ?? "").toLowerCase();
      expect(texto).not.toContain("treino");
      expect(screen.queryByText(/treinos em breve/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /treino/i })).not.toBeInTheDocument();
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
