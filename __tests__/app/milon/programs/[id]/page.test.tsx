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
