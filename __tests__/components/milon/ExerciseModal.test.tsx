import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExerciseModal, {
  type ExerciseModalProps,
  type ExerciseModalFields,
} from "@/components/milon/ExerciseModal";
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

function defaultProps(overrides: Partial<ExerciseModalProps> = {}): ExerciseModalProps {
  return {
    open: true,
    editingExercise: null,
    muscleOptions: ["Braço", "Peito", "Perna"],
    saving: false,
    error: null,
    successNotice: null,
    onClose: vi.fn(),
    onSave: vi.fn(async (_fields: ExerciseModalFields, _action: "salvar" | "salvar-e-outro") => {}),
    ...overrides,
  };
}

function fillCreateForm(name = "Agachamento", muscle = "Perna", link = "") {
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/músculo/i), { target: { value: muscle } });
  fireEvent.change(screen.getByLabelText(/link.*vídeo/i), { target: { value: link } });
}

describe("ExerciseModal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(<ExerciseModal {...defaultProps({ open: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("criação usa título de novo com campos vazios; músculo tem lista digitável e nome não tem sugestões", () => {
    render(<ExerciseModal {...defaultProps()} />);

    expect(screen.getByRole("heading", { name: /novo exercício/i })).toBeInTheDocument();

    const muscleInput = screen.getByLabelText(/músculo/i) as HTMLInputElement;
    expect(muscleInput.value).toBe("");
    const listId = muscleInput.getAttribute("list");
    expect(listId).toBeTruthy();
    const datalist = document.getElementById(listId as string);
    expect(datalist).not.toBeNull();
    expect(datalist?.querySelector('option[value="Peito"]')).not.toBeNull();

    const nameInput = screen.getByLabelText(/nome/i) as HTMLInputElement;
    expect(nameInput.value).toBe("");
    expect(nameInput.getAttribute("list")).toBeNull();
  });

  it("edição abre o mesmo modal já preenchido com os dados atuais", () => {
    render(<ExerciseModal {...defaultProps({ editingExercise: makeExercise() })} />);

    expect(screen.getByRole("heading", { name: /editar exercício/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toHaveValue("Supino reto");
    expect(screen.getByLabelText(/músculo/i)).toHaveValue("Peito");
    expect(screen.getByLabelText(/link.*vídeo/i)).toHaveValue("https://video.exemplo/supino");
  });

  it("aceita músculo novo digitado fora das opções e salva com ele", async () => {
    const onSave = vi.fn(async () => {});
    const onClose = vi.fn();
    render(<ExerciseModal {...defaultProps({ onSave, onClose })} />);

    fillCreateForm("Panturrilha em pé", "Panturrilha");
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      { name: "Panturrilha em pé", muscle: "Panturrilha", videoLink: null },
      "salvar",
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("Salvar grava com link, fecha o modal e volta para a lista", async () => {
    const onSave = vi.fn(async () => {});
    const onClose = vi.fn();
    render(<ExerciseModal {...defaultProps({ onSave, onClose })} />);

    fillCreateForm("Rosca direta", "Braço", "https://video.exemplo/rosca");
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      { name: "Rosca direta", muscle: "Braço", videoLink: "https://video.exemplo/rosca" },
      "salvar",
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("Salvar-e-outro mantém aberto com músculo mantido, nome e link limpos e foco no primeiro campo", async () => {
    const onSave = vi.fn(async () => {});
    const onClose = vi.fn();
    render(<ExerciseModal {...defaultProps({ onSave, onClose })} />);

    fillCreateForm("Tríceps testa", "Braço", "https://video.exemplo/triceps");
    fireEvent.click(screen.getByRole("button", { name: /salvar e incluir outro/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      { name: "Tríceps testa", muscle: "Braço", videoLink: "https://video.exemplo/triceps" },
      "salvar-e-outro",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/músculo/i)).toHaveValue("Braço");
    expect(screen.getByLabelText(/nome/i)).toHaveValue("");
    expect(screen.getByLabelText(/link.*vídeo/i)).toHaveValue("");
    expect(screen.getByLabelText(/músculo/i)).toHaveFocus();
  });

  it("exibe o lembrete breve de sucesso via prop sem fechar o modal", () => {
    render(
      <ExerciseModal
        {...defaultProps({ successNotice: "Exercício salvo com sucesso." })}
      />,
    );

    expect(screen.getByText(/exercício salvo com sucesso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });

  it("falha de gravação nunca fecha o modal e preserva o digitado; erro via prop fica visível", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("Exercício já existe nesse músculo.");
    });
    const onClose = vi.fn();
    const { rerender } = render(<ExerciseModal {...defaultProps({ onSave, onClose })} />);

    fillCreateForm("Supino reto", "Peito");
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/nome/i)).toHaveValue("Supino reto");
    expect(screen.getByLabelText(/músculo/i)).toHaveValue("Peito");

    rerender(
      <ExerciseModal
        {...defaultProps({ onSave, onClose, error: "Exercício já existe nesse músculo." })}
      />,
    );
    expect(screen.getByText(/exercício já existe nesse músculo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toHaveValue("Supino reto");
  });

  it("cancelar fecha sem salvar nem alterar nada", () => {
    const onSave = vi.fn(async () => {});
    const onClose = vi.fn();
    render(<ExerciseModal {...defaultProps({ onSave, onClose })} />);

    fillCreateForm("Leg press", "Perna");
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("nome vazio bloqueia com mensagem visível e não salva", async () => {
    const onSave = vi.fn(async () => {});
    render(<ExerciseModal {...defaultProps({ onSave })} />);

    fillCreateForm("", "Peito");
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByText(/informe o nome/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("músculo vazio bloqueia com mensagem visível e não salva", async () => {
    const onSave = vi.fn(async () => {});
    render(<ExerciseModal {...defaultProps({ onSave })} />);

    fillCreateForm("Voador", "");
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByText(/informe o músculo/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("botões ficam desabilitados durante a gravação", () => {
    render(<ExerciseModal {...defaultProps({ saving: true })} />);

    const savingButtons = screen.getAllByRole("button", { name: /salvando/i });
    expect(savingButtons).toHaveLength(2);
    savingButtons.forEach((button) => expect(button).toBeDisabled());
  });
});
