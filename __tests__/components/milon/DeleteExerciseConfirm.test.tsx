import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DeleteExerciseConfirm, {
  type DeleteExerciseConfirmProps,
} from "@/components/milon/DeleteExerciseConfirm";

function defaultProps(
  overrides: Partial<DeleteExerciseConfirmProps> = {},
): DeleteExerciseConfirmProps {
  return {
    open: true,
    exerciseName: "Supino reto",
    muscle: "Peito",
    deleting: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("DeleteExerciseConfirm", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(
      <DeleteExerciseConfirm {...defaultProps({ open: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("informa nome e músculo do exercício alvo antes de apagar", () => {
    render(<DeleteExerciseConfirm {...defaultProps()} />);

    expect(
      screen.getByRole("heading", { name: /excluir exercício/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Supino reto")).toBeInTheDocument();
    expect(screen.getByText("Peito")).toBeInTheDocument();
  });

  it("usa título com token font-display", () => {
    render(<DeleteExerciseConfirm {...defaultProps()} />);

    const heading = screen.getByRole("heading", { name: /excluir exercício/i });
    expect(heading.className).toMatch(/font-display/);
  });

  it("confirmar executa a exclusão", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <DeleteExerciseConfirm
        {...defaultProps({ onConfirm, onCancel })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /confirmar exclusão/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancelar preserva a lista intacta (não confirma)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <DeleteExerciseConfirm
        {...defaultProps({ onConfirm, onCancel })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("botão de confirmação desabilita durante a exclusão", () => {
    render(<DeleteExerciseConfirm {...defaultProps({ deleting: true })} />);

    const confirmButton = screen.getByRole("button", {
      name: /excluindo/i,
    });
    expect(confirmButton).toBeDisabled();
  });
});
