import fs from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
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

import { WorkoutDetailSection as MockedSection } from "@/components/milon/WorkoutDetailSection";

function renderedProps() {
  const mock = MockedSection as unknown as ReturnType<typeof vi.fn>;
  const last = mock.mock.calls.at(-1) as
    | [{ workoutId?: string; backTarget?: unknown }]
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
