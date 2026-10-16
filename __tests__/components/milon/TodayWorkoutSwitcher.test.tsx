import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodayWorkoutSwitcher } from "@/components/milon/TodayWorkoutSwitcher";
import type { Workout } from "@/lib/milon/types";

/**
 * Contrato RED — Mílon #4 Treino do Dia (TASK-003):
 * `components/milon/TodayWorkoutSwitcher.tsx`.
 *
 * Fonte da verdade: `.agents/modules/milon/04-treino-do-dia/spec.md` §3
 * ("A troca de treino exibido fica restrita aos treinos do programa ativo
 * do dono logado") + `plan.md` §2 (tabela Create: TodayWorkoutSwitcher —
 * presentacional por props, renderizado só com 2+ treinos por decisão da
 * página) + §3 (contrato textual TodayWorkoutSwitcherProps) + `tasks.json`
 * TASK-003 (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/components/milon/TodayWorkoutSwitcher` ainda não existe —
 * Expected: FAIL com "módulo não encontrado" (nenhum arquivo de
 * produção alterado). Hefesto fará GREEN com o contrato do plano.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — TodayWorkoutSwitcherProps):
 * - props: `workouts` (somente treinos do programa ativo, já ordenados),
 *   `selectedWorkoutId`, `onSelect(workoutId)`;
 * - acessibilidade: `select` rotulado ("Treino") com `aria-label` em
 *   português; sem estado interno (controlado pela página);
 * - filtragem por programa ativo e ordenação vivem no hook/página, não no
 *   seletor (plan.md D5) — aqui trava-se que o seletor renderiza
 *   exatamente a lista recebida, na ordem recebida.
 */

const DONO = "ana@hestia.lan";

function makeWorkout(overrides: Partial<Workout> & { id: string }): Workout {
  return {
    programId: "prog-1",
    name: "Treino A",
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: DONO,
    ...overrides,
  };
}

function treinosOrdenados(): Workout[] {
  return [
    makeWorkout({ id: "w-1", name: "Treino A" }),
    makeWorkout({
      id: "w-2",
      name: "Treino B",
      createdAt: "2026-10-01T11:00:00.000Z",
    }),
    makeWorkout({
      id: "w-3",
      name: "Treino C",
      createdAt: "2026-10-01T12:00:00.000Z",
    }),
  ];
}

describe("TodayWorkoutSwitcher (TASK-003 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renderiza as opções na ordem recebida (ordem de criação do hook)", () => {
    render(
      <TodayWorkoutSwitcher
        workouts={treinosOrdenados()}
        selectedWorkoutId="w-1"
        onSelect={() => {}}
      />,
    );

    const select = screen.getByRole("combobox", { name: /treino/i });
    const opcoes = Array.from(select.querySelectorAll("option")).map(
      (option) => option.textContent,
    );
    expect(opcoes).toEqual(["Treino A", "Treino B", "Treino C"]);
  });

  it("marca o treino selecionado (controlado por selectedWorkoutId)", () => {
    render(
      <TodayWorkoutSwitcher
        workouts={treinosOrdenados()}
        selectedWorkoutId="w-2"
        onSelect={() => {}}
      />,
    );

    const select = screen.getByRole("combobox", { name: /treino/i });
    expect(select).toHaveValue("w-2");
  });

  it("chama onSelect com o id ao trocar (clique pós-render)", () => {
    const onSelect = vi.fn();
    render(
      <TodayWorkoutSwitcher
        workouts={treinosOrdenados()}
        selectedWorkoutId="w-1"
        onSelect={onSelect}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /treino/i }), {
      target: { value: "w-2" },
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("w-2");
  });

  it("é controlado: rerender com novo selectedWorkoutId atualiza o valor (sem estado interno)", () => {
    const { rerender } = render(
      <TodayWorkoutSwitcher
        workouts={treinosOrdenados()}
        selectedWorkoutId="w-1"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("combobox", { name: /treino/i })).toHaveValue(
      "w-1",
    );

    rerender(
      <TodayWorkoutSwitcher
        workouts={treinosOrdenados()}
        selectedWorkoutId="w-3"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("combobox", { name: /treino/i })).toHaveValue(
      "w-3",
    );
  });

  it("renderiza exatamente a lista recebida — treinos de outro programa não aparecem", () => {
    const soDoProgramaAtivo = treinosOrdenados().slice(0, 2);
    render(
      <TodayWorkoutSwitcher
        workouts={soDoProgramaAtivo}
        selectedWorkoutId="w-1"
        onSelect={() => {}}
      />,
    );

    const select = screen.getByRole("combobox", { name: /treino/i });
    expect(select.querySelectorAll("option")).toHaveLength(2);
    expect(screen.getByText("Treino A")).toBeInTheDocument();
    expect(screen.getByText("Treino B")).toBeInTheDocument();
    expect(screen.queryByText("Treino C")).not.toBeInTheDocument();
    expect(screen.queryByText("Treino de outro programa")).not.toBeInTheDocument();
  });

  it("expõe select rotulado em português (aria-label Treino)", () => {
    render(
      <TodayWorkoutSwitcher
        workouts={treinosOrdenados()}
        selectedWorkoutId="w-1"
        onSelect={() => {}}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: /treino/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/treino/i)).toHaveLength(4);
    expect(screen.getByText("Treino")).toBeInTheDocument();
  });
});

/**
 * Contrato RED — Mílon 07c Troca execução ativa (TASK-005):
 * marcador da execução ativa no switcher.
 *
 * Fonte: `.agents/modules/milon/07c-troca-execucao-ativa/plan.md` §3
 * (switcher recebe treino ativo opcional e sufixa a opção correspondente
 * com o marcador textual de em execução) + `tasks.json` TASK-005
 * (prop activeWorkoutId inexistente).
 *
 * CONTRATO FIXADO AQUI (nome que a TASK-006 deve implementar):
 * - `TodayWorkoutSwitcherProps` ganha `activeWorkoutId?: string | null`
 *   (default nulo); a opção cujo id coincide recebe o sufixo textual
 *   `" (em execução)"`, mantendo o nome base; as demais seguem sem sufixo.
 *
 * Expected: FAIL nos 2 blocos novos — produção ainda renderiza só o nome.
 * Hefesto fará GREEN na TASK-006 sem mudar estes testes (prop nova via
 * cast para o tsc seguir verde).
 */
describe("TodayWorkoutSwitcher — marcador de execução 07c (TASK-005 — RED)", () => {
  type SwitcherProps = Parameters<typeof TodayWorkoutSwitcher>[0];

  function comAtivo(activeWorkoutId: string | null): SwitcherProps {
    return {
      workouts: treinosOrdenados(),
      selectedWorkoutId: "w-2",
      onSelect: () => {},
      ...( { activeWorkoutId } as unknown as Record<string, unknown> ),
    } as unknown as SwitcherProps;
  }

  function textoDaOpcao(value: string): string {
    const select = screen.getByRole("combobox", { name: /treino/i });
    const option = select.querySelector(`option[value="${value}"]`);
    if (!option) throw new Error(`Opção ${value} não renderizada`);
    return option.textContent ?? "";
  }

  it("sufixa a opção ativa com o marcador textual (leitura segue livre — R3)", () => {
    render(<TodayWorkoutSwitcher {...comAtivo("w-1")} />);

    expect(textoDaOpcao("w-1")).toMatch(/Treino A.*\(em execução\)/);
    expect(textoDaOpcao("w-2")).not.toMatch(/em execução/);
    expect(textoDaOpcao("w-3")).not.toMatch(/em execução/);
  });

  it("o marcador acompanha o treino ativo ao trocar (sem bloquear a seleção)", () => {
    const { rerender } = render(<TodayWorkoutSwitcher {...comAtivo("w-1")} />);
    expect(textoDaOpcao("w-1")).toMatch(/\(em execução\)/);

    rerender(<TodayWorkoutSwitcher {...comAtivo("w-2")} />);
    expect(textoDaOpcao("w-2")).toMatch(/Treino B.*\(em execução\)/);
    expect(textoDaOpcao("w-1")).not.toMatch(/em execução/);
  });
});
