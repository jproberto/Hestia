import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ProgramModal from "@/components/milon/ProgramModal";
import { validarTitulo } from "@/lib/milon/program-utils";
import type { Program } from "@/lib/milon/types";

// Contrato de props do ProgramModal (plan.md §3 + tasks.json TASK-008):
// open, program (null = criação), suggestion, saving, errorMsg, successMsg,
// onClose e onSave(title). Tipado localmente no teste para não exigir um
// export nomeado de tipo que o contrato não especifica.
interface ProgramModalProps {
  open: boolean;
  program: Program | null;
  suggestion: string;
  saving: boolean;
  errorMsg: string | null;
  successMsg: string | null;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
}

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "prog-1",
    title: "Programa Empurrão de Peito",
    owner: "a@hestia.com",
    status: "rascunho",
    createdAt: "2026-09-29T00:00:00Z",
    created_by: "a@hestia.com",
    ...overrides,
  };
}

function defaultProps(overrides: Partial<ProgramModalProps> = {}): ProgramModalProps {
  return {
    open: true,
    program: null,
    suggestion: "Treino Monstro da Semana",
    saving: false,
    errorMsg: null,
    successMsg: null,
    onClose: vi.fn(),
    onSave: vi.fn(async (_title: string) => {}),
    ...overrides,
  };
}

function fillTitle(value: string) {
  fireEvent.change(screen.getByLabelText(/título/i), { target: { value } });
}

describe("ProgramModal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(<ProgramModal {...defaultProps({ open: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("criação pré-preenche o título com a sugestão", () => {
    render(<ProgramModal {...defaultProps()} />);

    expect(screen.getByLabelText(/título/i)).toHaveValue("Treino Monstro da Semana");
  });

  it("edição usa o título do programa e ignora a sugestão", () => {
    render(
      <ProgramModal
        {...defaultProps({ program: makeProgram(), suggestion: "Sugestão Ignorada" })}
      />,
    );

    expect(screen.getByLabelText(/título/i)).toHaveValue("Programa Empurrão de Peito");
  });

  it("título vazio bloqueia o submit com erro visível (validarTitulo) e não fecha o modal", async () => {
    const onSave = vi.fn(async (_title: string) => {});
    const onClose = vi.fn();
    render(<ProgramModal {...defaultProps({ onSave, onClose })} />);

    fillTitle("");
    fireEvent.click(screen.getByRole("button", { name: /^salvar/i }));

    const validationMessage = validarTitulo("");
    expect(validationMessage).not.toBeNull();
    expect(await screen.findByText(validationMessage as string)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
  });

  it("título só com espaços em branco também é bloqueado com erro visível", async () => {
    const onSave = vi.fn(async (_title: string) => {});
    const onClose = vi.fn();
    render(<ProgramModal {...defaultProps({ onSave, onClose })} />);

    fillTitle("    ");
    fireEvent.click(screen.getByRole("button", { name: /^salvar/i }));

    const validationMessage = validarTitulo("    ");
    expect(validationMessage).not.toBeNull();
    expect(await screen.findByText(validationMessage as string)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("erro de gravação mantém o modal aberto com erro visível e o digitado preservado", () => {
    const onClose = vi.fn();
    const { rerender } = render(<ProgramModal {...defaultProps({ onClose })} />);

    fillTitle("Título digitado à mão");

    rerender(
      <ProgramModal
        {...defaultProps({
          onClose,
          errorMsg: "Não foi possível salvar o programa.",
        })}
      />,
    );

    expect(screen.getByText(/não foi possível salvar o programa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/título/i)).toHaveValue("Título digitado à mão");
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("exibe a mensagem de sucesso recebida por prop", () => {
    render(<ProgramModal {...defaultProps({ successMsg: "Programa salvo com sucesso." })} />);

    expect(screen.getByText(/programa salvo com sucesso/i)).toBeInTheDocument();
  });

  it("saving desabilita os botões do modal", () => {
    render(<ProgramModal {...defaultProps({ saving: true })} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    buttons.forEach((button) => expect(button).toBeDisabled());
  });

  it("cancelar fecha o modal sem salvar", () => {
    const onSave = vi.fn(async (_title: string) => {});
    const onClose = vi.fn();
    render(<ProgramModal {...defaultProps({ onSave, onClose })} />);

    fillTitle("Outro título qualquer");
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("salvar com título válido chama onSave com o título digitado", async () => {
    const onSave = vi.fn(async (_title: string) => {});
    render(<ProgramModal {...defaultProps({ onSave })} />);

    fillTitle("Treino Monstro");
    fireEvent.click(screen.getByRole("button", { name: /^salvar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith("Treino Monstro");
  });
});
