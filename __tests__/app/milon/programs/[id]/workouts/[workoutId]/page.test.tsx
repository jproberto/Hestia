import fs from "node:fs";
import path from "node:path";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutPage from "@/app/milon/programs/[id]/workouts/[workoutId]/page";

/**
 * Contrato RED — Mílon #4 Treino do Dia (TASK-002):
 * `app/milon/programs/[id]/workouts/[workoutId]/page.tsx` vira wrapper fino.
 *
 * Fonte da verdade: `.agents/modules/milon/04-treino-do-dia/spec.md` §3
 * (paridade total — comportamento idêntico, nenhuma regra reescrita) +
 * `plan.md` §2 (tabela Modify: wrapper resolve `id`/`workoutId` via
 * `useParams` e renderiza `WorkoutDetailSection` com `workoutId` +
 * `backTarget` programa; critério: busca por `handleConfirmUnit` neste
 * arquivo retorna 0 em código vivo) + §3
 * (contrato textual WorkoutDetailSectionProps) + `tasks.json` TASK-002.
 *
 * Escrito ANTES da extração (outside-in): falha porque a página atual
 * ainda contém o corpo inteiro da manutenção (516 linhas: handlers,
 * modais, overrides) e NÃO delega à seção — Expected: FAIL por
 * contrato novo (nenhum arquivo de produção alterado). Hefesto fará
 * GREEN extraindo o corpo para a seção e afinando esta página.
 *
 * CONTRATO DO WRAPPER:
 * - resolve `id` + `workoutId` via `useParams` e repassa `workoutId`
 *   à `WorkoutDetailSection`;
 * - `backTarget` = variante `program` com `programId` = `id` da rota
 *   (Treino do Dia usa `none`; manutenção usa `program`);
 * - sem lógica de detalhe no wrapper: nenhum `handleConfirmUnit`,
 *   nenhum `useWorkoutDetail`, nenhum modal direto.
 *
 * Convenção fixada aqui (derivada do plano §3): `backTarget` é união
 * discriminada por `kind` —
 * `{ kind: "program"; programId: string } | { kind: "none" }`.
 */

// next/navigation mockado por arquivo: useParams devolve id + workoutId da
// rota aninhada (inclui caso array resolvido para o primeiro elemento).
const mockUseParams = vi.hoisted(() =>
  vi.fn((): { id: string | string[]; workoutId: string | string[] } => ({
    id: "prog-1",
    workoutId: "wout-1",
  })),
);

vi.mock("next/navigation", () => ({
  useParams: mockUseParams,
  usePathname: vi.fn(() => "/milon/programs/prog-1/workouts/wout-1"),
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

// Seção mockada por arquivo: o wrapper deve apenas repassar props.
// O stub registra as props recebidas para asserção de contrato (sem DOM
// próprio — o wrapper fino não adiciona marcação além da seção).
vi.mock("@/components/milon/WorkoutDetailSection", () => ({
  WorkoutDetailSection: vi.fn(() => null),
}));

// Barrel de execuções mockado (replano 2ª volta): a página carrega a execução
// aberta do treino e repassa executionBlocked à seção.
vi.mock("@/lib/milon/db/executions", () => ({
  findOpenExecutionByWorkoutStandalone: vi.fn(),
}));

import { WorkoutDetailSection as MockedSection } from "@/components/milon/WorkoutDetailSection";
import { findOpenExecutionByWorkoutStandalone } from "@/lib/milon/db/executions";

function renderedProps() {
  const mock = MockedSection as unknown as ReturnType<typeof vi.fn>;
  const last = mock.mock.calls.at(-1) as
    | [{ workoutId?: string; backTarget?: unknown; executionBlocked?: boolean }]
    | undefined;
  return last?.[0] ?? {};
}

describe("WorkoutPage wrapper (TASK-002 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: "prog-1", workoutId: "wout-1" });
  });

  it("resolve workoutId dos params e repassa à WorkoutDetailSection", () => {
    render(<WorkoutPage />);

    expect(mockUseParams).toHaveBeenCalled();
    expect(MockedSection).toHaveBeenCalled();
    expect(renderedProps().workoutId).toBe("wout-1");
  });

  it("repassa backTarget programa com o programId da rota", () => {
    render(<WorkoutPage />);

    expect(renderedProps().backTarget).toEqual({
      kind: "program",
      programId: "prog-1",
    });
  });

  it("resolve params em formato array para o primeiro elemento", () => {
    mockUseParams.mockReturnValue({ id: ["prog-9"], workoutId: ["wout-9"] });

    render(<WorkoutPage />);

    expect(renderedProps().workoutId).toBe("wout-9");
    expect(renderedProps().backTarget).toEqual({
      kind: "program",
      programId: "prog-9",
    });
  });

  it("não carrega o detalhe direto: sem AsyncState próprio nem lista de exercícios no wrapper", () => {
    render(<WorkoutPage />);

    expect(
      screen.queryByRole("region", { name: "Exercícios do treino" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /adicionar exercício/i }),
    ).not.toBeInTheDocument();
  });
});

/** Fonte da página (raiz = 7 níveis acima do diretório [workoutId]). */
function workoutPageSource(): string {
  return fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../../../../../app/milon/programs/[id]/workouts/[workoutId]/page.tsx",
    ),
    "utf8",
  );
}

describe("TASK-002 — manutenção como wrapper fino (fonte)", () => {
  it("a página delega à WorkoutDetailSection (import direto)", () => {
    expect(workoutPageSource()).toMatch(
      /from\s+["']@\/components\/milon\/WorkoutDetailSection["']/,
    );
  });

  it("a página repassa backTarget programa (sem lógica de detalhe própria)", () => {
    expect(workoutPageSource()).toMatch(/backTarget/);
  });

  it("busca por handleConfirmUnit nesta página retorna 0 em código vivo (corpo movido p/ seção)", () => {
    expect(
      workoutPageSource().split("handleConfirmUnit").length - 1,
    ).toBe(0);
  });

  it("'Tentar novamente' nesta página => 0 ocorrências (AsyncState vive na seção)", () => {
    expect(workoutPageSource().split("Tentar novamente").length - 1).toBe(0);
  });
});

/**
 * Contrato layout-único (causa raiz: wrapper da manutenção não tinha
 * layout próprio — dependia do MilonLayout interno da seção, que agora
 * é pura; sem layout na página a rota da manutenção ficaria sem
 * banner/abas após a extração).
 *
 * Contrato novo: 1 MilonLayout por rota, seção sem layout. O wrapper da
 * manutenção envolve com MilonLayout próprio; a seção entra pura por
 * dentro (sem nav próprio).
 *
 * Expected: FAIL até Hefesto implementar (wrapper ainda sem layout).
 */
describe("WorkoutPage wrapper com layout próprio (contrato layout-único — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: "prog-1", workoutId: "wout-1" });
  });

  it("envolve a seção com o layout do módulo (mascote Mílon visível)", () => {
    render(<WorkoutPage />);

    expect(screen.getByText("Mílon")).toBeInTheDocument();
  });

  it("renderiza exatamente 1 navegação do módulo (layout único, sem duplicata da seção)", () => {
    render(<WorkoutPage />);

    const navs = screen.getAllByRole("navigation", {
      name: "Navegação do módulo Mílon",
    });
    expect(navs).toHaveLength(1);
    expect(MockedSection).toHaveBeenCalled();
  });

  it("mantém o contrato do wrapper: repassa workoutId + backTarget programa mesmo com layout próprio", () => {
    render(<WorkoutPage />);

    expect(renderedProps().workoutId).toBe("wout-1");
    expect(renderedProps().backTarget).toEqual({
      kind: "program",
      programId: "prog-1",
    });
  });
});

describe("TASK-004 — wrapper da manutenção com MilonLayout (fonte, contrato layout-único — RED)", () => {
  it("a página envolve com MilonLayout próprio (import direto)", () => {
    expect(workoutPageSource()).toMatch(
      /from\s+["']@\/components\/milon\/MilonLayout["']/,
    );
  });

  it("o wrapper declara MilonLayout com título (1 layout por rota)", () => {
    expect(workoutPageSource()).toMatch(/<MilonLayout/);
  });
});

/**
 * Replano 2ª volta — carregamento da execução aberta e executionBlocked.
 *
 * Fonte: spec §3 (enquanto houver execução aberta, o template daquele treino
 * específico fica bloqueado para edição na manutenção) + plan.md §1
 * (Mudança 3: a página carrega a execução aberta via
 * findOpenExecutionByWorkoutStandalone e passa executionBlocked à seção) +
 * tasks.json TASK-001.
 *
 * Expected: FAIL — a página ainda não carrega a execução aberta (o mock do
 * barrel nunca é chamado e executionBlocked não é passado). Hefesto fará
 * GREEN na TASK-004 sem mudar estes testes.
 */
describe("TASK-001 (2ª volta) — execução aberta e executionBlocked (RED)", () => {
  const mockFindOpen = findOpenExecutionByWorkoutStandalone as unknown as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: "prog-1", workoutId: "wout-1" });
  });

  function makeExecution() {
    return {
      id: "exec-1",
      workoutId: "wout-1",
      programId: "prog-1",
      startedAt: "2026-10-08T10:00:00.000Z",
      finishedAt: null,
      createdAt: "2026-10-08T10:00:00.000Z",
      created_by: "ana@hestia.lan",
    };
  }

  it("carrega a execução aberta do treino (findOpenExecutionByWorkoutStandalone com workoutId)", async () => {
    mockFindOpen.mockResolvedValue(null);

    render(<WorkoutPage />);

    await waitFor(() =>
      expect(mockFindOpen).toHaveBeenCalledWith("wout-1"),
    );
  });

  it("com execução aberta, passa executionBlocked=true à WorkoutDetailSection", async () => {
    mockFindOpen.mockResolvedValue(makeExecution());

    render(<WorkoutPage />);

    await waitFor(() => expect(mockFindOpen).toHaveBeenCalled());
    expect(renderedProps().executionBlocked).toBe(true);
  });

  it("sem execução aberta, passa executionBlocked=false à WorkoutDetailSection", async () => {
    mockFindOpen.mockResolvedValue(null);

    render(<WorkoutPage />);

    await waitFor(() => expect(mockFindOpen).toHaveBeenCalled());
    expect(renderedProps().executionBlocked).toBe(false);
  });
});

describe("TASK-001 (2ª volta) — fonte: carregamento da execução aberta (RED)", () => {
  it("a página importa findOpenExecutionByWorkoutStandalone de db/executions", () => {
    expect(workoutPageSource()).toMatch(/findOpenExecutionByWorkoutStandalone/);
  });

  it("a página passa executionBlocked à WorkoutDetailSection", () => {
    expect(workoutPageSource()).toMatch(/executionBlocked/);
  });
});
