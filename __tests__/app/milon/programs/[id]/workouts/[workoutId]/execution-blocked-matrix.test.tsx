import fs from "node:fs";
import path from "node:path";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkoutPage from "@/app/milon/programs/[id]/workouts/[workoutId]/page";

/**
 * Matriz correta do bloqueio na página de manutenção (Mílon #5 — trava RED).
 *
 * Verdade humana: bloqueio da edição na aba Programas vale SOMENTE com
 * execução ATIVA (iniciada E não encerrada E não cancelada). Sem ativa =
 * edição normal: (a) nunca iniciado → livre; (b) encerrada (finished_at
 * preenchido, feature #7) → livre; (c) cancelada (linha excluída) → livre.
 * Com ativa → executionBlocked=true naquele treino; edições só pelo Treino
 * do Dia (executionEnabled, sem executionBlocked).
 *
 * Como a página consome `findOpenExecutionByWorkoutStandalone` (que já filtra
 * finished_at nulo no repository), os 3 casos livres chegam à página como
 * `null` → executionBlocked=false. A encerrada NUNCA chega como objeto: se um
 * dia a página passar a consultar existência sem filtrar fim (bug suspeito:
 * bloquear com qualquer execução inclusive encerrada), o caso (b) fica RED.
 *
 * Fonte: delegação Minos (REGRA CORRETA) + spec.md §3 + plan.md §1 Mudança 3
 * (página carrega a aberta e passa executionBlocked={execution !== null}).
 *
 * Só __tests__: nenhum arquivo de produção é tocado aqui.
 */

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

vi.mock("@/components/milon/WorkoutDetailSection", () => ({
  WorkoutDetailSection: vi.fn(() => null),
}));

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

function makeAtiva() {
  return {
    id: "exec-ativa",
    workoutId: "wout-1",
    programId: "prog-1",
    startedAt: "2026-10-09T10:00:00.000Z",
    finishedAt: null,
    createdAt: "2026-10-09T10:00:00.000Z",
    created_by: "ana@hestia.lan",
  };
}

describe("matriz do bloqueio — página de manutenção (executionBlocked)", () => {
  const mockFindOpen = findOpenExecutionByWorkoutStandalone as unknown as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: "prog-1", workoutId: "wout-1" });
  });

  it("com execução ATIVA (iniciada, sem fim, sem cancelamento) → executionBlocked=true (bloqueado, editar só no Treino do Dia)", async () => {
    mockFindOpen.mockResolvedValue(makeAtiva());

    render(<WorkoutPage />);

    await waitFor(() => expect(mockFindOpen).toHaveBeenCalledWith("wout-1"));
    expect(renderedProps().executionBlocked).toBe(true);
  });

  it("(a) treino nunca iniciado (sem execução → find retorna null) → executionBlocked=false (edição livre)", async () => {
    mockFindOpen.mockResolvedValue(null);

    render(<WorkoutPage />);

    await waitFor(() => expect(mockFindOpen).toHaveBeenCalledWith("wout-1"));
    expect(renderedProps().executionBlocked).toBe(false);
  });

  it("(b) execução ENCERRADA (finished_at preenchido, feature #7) é filtrada pelo repository → find retorna null → executionBlocked=false (edição livre)", async () => {
    // A encerrada nunca chega à página como objeto: o repository filtra
    // finished_at nulo. A página correta vê null e libera. Se a página um dia
    // consultar existência sem filtrar fim (bug suspeito), ela receberia o
    // objeto encerrado e travaria — este teste ficaria RED.
    mockFindOpen.mockResolvedValue(null);

    render(<WorkoutPage />);

    await waitFor(() => expect(mockFindOpen).toHaveBeenCalledWith("wout-1"));
    expect(renderedProps().executionBlocked).toBe(false);
  });

  it("(c) execução CANCELADA (linha excluída via clearExecution → find retorna null) → executionBlocked=false (edição livre)", async () => {
    mockFindOpen.mockResolvedValue(null);

    render(<WorkoutPage />);

    await waitFor(() => expect(mockFindOpen).toHaveBeenCalledWith("wout-1"));
    expect(renderedProps().executionBlocked).toBe(false);
  });

  it("hook/seção: Treino do Dia funciona com execução ATIVA (edições pelo Treino do Dia, não bloqueadas pela manutenção)", async () => {
    // Com ativa, a manutenção bloqueia (true) mas o Treino do Dia segue
    // operável: a seção do Treino do Dia usa executionEnabled sem
    // executionBlocked. Aqui travamos que a manutenção não vaza bloqueio
    // para o Treino do Dia: a prop da manutenção é por treino e a página
    // today não passa executionBlocked.
    mockFindOpen.mockResolvedValue(makeAtiva());

    render(<WorkoutPage />);

    await waitFor(() => expect(mockFindOpen).toHaveBeenCalled());
    // Bloqueio vale NAQUELE treino na manutenção…
    expect(renderedProps().executionBlocked).toBe(true);
    // …e o Treino do Dia não recebe esse bloqueio (fonte today travada abaixo).
    expect(fs.readFileSync(todaySourcePath(), "utf8")).toMatch(/executionEnabled/);
    expect(fs.readFileSync(todaySourcePath(), "utf8")).not.toMatch(/executionBlocked/);
  });
});

function pageSourcePath(): string {
  return path.resolve(
    __dirname,
    "../../../../../../../app/milon/programs/[id]/workouts/[workoutId]/page.tsx",
  );
}

function todaySourcePath(): string {
  return path.resolve(__dirname, "../../../../../../../app/milon/today/page.tsx");
}

function sectionSourcePath(): string {
  return path.resolve(__dirname, "../../../../../../../components/milon/WorkoutDetailSection.tsx");
}

describe("matriz do bloqueio — fonte (trava anti-bug: bloquear com qualquer execução)", () => {
  function pageSource(): string {
    return fs.readFileSync(pageSourcePath(), "utf8");
  }

  it("a manutenção carrega via findOpenExecutionByWorkoutStandalone (SÓ aberta, finished_at nulo)", () => {
    expect(pageSource()).toMatch(/findOpenExecutionByWorkoutStandalone/);
  });

  it("a manutenção deriva executionBlocked de execução aberta (execution !== null), sem consultar tabela direto", () => {
    expect(pageSource()).toMatch(/executionBlocked/);
    // Bug suspeito: consultar workout_executions direto (sem filtro de fim)
    // bloquearia inclusive com encerrada. A página nunca toca na tabela.
    expect(pageSource()).not.toMatch(/from\s*\(\s*["']workout_executions["']/);
    expect(pageSource().split("finished_at").length - 1).toBe(0);
  });

  it("Treino do Dia (today) usa executionEnabled e NUNCA executionBlocked (edições só pelo Treino do Dia com ativa)", () => {
    const src = fs.readFileSync(todaySourcePath(), "utf8");
    expect(src).toMatch(/executionEnabled/);
    expect(src).not.toMatch(/executionBlocked/);
  });

  it("seção desabilita o chrome só quando executionBlocked=true (readOnly efetivo = readOnly || executionBlocked)", () => {
    const src = fs.readFileSync(sectionSourcePath(), "utf8");
    expect(src).toMatch(/executionBlocked/);
    expect(src).toMatch(/readOnly \|\| executionBlocked|readOnly\?\? false\) \|\| executionBlocked/);
  });

  it("badge 'Em execução' da seção não é usado como bloqueio (bloqueio é só executionBlocked da manutenção)", () => {
    // A seção exibe o badge quando há execução no Treino do Dia, mas o
    // bloqueio do template na manutenção vem da prop executionBlocked.
    const src = fs.readFileSync(sectionSourcePath(), "utf8");
    expect(src).toMatch(/Em execução/);
    expect(src).toMatch(/executionBlocked/);
  });
});
