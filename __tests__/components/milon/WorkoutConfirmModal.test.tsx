import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WorkoutConfirmModal from "@/components/milon/WorkoutConfirmModal";

/**
 * Contrato (plan.md §3 "WorkoutConfirmModal (props)" + tasks.json TASK-013 +
 * spec §3 "Remover exercício"/"Séries" — D6):
 * - props: open, variant ('remover-exercicio' | 'reduzir-series'), exerciseName,
 *   seriesCount, currentQuantity, newQuantity, processing, onConfirm, onCancel.
 * - Variante remover-exercicio: título EXATO "Remover exercício?", corpo
 *   listando o exercício e suas N séries (singular "série" quando N = 1,
 *   plural "séries" quando N ≠ 1) e que repetições, tempo, carga e descanso
 *   informados serão perdidos; botões "Cancelar" e "Remover".
 * - Variante reduzir-series: título EXATO "Reduzir séries?", corpo informando a
 *   redução de currentQuantity para newQuantity e que as séries removidas têm
 *   dados preenchidos; botões "Cancelar" e "Reduzir".
 * - Cancelar não chama onConfirm; processing desabilita os botões (sem duplo
 *   clique).
 * - open=false não renderiza nada (mesmo padrão dos demais modais do módulo).
 *
 * Tipo de props declarado localmente: o contrato do plano não exige export de
 * tipo do componente — o teste só depende do default export.
 */

type Variant = "remover-exercicio" | "reduzir-series";

interface WorkoutConfirmModalProps {
  open: boolean;
  variant: Variant;
  exerciseName: string;
  seriesCount: number;
  currentQuantity: number;
  newQuantity: number;
  processing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const EXERCICIO = "Supino reto";
const ROTULOS: Record<Variant, string> = {
  "remover-exercicio": "Remover",
  "reduzir-series": "Reduzir",
};
const TITULOS: Record<Variant, string> = {
  "remover-exercicio": "Remover exercício?",
  "reduzir-series": "Reduzir séries?",
};

function base(overrides: Partial<WorkoutConfirmModalProps> = {}): WorkoutConfirmModalProps {
  return {
    open: true,
    variant: "remover-exercicio",
    exerciseName: EXERCICIO,
    seriesCount: 3,
    currentQuantity: 3,
    newQuantity: 1,
    processing: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

/** Texto visível do modal (só um modal por teste). */
function texto(): string {
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("WorkoutConfirmModal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(<WorkoutConfirmModal {...base({ open: false })} />);

    expect(container).toBeEmptyDOMElement();
  });

  describe("variante remover-exercicio", () => {
    it("título exato 'Remover exercício?' e botões exatos 'Cancelar' e 'Remover'", () => {
      render(<WorkoutConfirmModal {...base({ variant: "remover-exercicio" })} />);

      expect(screen.getByText(TITULOS["remover-exercicio"])).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remover" })).toBeInTheDocument();
    });

    it("lista o exercício e suas N séries no plural quando N ≠ 1", () => {
      render(
        <WorkoutConfirmModal
          {...base({ variant: "remover-exercicio", seriesCount: 3 })}
        />,
      );

      expect(texto()).toContain(EXERCICIO);
      expect(texto()).toMatch(/3 séries/);
      expect(texto()).not.toMatch(/3 série\b/);
    });

    it("usa o singular 'série' quando N = 1", () => {
      render(
        <WorkoutConfirmModal
          {...base({ variant: "remover-exercicio", seriesCount: 1 })}
        />,
      );

      expect(texto()).toMatch(/\b1 série\b/);
      expect(texto()).not.toMatch(/1 séries/);
    });

    it("corpo avisa que repetições, tempo, carga e descanso informados serão perdidos", () => {
      render(<WorkoutConfirmModal {...base({ variant: "remover-exercicio" })} />);

      const corpo = texto();
      expect(corpo).toMatch(/repetições/i);
      expect(corpo).toMatch(/tempo/i);
      expect(corpo).toMatch(/carga/i);
      expect(corpo).toMatch(/descanso/i);
      expect(corpo).toMatch(/perdid|perde/i);
    });
  });

  describe("variante reduzir-series", () => {
    it("título exato 'Reduzir séries?' e botões exatos 'Cancelar' e 'Reduzir'", () => {
      render(<WorkoutConfirmModal {...base({ variant: "reduzir-series" })} />);

      expect(screen.getByText(TITULOS["reduzir-series"])).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reduzir" })).toBeInTheDocument();
    });

    it("informa a redução de currentQuantity para newQuantity e que as séries removidas têm dados preenchidos", () => {
      render(
        <WorkoutConfirmModal
          {...base({ variant: "reduzir-series", currentQuantity: 5, newQuantity: 2 })}
        />,
      );

      const corpo = texto();
      expect(corpo).toContain("5");
      expect(corpo).toContain("2");
      expect(corpo).toMatch(/preenchid/i);
    });
  });

  describe("callbacks onConfirm/onCancel", () => {
    it.each(Object.keys(ROTULOS) as Variant[])(
      "variante '%s': confirmar dispara onConfirm e não onCancel",
      (variant) => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
          <WorkoutConfirmModal
            {...base({ variant, onConfirm, onCancel })}
          />,
        );

        fireEvent.click(screen.getByRole("button", { name: ROTULOS[variant] }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
      },
    );

    it.each(Object.keys(ROTULOS) as Variant[])(
      "variante '%s': cancelar dispara onCancel e não onConfirm",
      (variant) => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
          <WorkoutConfirmModal
            {...base({ variant, onConfirm, onCancel })}
          />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
      },
    );
  });

  describe("estado processing", () => {
    it.each(Object.keys(ROTULOS) as Variant[])(
      "variante '%s': processing desabilita os botões e não confirma",
      (variant) => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
          <WorkoutConfirmModal
            {...base({ variant, processing: true, onConfirm, onCancel })}
          />,
        );

        const botaoConfirmar = screen.getByRole("button", {
          name: new RegExp(ROTULOS[variant], "i"),
        });
        const botaoCancelar = screen.getByRole("button", { name: /cancelar/i });
        expect(botaoConfirmar).toBeDisabled();
        expect(botaoCancelar).toBeDisabled();

        fireEvent.click(botaoConfirmar);
        fireEvent.click(botaoCancelar);
        expect(onConfirm).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
      },
    );

    it("sem processing os botões ficam habilitados", () => {
      render(<WorkoutConfirmModal {...base({ processing: false })} />);

      expect(screen.getByRole("button", { name: "Remover" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
    });
  });

  /**
   * Contrato RED — Mílon #5 Execução série a série (TASK-005):
   * variante nova `limpar-execucao` da confirmação de limpeza.
   *
   * Fonte: spec §3 (pergunta "nenhuma série marcada, deseja limpar essa
   * execução") + plan.md §3 (variante nova limpar-execucao; título "Limpar
   * execução"; texto contendo a pergunta; botão de confirmação "Limpar" e
   * cancelamento "Cancelar"; processing desabilita os botões; falha ao
   * confirmar mostra o erro no banner com origem operacao e mantém a
   * pergunta aberta; cancelar sempre só fecha) + tasks.json TASK-005.
   *
   * CONTRATO FIXADO AQUI: `WorkoutConfirmVariant` ganha
   * `"limpar-execucao"` (sem mudar as props existentes).
   *
   * Expected: FAIL (variante ainda não existe — título/pergunta/botões
   * divergem); Hefesto fará GREEN na TASK-006.
   */
  describe("variante limpar-execucao (Mílon #5 — RED)", () => {
    type LimparVariant = "limpar-execucao";
    function limpar(
      overrides: Partial<WorkoutConfirmModalProps> = {},
    ): WorkoutConfirmModalProps {
      return base({
        variant: "limpar-execucao" as unknown as Variant,
        ...overrides,
      }) as WorkoutConfirmModalProps;
    }
    void (null as unknown as LimparVariant);

    it("título exato 'Limpar execução' e botões exatos 'Cancelar' e 'Limpar'", () => {
      render(
        <WorkoutConfirmModal
          {...(limpar() as unknown as WorkoutConfirmModalProps)}
        />,
      );

      expect(screen.getByText("Limpar execução")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancelar" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Limpar" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Remover" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Reduzir" }),
      ).not.toBeInTheDocument();
    });

    it("texto exato 'Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?' (2ª volta)", () => {
      render(
        <WorkoutConfirmModal
          {...(limpar() as unknown as WorkoutConfirmModalProps)}
        />,
      );

      expect(
        screen.getByText(
          "Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?",
        ),
      ).toBeInTheDocument();
    });

    it("confirmar dispara onConfirm e cancelar dispara onCancel (sem cruzar)", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      render(
        <WorkoutConfirmModal
          {...(limpar({ onConfirm, onCancel }) as unknown as WorkoutConfirmModalProps)}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it("cancelar dispara onCancel e não onConfirm", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      render(
        <WorkoutConfirmModal
          {...(limpar({ onConfirm, onCancel }) as unknown as WorkoutConfirmModalProps)}
        />,
      );

      expect(screen.getByText("Limpar execução")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("processing desabilita Limpar e Cancelar e não confirma", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      render(
        <WorkoutConfirmModal
          {...(limpar({
            processing: true,
            onConfirm,
            onCancel,
          }) as unknown as WorkoutConfirmModalProps)}
        />,
      );

      expect(screen.getByRole("button", { name: "Limpar" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});

/**
 * Contrato RED — Mílon #7 Encerrar treino (TASK-003): quatro variantes novas.
 * Fonte: spec §3 (quatro textos exatos) + plan §3 (variantes, títulos,
 * rótulos, processing-desabilita, dismiss) + spec §5 critérios 2/4/7/8/11.
 * Expected: FAIL — variantes ainda não existem (título/corpo/botões
 * divergem para o ramo reduzir-series). Hefesto fará GREEN na TASK-005.
 * Convenção tsc: variant via cast (o tipo ainda não declara os valores).
 */
describe("Milon 07 TASK-003 RED — variantes de encerrar/cancelar", () => {
  type NovaVariant =
    | "cancelar-execucao"
    | "finalizar-parcial"
    | "finalizar-completa"
    | "finalizar-vazio";

  function nova(
    variant: NovaVariant,
    overrides: Partial<WorkoutConfirmModalProps> = {},
  ) {
    return base({
      variant: variant as unknown as Variant,
      ...overrides,
    }) as unknown as WorkoutConfirmModalProps;
  }

  it("cancelar-execucao: título 'Cancelar execução', corpo exato, botões 'Cancelar' + 'Excluir' (critérios 2–3)", () => {
    render(
      <WorkoutConfirmModal {...nova("cancelar-execucao")} />,
    );

    expect(screen.getByText("Cancelar execução")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tem certeza que deseja cancelar essa execução? Todas as informações serão excluídas.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("finalizar-parcial: título 'Finalizar treino', corpo exato, botões 'Cancelar' + 'Finalizar' (critérios 4–5)", () => {
    render(
      <WorkoutConfirmModal {...nova("finalizar-parcial")} />,
    );

    expect(screen.getByText("Finalizar treino")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ainda existem séries não executadas. Tem certeza que deseja finalizar o treino?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Finalizar" }),
    ).toBeInTheDocument();
  });

  it("finalizar-completa (Caso 4): título 'Finalizar treino', corpo exato, botões 'Cancelar' + 'Finalizar' (critério 7)", () => {
    render(
      <WorkoutConfirmModal {...nova("finalizar-completa")} />,
    );

    expect(screen.getByText("Finalizar treino")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Você executou todas as séries, deseja finalizar o treino?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Finalizar" }),
    ).toBeInTheDocument();
  });

  it("finalizar-vazio: título 'Treino sem séries feitas', corpo exato, confirma 'Cancelar execução' e desiste 'Voltar' (critério 8)", () => {
    render(<WorkoutConfirmModal {...nova("finalizar-vazio")} />);

    expect(screen.getByText("Treino sem séries feitas")).toBeInTheDocument();
    expect(
      screen.getByText(
        "O treino não pode ser finalizado pois nenhuma série foi feita. Em vez disso, deseja cancelar e excluir a execução desse treino?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar execução" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it.each([
    "cancelar-execucao",
    "finalizar-parcial",
    "finalizar-completa",
    "finalizar-vazio",
  ] as NovaVariant[])(
    "variante '%s': processing desabilita os botões e bloqueia callbacks (critério 11)",
    (variant) => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      render(
        <WorkoutConfirmModal
          {...nova(variant, { processing: true, onConfirm, onCancel })}
        />,
      );

      for (const b of screen.getAllByRole("button")) {
        expect(b).toBeDisabled();
      }
      for (const b of screen.getAllByRole("button")) {
        fireEvent.click(b);
      }
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    },
  );

  it("variante nova: open=false não renderiza nada (invariante herdada)", () => {
    const { container } = render(
      <WorkoutConfirmModal {...nova("finalizar-parcial", { open: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
