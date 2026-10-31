import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WorkoutList from "@/components/milon/WorkoutList";
import type { ProgramErrorOrigin, Workout } from "@/lib/milon/types";

/**
 * Contrato RED — TASK-005 (Mílon 07b, D2 + D7; plan.md §3 "Props de WorkoutList").
 *
 * - Nova prop opcional `onReorder(orderedIds: string[])`; ausente, a lista
 *   comporta-se exatamente como hoje.
 * - Alças de arrastar marcadas com `data-drag-handle`, gesto por Pointer Events
 *   nativos com reposicionamento otimista no DOM, fantasma com opacidade
 *   reduzida e indicador de posição de soltura — protocolo de WorkoutEntriesList.
 * - Alças ocultas quando `readOnly` é verdadeiro (programa inativo).
 * - Renomear/Excluir preservados com `onReorder` conectado.
 *
 * ANTI-ALUCINAÇÃO (tsc): `WorkoutList` ainda NÃO declara `onReorder` na
 * produção. O cast abaixo (`ListWithReorder`) é o único ponto que conhece a
 * prop futura — mantém `tsc --noEmit` verde e trava o contrato em RUNTIME.
 * Expected: FAIL — 0 alças `data-drag-handle`, `onReorder` nunca entregue.
 * Hefesto fará GREEN na TASK-006.
 */

interface WorkoutListPropsWithReorder {
  items: Workout[];
  subtitles: Record<string, string>;
  programId: string;
  loading: boolean;
  error: string | null;
  errorOrigin: ProgramErrorOrigin | null;
  empty: boolean;
  readOnly: boolean;
  onRename: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
  onRetry: () => void;
  onReorder?: (orderedIds: string[]) => void;
}

const ListWithReorder =
  WorkoutList as unknown as React.ComponentType<WorkoutListPropsWithReorder>;

const PROGRAM_ID = "prog-001";

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: "wout-001",
    programId: PROGRAM_ID,
    name: "Treino A",
    createdAt: "2026-10-01T00:00:00Z",
    created_by: "ana@hestia.lan",
    ...overrides,
  };
}

function base(
  overrides: Partial<WorkoutListPropsWithReorder> = {},
): WorkoutListPropsWithReorder {
  return {
    items: [
      makeWorkout({ id: "wout-a", name: "Treino A" }),
      makeWorkout({ id: "wout-b", name: "Treino B" }),
      makeWorkout({ id: "wout-c", name: "Treino C" }),
    ],
    subtitles: {},
    programId: PROGRAM_ID,
    loading: false,
    error: null,
    errorOrigin: null,
    empty: false,
    readOnly: false,
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
}

/** Item da lista que contém o nome do treino (mesmo padrão de WorkoutList.test). */
function itemOf(name: string): HTMLElement {
  const node = screen.getByText(name).closest("li");
  if (!node) throw new Error(`Item "${name}" não está dentro de um li`);
  return node as HTMLElement;
}

/** Ids dos treinos na ordem em que os nomes estão no DOM (pós-otimismo). */
const ID_POR_NOME: Record<string, string> = {
  "Treino A": "wout-a",
  "Treino B": "wout-b",
  "Treino C": "wout-c",
};

function idsNaOrdemDoDOM(): string[] {
  const nomes = Object.keys(ID_POR_NOME);
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((h) => (h.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter((texto) => nomes.includes(texto))
    .map((texto) => ID_POR_NOME[texto]);
}

describe("WorkoutList — reordenação por arrastar (07b D2/D7 — RED)", () => {
  it("expõe uma alça data-drag-handle por treino quando onReorder está conectado", () => {
    const { container } = render(
      <ListWithReorder {...base({ onReorder: vi.fn() })} />,
    );

    const alcas = container.querySelectorAll("[data-drag-handle]");
    expect(alcas).toHaveLength(3);
  });

  it("alças têm nome acessível de arrastar/reordenar (mesma pista dos exercícios)", () => {
    const { container } = render(
      <ListWithReorder {...base({ onReorder: vi.fn() })} />,
    );

    const alcas = Array.from(
      container.querySelectorAll<HTMLElement>("[data-drag-handle]"),
    );
    expect(alcas.length).toBeGreaterThan(0);
    alcas.forEach((alca) => {
      const rotulo = `${alca.getAttribute("aria-label") ?? ""} ${alca.getAttribute("title") ?? ""}`;
      expect(rotulo).toMatch(/arrastar|reordenar/i);
    });
  });

  it("soltar o arrasto entrega orderedIds ao onReorder na ordem do DOM", () => {
    const onReorder = vi.fn();
    const { container } = render(
      <ListWithReorder {...base({ onReorder })} />,
    );

    // Geometria determinística em jsdom (sem layout): cada li ocupa uma
    // faixa de 100px na ordem do DOM — mesmo truque do teste de
    // WorkoutEntriesList para o protocolo Pointer Events.
    const originalRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const itens = Array.from(container.querySelectorAll("li"));
      const indice = itens.findIndex(
        (li) => li === this || li.contains(this),
      );
      const top = indice < 0 ? 0 : indice * 100;
      return {
        x: 0,
        y: top,
        top,
        bottom: top + 100,
        left: 0,
        right: 320,
        width: 320,
        height: 100,
        toJSON: () => ({}),
      } as DOMRect;
    };

    try {
      const alca = container.querySelector("[data-drag-handle]") as Element;
      expect(alca).not.toBeNull();

      fireEvent(
        alca,
        new MouseEvent("pointerdown", { bubbles: true, clientX: 20, clientY: 30 }),
      );
      fireEvent(
        alca,
        new MouseEvent("pointermove", { bubbles: true, clientX: 20, clientY: 260 }),
      );
      fireEvent(
        alca,
        new MouseEvent("pointerup", { bubbles: true, clientX: 20, clientY: 260 }),
      );

      expect(onReorder).toHaveBeenCalledTimes(1);
      // orderedIds reflete a ordem otimista do DOM e contém todos os treinos.
      expect(onReorder).toHaveBeenCalledWith(idsNaOrdemDoDOM());
      expect(new Set(onReorder.mock.calls[0][0] as string[])).toEqual(
        new Set(["wout-a", "wout-b", "wout-c"]),
      );
    } finally {
      Element.prototype.getBoundingClientRect = originalRect;
    }
  });

  it("readOnly oculta TODAS as alças mesmo com onReorder conectado (programa inativo)", () => {
    const { container } = render(
      <ListWithReorder {...base({ onReorder: vi.fn(), readOnly: true })} />,
    );

    expect(container.querySelectorAll("[data-drag-handle]")).toHaveLength(0);
    // Treinos seguem visíveis em somente-leitura.
    expect(screen.getByText("Treino A")).toBeInTheDocument();
  });

  it("preserva Renomear/Excluir por item com onReorder conectado", () => {
    const primeiro = makeWorkout({ id: "wout-a", name: "Treino A" });
    const segundo = makeWorkout({ id: "wout-b", name: "Treino B" });
    const onRename = vi.fn();
    const onDelete = vi.fn();
    render(
      <ListWithReorder
        {...base({
          items: [primeiro, segundo],
          onRename,
          onDelete,
          onReorder: vi.fn(),
        })}
      />,
    );

    fireEvent.click(
      within(itemOf("Treino A")).getByRole("button", { name: /renomear/i }),
    );
    expect(onRename).toHaveBeenCalledWith(primeiro);

    fireEvent.click(
      within(itemOf("Treino B")).getByRole("button", { name: /excluir/i }),
    );
    expect(onDelete).toHaveBeenCalledWith(segundo);
  });
});
