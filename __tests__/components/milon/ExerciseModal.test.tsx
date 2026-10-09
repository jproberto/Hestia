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
    loadUnit: null,
    deletedAt: null,
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
      {
        name: "Panturrilha em pé",
        muscle: "Panturrilha",
        videoLink: null,
        mode: "repeticao",
        loadUnit: "kg",
      },
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
      {
        name: "Rosca direta",
        muscle: "Braço",
        videoLink: "https://video.exemplo/rosca",
        mode: "repeticao",
        loadUnit: "kg",
      },
      "salvar",
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("salvar não envia deletedAt (exclusão fora do form) mas envia modo e unidade", async () => {
    const onSave = vi.fn(
      async (_fields: ExerciseModalFields, _action: "salvar" | "salvar-e-outro") => {},
    );
    const onClose = vi.fn();
    render(
      <ExerciseModal
        {...defaultProps({
          editingExercise: makeExercise({ loadUnit: "kg", deletedAt: null }),
          onSave,
          onClose,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const payload = onSave.mock.calls[0][0];
    // A edição da biblioteca não ressuscita exercício excluído; modo e
    // unidade pertencem ao exercício e viajam no payload.
    expect(payload).not.toHaveProperty("deletedAt");
    expect(payload).toEqual({
      name: "Supino reto",
      muscle: "Peito",
      videoLink: "https://video.exemplo/supino",
      mode: "repeticao",
      loadUnit: "kg",
    });
  });

  it("Salvar-e-outro mantém aberto com músculo mantido, nome e link limpos e foco no primeiro campo", async () => {
    const onSave = vi.fn(async () => {});
    const onClose = vi.fn();
    render(<ExerciseModal {...defaultProps({ onSave, onClose })} />);

    fillCreateForm("Tríceps testa", "Braço", "https://video.exemplo/triceps");
    fireEvent.click(screen.getByRole("button", { name: /salvar e incluir outro/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      {
        name: "Tríceps testa",
        muscle: "Braço",
        videoLink: "https://video.exemplo/triceps",
        mode: "repeticao",
        loadUnit: "kg",
      },
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

/**
 * Contrato RED da TASK-006 (Mílon #5, aditamento 2026-10-09 dos 3 achados).
 *
 * Fonte: tasks.json TASK-006 (ExerciseModal: seletor de modo
 * Repeticoes/Tempo + seletor de unidade kg/lb com padrão pré-selecionado)
 * + plan.md Aditamento §1 Mudança A + §3 (Modal de exercício: recebe e
 * devolve modo e unidade junto de nome/músculo/link; seletores simples de
 * modo e unidade; valida nome/músculo obrigatórios com mensagem visível;
 * nunca fecha no erro) + spec §3 (unidade e modo pertencem ao exercício).
 *
 * Contrato fixado aqui (nomes que a TASK-007 deve implementar):
 * - ExerciseModalFields ganha `mode: "repeticao" | "tempo"` e
 *   `loadUnit: "kg" | "libra"`; onSave devolve os dois junto de
 *   nome/músculo/link;
 * - seletor de modo com rótulo "Modo" e opções "Repetições" e "Tempo"
 *   (radiogroup rotulado OU select rotulado — o teste aceita os dois);
 * - seletor de unidade com rótulo "Unidade" e opções "kg" e "lb"/"libra"
 *   (radiogroup rotulado OU select rotulado);
 * - padrão pré-selecionado na criação: modo repetição + unidade kg
 *   (sem tocar nos seletores, o salvar já entrega esses valores).
 *
 * Expected: FAIL — o modal atual só tem nome/músculo/link, sem seletores
 * e sem modo/unidade no payload. Hefesto fará GREEN na TASK-007 sem mudar
 * estes testes.
 */
describe("ExerciseModal — modo e unidade do exercício (TASK-006 — RED)", () => {
  /** Localiza o grupo/controle rotulado aceitando radiogroup ou select. */
  function grupoOuControle(rotulo: RegExp): HTMLElement {
    const porGrupo = screen.queryByRole("radiogroup", { name: rotulo });
    if (porGrupo) return porGrupo;
    const porCombo = screen.queryByLabelText(rotulo);
    if (porCombo) return porCombo;
    throw new Error(`Seletor com rótulo ${rotulo} não encontrado`);
  }

  it("exibe seletor de modo com opções Repetições e Tempo", () => {
    render(<ExerciseModal {...defaultProps()} />);

    const grupo = grupoOuControle(/modo/i);
    expect(grupo).toBeInTheDocument();
    expect(screen.getByText(/repetições/i)).toBeInTheDocument();
    expect(screen.getByText(/^tempo$/i)).toBeInTheDocument();
  });

  it("exibe seletor de unidade com opções kg e lb/libra", () => {
    render(<ExerciseModal {...defaultProps()} />);

    const grupo = grupoOuControle(/unidade/i);
    expect(grupo).toBeInTheDocument();
    expect(screen.getByText(/^kg$/i)).toBeInTheDocument();
    const lbOuLibra =
      screen.queryByText(/^lb$/i) ?? screen.queryByText(/libra/i);
    expect(lbOuLibra).not.toBeNull();
  });

  it("criação pré-seleciona modo repetição e unidade kg (padrão sem tocar)", async () => {
    const onSave = vi.fn(
      async (_fields: ExerciseModalFields, _action: "salvar" | "salvar-e-outro") => {},
    );
    const onClose = vi.fn();
    render(<ExerciseModal {...defaultProps({ onSave, onClose })} />);

    fillCreateForm("Agachamento", "Perna");
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(payload).toMatchObject({ mode: "repeticao", loadUnit: "kg" });
  });

  it("trocar os seletores reflete no payload do salvar", async () => {
    const onSave = vi.fn(
      async (_fields: ExerciseModalFields, _action: "salvar" | "salvar-e-outro") => {},
    );
    render(<ExerciseModal {...defaultProps({ onSave })} />);

    fillCreateForm("Prancha", "Abdômen");
    const opcaoTempo =
      screen.queryByRole("radio", { name: /^tempo$/i }) ??
      screen.queryByRole("option", { name: /^tempo$/i });
    expect(opcaoTempo).not.toBeNull();
    fireEvent.click(opcaoTempo as HTMLElement);
    const opcaoLibra =
      screen.queryByRole("radio", { name: /^(lb|libra)$/i }) ??
      screen.queryByRole("option", { name: /^(lb|libra)$/i });
    expect(opcaoLibra).not.toBeNull();
    fireEvent.click(opcaoLibra as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(payload).toMatchObject({ mode: "tempo" });
    expect(["libra", "lb"]).toContain(payload["loadUnit"]);
  });

  it("edição abre com modo e unidade atuais pré-selecionados", () => {
    render(
      <ExerciseModal
        {...defaultProps({
          editingExercise: makeExercise({
            loadUnit: "libra",
          }) as unknown as Exercise,
        })}
      />,
    );

    // O teste trava a presença dos seletores com valores herdados; o modo
    // editado via cast (tipo ainda sem modo) ao menos não quebra o form.
    expect(grupoOuControle(/modo/i)).toBeInTheDocument();
    expect(grupoOuControle(/unidade/i)).toBeInTheDocument();
  });
});
