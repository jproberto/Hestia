import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExerciseList from "@/components/milon/ExerciseList";
import type { Exercise } from "@/lib/milon/types";

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: "https://video.exemplo/supino",
    createdAt: "2026-09-12T00:00:00Z",
    created_by: "a@hestia.com",
    ...overrides,
  };
}

function defaultProps(overrides = {}) {
  return {
    visibleItems: [makeExercise()],
    remainingCount: 0,
    muscleOptions: ["Peito", "Perna"],
    muscleFilter: "",
    searchText: "",
    loading: false,
    error: null as string | null,
    isEmpty: false,
    onFilterChange: vi.fn(),
    onSearchChange: vi.fn(),
    onShowMore: vi.fn(),
    onRetry: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

describe("ExerciseList", () => {
  it("renderiza título da seção com itens ordenados, nome, músculo e acesso ao vídeo", () => {
    const items = [
      makeExercise({ id: "2", name: "Rosca direta", muscle: "Braço", videoLink: null }),
      makeExercise({ id: "1", name: "Supino reto", muscle: "Peito" }),
    ];
    render(<ExerciseList {...defaultProps({ visibleItems: items })} />);

    expect(screen.getByRole("heading", { name: /exercícios/i })).toBeInTheDocument();
    expect(screen.getByText("Supino reto")).toBeInTheDocument();
    expect(screen.getAllByText("Peito").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /ver vídeo/i })).toHaveAttribute(
      "href",
      "https://video.exemplo/supino",
    );
  });

  it("não mostra acesso ao vídeo para item sem link", () => {
    const items = [
      makeExercise({ id: "2", name: "Agachamento", muscle: "Perna", videoLink: null }),
    ];
    render(<ExerciseList {...defaultProps({ visibleItems: items })} />);

    expect(screen.getByText("Agachamento")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ver vídeo/i })).not.toBeInTheDocument();
  });

  it("conecta filtro por músculo com opção de limpar e busca livre aos callbacks", () => {
    const onFilterChange = vi.fn();
    const onSearchChange = vi.fn();
    render(
      <ExerciseList
        {...defaultProps({ onFilterChange, onSearchChange, muscleFilter: "Peito" })}
      />,
    );

    const filter = screen.getByLabelText(/filtrar por músculo/i);
    fireEvent.change(filter, { target: { value: "" } });
    expect(onFilterChange).toHaveBeenCalledWith("");

    const search = screen.getByLabelText(/buscar exercício/i);
    fireEvent.change(search, { target: { value: "sup" } });
    expect(onSearchChange).toHaveBeenCalledWith("sup");
  });

  it("mostra ação de mostrar-mais indicando restantes e some ao esgotar", () => {
    const onShowMore = vi.fn();
    const { rerender } = render(
      <ExerciseList {...defaultProps({ remainingCount: 7, onShowMore })} />,
    );

    const moreButton = screen.getByRole("button", { name: /mostrar mais \(7 restantes\)/i });
    fireEvent.click(moreButton);
    expect(onShowMore).toHaveBeenCalledTimes(1);

    rerender(<ExerciseList {...defaultProps({ remainingCount: 0 })} />);
    expect(
      screen.queryByRole("button", { name: /mostrar mais/i }),
    ).not.toBeInTheDocument();
  });

  it("mostra biblioteca vazia com orientação de criar o primeiro, sem erro", () => {
    render(
      <ExerciseList {...defaultProps({ visibleItems: [], isEmpty: true })} />,
    );

    expect(screen.getByText(/nenhum exercício cadastrado/i)).toBeInTheDocument();
    expect(screen.queryByText(/tente novamente/i)).not.toBeInTheDocument();
  });

  it("mostra indicador de carregamento", () => {
    render(<ExerciseList {...defaultProps({ loading: true, visibleItems: [] })} />);

    expect(screen.getByText(/carregando exercícios/i)).toBeInTheDocument();
  });

  it("mostra erro com tentar-de-novo que dispara retry", () => {
    const onRetry = vi.fn();
    render(
      <ExerciseList
        {...defaultProps({ error: "Falha ao buscar", onRetry, visibleItems: [] })}
      />,
    );

    expect(screen.getByText(/falha ao buscar/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("mostra mensagem de sem-resultado distinta da mensagem de vazia", () => {
    render(
      <ExerciseList
        {...defaultProps({ visibleItems: [], isEmpty: false, searchText: "zzz" })}
      />,
    );

    expect(screen.getByText(/nada encontrado/i)).toBeInTheDocument();
    expect(screen.queryByText(/nenhum exercício cadastrado/i)).not.toBeInTheDocument();
  });

  it("dispara editar e excluir por item", () => {
    const item = makeExercise();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ExerciseList {...defaultProps({ visibleItems: [item], onEdit, onDelete })} />);

    fireEvent.click(screen.getByRole("button", { name: /editar supino reto/i }));
    expect(onEdit).toHaveBeenCalledWith(item);

    fireEvent.click(screen.getByRole("button", { name: /excluir supino reto/i }));
    expect(onDelete).toHaveBeenCalledWith(item);
  });
});
