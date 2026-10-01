import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ProgramConfirmModal from "@/components/milon/ProgramConfirmModal";

/**
 * Contrato (plan.md §3 "ProgramConfirmModal (props)" + TASK-009 acceptanceCriteria):
 * - props: open, action ('ativar' | 'reativar' | 'excluir'), title, owner,
 *   processing, onConfirm, onCancel.
 * - Rótulo do botão de confirmar varia pela action: "Ativar" / "Reativar" / "Excluir".
 * - processing mostra: "Ativando…" / "Reativando…" / "Excluindo…".
 * - Modal informa título e dono do programa alvo (spec §3 "Confirmação em ações").
 * - Espelha o padrão de components/pluto/DeleteConfirmModal.tsx e
 *   components/milon/DeleteExerciseConfirm.tsx (cancelar separado de confirmar,
 *   botão de confirmar desabilitado durante o processamento).
 *
 * Tipo de props declarado localmente: o contrato do plano não exige export de
 * tipo do componente — o teste só depende do default export.
 */
type Action = "ativar" | "reativar" | "excluir";

interface ProgramConfirmModalProps {
  open: boolean;
  action: Action;
  title: string;
  owner: string;
  processing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ROTULOS: Record<Action, string> = {
  ativar: "Ativar",
  reativar: "Reativar",
  excluir: "Excluir",
};

const TEXTOS_PROCESSING: Record<Action, string> = {
  ativar: "Ativando…",
  reativar: "Reativando…",
  excluir: "Excluindo…",
};

const ACOES = Object.keys(ROTULOS) as Action[];

const TITULO = "Ficha Verão 2026";
const DONO = "ana@hestia.lan";

function defaultProps(
  overrides: Partial<ProgramConfirmModalProps> = {},
): ProgramConfirmModalProps {
  return {
    open: true,
    action: "ativar",
    title: TITULO,
    owner: DONO,
    processing: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe("ProgramConfirmModal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(
      <ProgramConfirmModal {...defaultProps({ open: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  describe("rótulo do botão de confirmar por action (criterio 1)", () => {
    it.each(ACOES)("action '%s' confirma com o rótulo correto", (action) => {
      render(<ProgramConfirmModal {...defaultProps({ action })} />);

      expect(
        screen.getByRole("button", { name: ROTULOS[action] }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    });
  });

  describe("estado processing (criterio 2)", () => {
    it.each(ACOES)(
      "action '%s' mostra o texto de processamento, desabilita e não reconfirma",
      (action) => {
        const onConfirm = vi.fn();
        render(
          <ProgramConfirmModal
            {...defaultProps({ action, processing: true, onConfirm })}
          />,
        );

        const botaoConfirmar = screen.getByRole("button", {
          name: TEXTOS_PROCESSING[action],
        });
        expect(botaoConfirmar).toBeDisabled();

        // "sem abrir caminho de duplo clique" (spec §3 — Confirmação em ações)
        fireEvent.click(botaoConfirmar);
        expect(onConfirm).not.toHaveBeenCalled();
      },
    );
  });

  describe("callbacks onConfirm/onCancel (criterio 3)", () => {
    it.each(ACOES)(
      "action '%s': confirmar dispara onConfirm e não onCancel",
      (action) => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
          <ProgramConfirmModal
            {...defaultProps({ action, onConfirm, onCancel })}
          />,
        );

        fireEvent.click(screen.getByRole("button", { name: ROTULOS[action] }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
      },
    );

    it.each(ACOES)(
      "action '%s': cancelar dispara onCancel e não onConfirm",
      (action) => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
          <ProgramConfirmModal
            {...defaultProps({ action, onConfirm, onCancel })}
          />,
        );

        fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
      },
    );
  });

  describe("programa alvo informado (criterio 4)", () => {
    it.each(ACOES)(
      "action '%s': renderiza título e dono do programa alvo",
      (action) => {
        render(<ProgramConfirmModal {...defaultProps({ action })} />);

        expect(screen.getByText(TITULO)).toBeInTheDocument();
        expect(screen.getByText(DONO)).toBeInTheDocument();
      },
    );
  });
});
