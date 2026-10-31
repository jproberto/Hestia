import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WorkoutModal from "@/components/milon/WorkoutModal";
import { normalizarNomeTreino } from "@/lib/milon/workout-utils";

/**
 * Contrato (plan.md §3 "WorkoutModal (props)" + tasks.json TASK-011 +
 * spec §3 "Detalhe do Programa — lista de treinos" / D11):
 * - props: open, mode ('criar' | 'renomear'), defaultName (sugestão
 *   pré-calculada pela página na criação; nome atual na renomeação),
 *   otherNames (nomes dos demais treinos do Programa), saving, errorMsg,
 *   onClose, onSave(name: string): Promise<void>.
 * - defaultName pré-preenchido no campo de nome.
 * - Submit vazio ou só espaços → MSG exata "Informe o nome do treino." e o
 *   formulário permanece aberto (nada salvo, nada fechado).
 * - Submit colidindo com otherNames por comparação normalizada (caixa e
 *   espaços extras não contam — D11) → MSG exata
 *   "Já existe um treino com esse nome neste programa."
 * - Falha de gravação (onSave rejeita — erro relançado pelo hook) nunca fecha
 *   o modal, preserva o digitado e a mensagem fica visível via prop errorMsg
 *   (padão ProgramModal/ExerciseModal: o pai propaga, o form não fecha).
 * - saving desabilita os botões; cancelar fecha sem chamar onSave.
 * - Mensagens escritas caractere a caractere conforme plan.md §3.
 * - Tipo de props espelhado localmente: o contrato não exige export de tipo
 *   (mesmo precedente de ProgramModal/ExerciseModal).
 */

interface WorkoutModalProps {
  open: boolean;
  mode: "criar" | "renomear";
  defaultName: string;
  otherNames: string[];
  saving: boolean;
  errorMsg: string | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

const MSG_OBRIGATORIO = "Informe o nome do treino.";
const MSG_DUPLICADO = "Já existe um treino com esse nome neste programa.";

function defaultProps(overrides: Partial<WorkoutModalProps> = {}): WorkoutModalProps {
  return {
    open: true,
    mode: "criar",
    defaultName: "Treino A",
    otherNames: [],
    saving: false,
    errorMsg: null,
    onClose: vi.fn(),
    onSave: vi.fn(async (_name: string) => {}),
    ...overrides,
  };
}

function fillName(value: string) {
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /^salvar/i }));
}

describe("WorkoutModal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(<WorkoutModal {...defaultProps({ open: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("criação pré-preenche o campo com defaultName (sugestão da página)", () => {
    render(<WorkoutModal {...defaultProps({ mode: "criar", defaultName: "Treino A" })} />);

    expect(screen.getByLabelText(/nome/i)).toHaveValue("Treino A");
  });

  it("renomeação pré-preenche o campo com defaultName (nome atual do treino)", () => {
    render(
      <WorkoutModal {...defaultProps({ mode: "renomear", defaultName: "Push" })} />,
    );

    expect(screen.getByLabelText(/nome/i)).toHaveValue("Push");
  });

  it("nome vazio bloqueia com 'Informe o nome do treino.' sem salvar nem fechar", async () => {
    const onSave = vi.fn(async (_name: string) => {});
    const onClose = vi.fn();
    render(<WorkoutModal {...defaultProps({ onSave, onClose })} />);

    fillName("");
    submit();

    expect(await screen.findByText(MSG_OBRIGATORIO)).toBeInTheDocument();
    expect(MSG_OBRIGATORIO).toBe("Informe o nome do treino.");
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });

  it("nome só com espaços em branco também bloqueia com a mesma mensagem", async () => {
    const onSave = vi.fn(async (_name: string) => {});
    const onClose = vi.fn();
    render(<WorkoutModal {...defaultProps({ onSave, onClose })} />);

    fillName("     ");
    submit();

    expect(await screen.findByText(MSG_OBRIGATORIO)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/nome/i)).toHaveValue("     ");
  });

  it("nome já existente no Programa bloqueia com 'Já existe um treino com esse nome neste programa.'", async () => {
    const onSave = vi.fn(async (_name: string) => {});
    const onClose = vi.fn();
    render(
      <WorkoutModal {...defaultProps({ onSave, onClose, otherNames: ["Push"] })} />,
    );

    fillName("Push");
    submit();

    expect(await screen.findByText(MSG_DUPLICADO)).toBeInTheDocument();
    expect(MSG_DUPLICADO).toBe("Já existe um treino com esse nome neste programa.");
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });

  it("colisão só por caixa/espaços extras também bloqueia (comparação normalizada — D11)", async () => {
    const onSave = vi.fn(async (_name: string) => {});
    const onClose = vi.fn();
    render(
      <WorkoutModal
        {...defaultProps({ onSave, onClose, otherNames: ["Push Day"] })}
      />,
    );

    fillName("  push   day  ");
    submit();

    expect(await screen.findByText(MSG_DUPLICADO)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    // Digitado preservado enquanto o formulário permanece aberto.
    expect(screen.getByLabelText(/nome/i)).toHaveValue("  push   day  ");
  });

  it("nome válido e único chama onSave com o nome digitado (normalizado)", async () => {
    const onSave = vi.fn(async (_name: string) => {});
    render(<WorkoutModal {...defaultProps({ onSave, otherNames: ["Push"] })} />);

    fillName("  Treino A  ");
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(normalizarNomeTreino(onSave.mock.calls[0][0])).toBe("Treino A");
  });

  it("falha de gravação nunca fecha o modal e preserva o digitado; erro via prop fica visível", async () => {
    const onSave = vi.fn(async (_name: string) => {
      throw new Error("Erro ao salvar treino");
    });
    const onClose = vi.fn();
    const { rerender } = render(<WorkoutModal {...defaultProps({ onSave, onClose })} />);

    fillName("Treino B");
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/nome/i)).toHaveValue("Treino B");

    rerender(
      <WorkoutModal
        {...defaultProps({
          onSave,
          onClose,
          errorMsg: "Não foi possível salvar o treino.",
        })}
      />,
    );
    expect(
      screen.getByText(/não foi possível salvar o treino/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toHaveValue("Treino B");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("saving desabilita os botões do modal", () => {
    render(<WorkoutModal {...defaultProps({ saving: true })} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    buttons.forEach((button) => expect(button).toBeDisabled());
  });

  it("cancelar fecha o modal sem chamar onSave", () => {
    const onSave = vi.fn(async (_name: string) => {});
    const onClose = vi.fn();
    render(<WorkoutModal {...defaultProps({ onSave, onClose })} />);

    fillName("Outro nome");
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
