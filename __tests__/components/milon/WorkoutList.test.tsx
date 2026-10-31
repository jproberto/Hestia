import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WorkoutList from "@/components/milon/WorkoutList";
import { MSG_TREINO_COM_EXERCICIOS } from "@/lib/milon/workout-utils";
import type { ProgramErrorOrigin, Workout } from "@/lib/milon/types";

/**
 * Contrato (plan.md §3 "WorkoutList (props)" — linhas do contrato textual — +
 * tasks.json TASK-011 + spec §3 "Detalhe do Programa — lista de treinos"):
 * - props: items, subtitles (Record<workoutId, string>), programId, loading,
 *   error, errorOrigin, empty, readOnly, onRename, onDelete, onRetry.
 * - `section` com `h2` "Treinos" usando o token `font-display`.
 * - Cada item é `li` com `h3` `font-display` contendo `Link` para
 *   `/milon/programs/{programId}/workouts/{workoutId}` (abrir treino no nome).
 * - A lista renderiza NA ORDEM RECEBIDA (ordem de criação) — D13 proíbe
 *   reordenação manual de treinos (nenhuma ação de reordenar).
 * - Subtítulo (D15) exibido sob o nome quando não vazio; vazio/ausente não
 *   renderiza texto extra.
 * - Estados via `AsyncState` centralizado (norma D27 — proibido reimplementar):
 *   loadingText "Carregando treinos…", emptyTitle "Nenhum treino ainda." com
 *   emptyText orientando a adicionar o primeiro.
 * - Origem da mensagem (D27/R31): "Tentar novamente" SOMENTE quando
 *   errorOrigin "carga" (nulo também vale carga dentro do AsyncState);
 *   "bloqueio"/"operacao" mostram só a mensagem.
 * - readOnly (Programa inativo, regra da #2) oculta "Renomear"/"Excluir".
 * - O teste só depende do default export (tipo de props espelhado localmente,
 *   mesmo precedente de ProgramList/ExerciseList).
 */

interface WorkoutListProps {
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
}

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

function defaultProps(overrides: Partial<WorkoutListProps> = {}): WorkoutListProps {
  return {
    items: [makeWorkout()],
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

/** Item da lista precisa morar num `li` (padrão ProgramList/ExerciseList). */
function itemOf(name: string): HTMLElement {
  const node = screen.getByText(name).closest("li, [role='listitem']");
  if (!node) {
    throw new Error(
      `Item "${name}" não está dentro de um elemento de lista (li ou role=listitem)`,
    );
  }
  return node as HTMLElement;
}

/** Texto do item normalizado — usado para detectar "texto extra" (subtítulo). */
function textoNormalizado(item: HTMLElement): string {
  return (item.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("WorkoutList", () => {
  describe("título da seção e itens (ordem de criação + link)", () => {
    it("renderiza h2 'Treinos' com o token font-display", () => {
      render(<WorkoutList {...defaultProps()} />);

      const heading = screen.getByRole("heading", { level: 2, name: "Treinos" });
      expect(heading.className).toMatch(/font-display/);
    });

    it("itens aparecem na ordem recebida (ordem de criação), cada nome como link com href exato do treino", () => {
      const treinos = [
        makeWorkout({ id: "wout-a", name: "Treino A" }),
        makeWorkout({ id: "wout-b", name: "Treino B" }),
        makeWorkout({ id: "wout-push", name: "Push" }),
      ];
      render(<WorkoutList {...defaultProps({ items: treinos })} />);

      // Exatamente 1 link por treino, na ordem dos items recebidos.
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(treinos.length);
      expect(links.map((link) => link.textContent?.trim())).toEqual([
        "Treino A",
        "Treino B",
        "Push",
      ]);
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        `/milon/programs/${PROGRAM_ID}/workouts/wout-a`,
        `/milon/programs/${PROGRAM_ID}/workouts/wout-b`,
        `/milon/programs/${PROGRAM_ID}/workouts/wout-push`,
      ]);
    });

    it("nome do treino é h3 font-display com o link para o detalhe por dentro", () => {
      const treino = makeWorkout({ id: "wout-a", name: "Treino A" });
      render(<WorkoutList {...defaultProps({ items: [treino] })} />);

      const h3 = screen.getByRole("heading", { level: 3, name: "Treino A" });
      expect(h3.tagName).toBe("H3");
      expect(h3.className).toMatch(/font-display/);
      expect(
        within(h3).getByRole("link", { name: "Treino A" }),
      ).toHaveAttribute("href", `/milon/programs/${PROGRAM_ID}/workouts/wout-a`);
    });
  });

  describe("subtítulo derivado (D15)", () => {
    it("exibe o subtítulo não vazio sob o treino e não renderiza texto extra quando vazio/ausente", () => {
      const comSubtitulo = makeWorkout({ id: "wout-a", name: "Treino A" });
      const subtituloVazio = makeWorkout({ id: "wout-b", name: "Treino B" });
      const semChave = makeWorkout({ id: "wout-c", name: "Push" });
      render(
        <WorkoutList
          {...defaultProps({
            items: [comSubtitulo, subtituloVazio, semChave],
            subtitles: {
              [comSubtitulo.id]: "Peito, Tríceps e Ombros",
              [subtituloVazio.id]: "",
            },
            readOnly: true,
          })}
        />,
      );

      // Subtítulo não vazio aparece, pertencendo ao item certo.
      expect(
        within(itemOf("Treino A")).getByText("Peito, Tríceps e Ombros"),
      ).toBeInTheDocument();

      // Subtítulo vazio e chave ausente: o item não ganha texto algum além do
      // nome (readOnly esconde os botões, então sobra só o nome).
      expect(textoNormalizado(itemOf("Treino B"))).toBe("Treino B");
      expect(textoNormalizado(itemOf("Push"))).toBe("Push");
    });
  });

  describe("estados loading/empty/erro (AsyncState centralizado)", () => {
    it("loading mostra exatamente 'Carregando treinos…'", () => {
      render(<WorkoutList {...defaultProps({ loading: true, items: [] })} />);

      expect(screen.getByText("Carregando treinos…")).toBeInTheDocument();
    });

    it("empty mostra 'Nenhum treino ainda.' com orientação de adicionar o primeiro, sem retry", () => {
      render(<WorkoutList {...defaultProps({ items: [], empty: true })} />);

      expect(screen.getByText("Nenhum treino ainda.")).toBeInTheDocument();
      expect(screen.getByText(/adicion/i)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /tentar novamente/i }),
      ).not.toBeInTheDocument();
    });

    it("erro com errorOrigin 'carga' exibe a mensagem e 'Tentar novamente' dispara onRetry", () => {
      const onRetry = vi.fn();
      render(
        <WorkoutList
          {...defaultProps({
            items: [],
            error: "Erro ao carregar treinos",
            errorOrigin: "carga",
            onRetry,
          })}
        />,
      );

      expect(screen.getByText("Erro ao carregar treinos")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("erro com errorOrigin 'bloqueio' exibe a mensagem SEM 'Tentar novamente' e a lista permanece visível", () => {
      const onRetry = vi.fn();
      const treino = makeWorkout({ id: "wout-a", name: "Treino A" });
      render(
        <WorkoutList
          {...defaultProps({
            items: [treino],
            error: MSG_TREINO_COM_EXERCICIOS,
            errorOrigin: "bloqueio",
            onRetry,
          })}
        />,
      );

      expect(screen.getByText(MSG_TREINO_COM_EXERCICIOS)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /tentar novamente/i }),
      ).not.toBeInTheDocument();
      expect(onRetry).not.toHaveBeenCalled();
      // D6: o bloqueio é comunicado sem esconder a lista (nada é removido).
      expect(screen.getByText("Treino A")).toBeInTheDocument();
    });
  });

  describe("ações: readOnly, callbacks e ausência de reordenação (D13)", () => {
    it("readOnly (Programa inativo) oculta Renomear/Excluir mas mantém os treinos visíveis", () => {
      render(
        <WorkoutList
          {...defaultProps({ items: [makeWorkout({ name: "Treino A" })], readOnly: true })}
        />,
      );

      expect(screen.getByText("Treino A")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /renomear/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /excluir/i }),
      ).not.toBeInTheDocument();
    });

    it("onRename/onDelete disparam com o treino do item clicado (2 ações por item)", () => {
      const primeiro = makeWorkout({ id: "wout-a", name: "Treino A" });
      const segundo = makeWorkout({ id: "wout-b", name: "Treino B" });
      const onRename = vi.fn();
      const onDelete = vi.fn();
      render(
        <WorkoutList
          {...defaultProps({ items: [primeiro, segundo], onRename, onDelete })}
        />,
      );

      const itemPrimeiro = itemOf("Treino A");
      fireEvent.click(within(itemPrimeiro).getByRole("button", { name: /renomear/i }));
      expect(onRename).toHaveBeenCalledWith(primeiro);

      const itemSegundo = itemOf("Treino B");
      fireEvent.click(within(itemSegundo).getByRole("button", { name: /excluir/i }));
      expect(onDelete).toHaveBeenCalledWith(segundo);

      expect(onRename).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
      // Exatamente Renomear + Excluir por item — nenhum controle extra.
      expect(within(itemPrimeiro).getAllByRole("button")).toHaveLength(2);
      expect(within(itemSegundo).getAllByRole("button")).toHaveLength(2);
    });

    it("nenhuma ação de reordenar treinos existe na lista (D13)", () => {
      render(
        <WorkoutList
          {...defaultProps({
            items: [
              makeWorkout({ id: "wout-a", name: "Treino A" }),
              makeWorkout({ id: "wout-b", name: "Treino B" }),
            ],
          })}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /reordenar/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /ordenar/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /mover/i }),
      ).not.toBeInTheDocument();
    });
  });
});
