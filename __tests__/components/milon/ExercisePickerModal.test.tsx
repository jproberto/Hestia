import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExercisePickerModal from "@/components/milon/ExercisePickerModal";
import { MSG_EXERCICIO_JA_NO_PROGRAMA } from "@/lib/milon/workout-utils";
import type { Exercise } from "@/lib/milon/types";

/**
 * Contrato (plan.md §3 "ExercisePickerModal (props)" + tasks.json TASK-013 +
 * spec §3 "Adicionar exercício" / D14):
 * - props: open, exercises (ativos), loading, error, saving, searchText,
 *   muscleFilter, muscleOptions, onSearch, onFilterMuscle, onSelect,
 *   onCreateNew, onClose.
 * - Busca por nome com `matchesExerciseQuery` (normalizada; consulta < 3
 *   caracteres mostra tudo) e filtro por músculo — ambos CONTROLADOS pelos
 *   props searchText/muscleFilter, com onSearch/onFilterMuscle repassando o
 *   valor digitado/ escolhido.
 * - Linhas tocáveis (nome + músculo) disparam onSelect com o objeto Exercise
 *   exato; rodapé com "Cadastrar novo" dispara onCreateNew.
 * - error (D14 = MSG_EXERCICIO_JA_NO_PROGRAMA, ou falha de operação) fica
 *   visível SEM retry dentro do modal e SEM fechar o modal (norma D27/R31).
 * - loading esconde as linhas; open=false não renderiza nada.
 *
 * Tipo de props declarado localmente: o contrato do plano não exige export de
 * tipo do componente — o teste só depende do default export.
 */

interface ExercisePickerModalProps {
  open: boolean;
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  searchText: string;
  muscleFilter: string;
  muscleOptions: string[];
  onSearch: (text: string) => void;
  onFilterMuscle: (muscle: string) => void;
  onSelect: (exercise: Exercise) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: null,
    loadUnit: "kg",
    deletedAt: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
    ...overrides,
  };
}

const SUPINO = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" });
// "Braço" de propósito fora de muscleOptions: provar que o músculo do exercício
// é exibido na linha (não basta aparecer como opção do filtro).
const ROSCA = makeExercise({ id: "ex-2", name: "Rosca direta", muscle: "Braço" });
const EXERCICIOS: Exercise[] = [SUPINO, ROSCA];

function base(
  overrides: Partial<ExercisePickerModalProps> = {},
): ExercisePickerModalProps {
  return {
    open: true,
    exercises: EXERCICIOS,
    loading: false,
    error: null,
    saving: false,
    searchText: "",
    muscleFilter: "",
    muscleOptions: ["Peito", "Costas"],
    onSearch: vi.fn(),
    onFilterMuscle: vi.fn(),
    onSelect: vi.fn(),
    onCreateNew: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

function texto(): string {
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Campo de busca: type="search" (searchbox) ou type="text" (textbox). */
function campoBusca(): HTMLElement {
  const searchbox = screen.queryByRole("searchbox");
  if (searchbox) return searchbox;
  const textbox = screen.queryByRole("textbox");
  if (textbox) return textbox;
  throw new Error("Campo de busca não encontrado (searchbox/textbox)");
}

function botao(nome: RegExp): HTMLElement {
  const alvo = screen.queryByRole("button", { name: nome });
  if (!alvo) throw new Error(`Botão com rótulo ${nome} não encontrado`);
  return alvo;
}

describe("ExercisePickerModal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(
      <ExercisePickerModal {...base({ open: false })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  describe("linhas tocáveis (seleção)", () => {
    it("renderiza nome e músculo de cada exercício", () => {
      render(<ExercisePickerModal {...base()} />);

      expect(screen.getByText("Supino reto")).toBeInTheDocument();
      expect(screen.getByText("Rosca direta")).toBeInTheDocument();
      // "Braço" não está em muscleOptions — só chega aqui pelo dado do exercício.
      expect(texto()).toContain("Braço");
      expect(texto()).toContain("Peito");
    });

    it("tocar na linha dispara onSelect com o objeto Exercise exato", () => {
      const onSelect = vi.fn();
      render(<ExercisePickerModal {...base({ onSelect })} />);

      fireEvent.click(screen.getByText("Supino reto"));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(SUPINO);

      fireEvent.click(screen.getByText("Rosca direta"));
      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelect).toHaveBeenLastCalledWith(ROSCA);
    });
  });

  describe("busca por nome (controlada por searchText)", () => {
    it("searchText 'sup' mostra só o Supino e esconde a Rosca", () => {
      render(<ExercisePickerModal {...base({ searchText: "sup" })} />);

      expect(screen.getByText("Supino reto")).toBeInTheDocument();
      expect(screen.queryByText("Rosca direta")).not.toBeInTheDocument();
    });

    it("consulta com menos de 3 caracteres normalizada mostra todos", () => {
      render(<ExercisePickerModal {...base({ searchText: "su" })} />);

      expect(screen.getByText("Supino reto")).toBeInTheDocument();
      expect(screen.getByText("Rosca direta")).toBeInTheDocument();
    });

    it("digitar no campo de busca dispara onSearch com o texto", () => {
      const onSearch = vi.fn();
      render(<ExercisePickerModal {...base({ onSearch })} />);

      fireEvent.change(campoBusca(), { target: { value: "rosca" } });
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith("rosca");
    });
  });

  describe("filtro por músculo (controlado por muscleFilter)", () => {
    it("muscleFilter 'Peito' mostra só o exercício do Peito", () => {
      render(<ExercisePickerModal {...base({ muscleFilter: "Peito" })} />);

      expect(screen.getByText("Supino reto")).toBeInTheDocument();
      expect(screen.queryByText("Rosca direta")).not.toBeInTheDocument();
    });

    it("muscleFilter vazio mostra todos", () => {
      render(<ExercisePickerModal {...base({ muscleFilter: "" })} />);

      expect(screen.getByText("Supino reto")).toBeInTheDocument();
      expect(screen.getByText("Rosca direta")).toBeInTheDocument();
    });

    it("trocar o filtro dispara onFilterMuscle com o músculo escolhido", () => {
      const onFilterMuscle = vi.fn();
      render(<ExercisePickerModal {...base({ onFilterMuscle })} />);

      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Costas" },
      });
      expect(onFilterMuscle).toHaveBeenCalledTimes(1);
      expect(onFilterMuscle).toHaveBeenCalledWith("Costas");
    });
  });

  describe("rodapé e fechamento", () => {
    it("'Cadastrar novo' dispara onCreateNew", () => {
      const onCreateNew = vi.fn();
      render(<ExercisePickerModal {...base({ onCreateNew })} />);

      fireEvent.click(botao(/cadastrar novo/i));
      expect(onCreateNew).toHaveBeenCalledTimes(1);
    });

    it("fechar o modal dispara onClose", () => {
      const onClose = vi.fn();
      render(<ExercisePickerModal {...base({ onClose })} />);

      fireEvent.click(botao(/cancelar|fechar/i));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("error (D14 / falha de operação)", () => {
    it("MSG_EXERCICIO_JA_NO_PROGRAMA fica visível, sem retry e sem fechar o modal", () => {
      const onClose = vi.fn();
      render(
        <ExercisePickerModal
          {...base({ error: MSG_EXERCICIO_JA_NO_PROGRAMA, onClose })}
        />,
      );

      expect(screen.getByText(MSG_EXERCICIO_JA_NO_PROGRAMA)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /tentar novamente/i }),
      ).not.toBeInTheDocument();
      // Modal segue aberto: linhas e rodapé continuam na tela.
      expect(screen.getByText("Supino reto")).toBeInTheDocument();
      expect(botao(/cadastrar novo/i)).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("falha de operação também fica visível sem retry e sem fechar", () => {
      render(
        <ExercisePickerModal
          {...base({ error: "Não foi possível adicionar o exercício." })}
        />,
      );

      expect(
        screen.getByText("Não foi possível adicionar o exercício."),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /tentar novamente/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Supino reto")).toBeInTheDocument();
    });
  });

  describe("loading", () => {
    it("enquanto carrega, as linhas de exercício não aparecem", () => {
      render(<ExercisePickerModal {...base({ loading: true })} />);

      expect(screen.queryByText("Supino reto")).not.toBeInTheDocument();
      expect(screen.queryByText("Rosca direta")).not.toBeInTheDocument();
    });
  });
});
