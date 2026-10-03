import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SeriesCard from "@/components/milon/SeriesCard";
import {
  MSG_CARGA_NEGATIVA,
  MSG_CARGA_NAO_NUMERICA,
  formatarCargaComSecundaria,
} from "@/lib/milon/workout-utils";
import type { LoadUnit, WorkoutSeries } from "@/lib/milon/types";

/**
 * Contrato (plan.md §3 "SeriesCard (props)" + tasks.json TASK-013/TASK-022 +
 * spec §3 "Séries do exercício" / D7 / D10 / norma D27):
 * - props: series, index (rótulo "Série 1", "Série 2", …), loadUnit, readOnly,
 *   onCommit(field, value), onApplyAll(), onChooseUnit(unit).
 * - Campos: "Repetições" e "Tempo (s)" em campo único com toggle
 *   (CA-26) + "Carga" (número ≥ 0 ou vazio), com toggle de unidade kg/lb
 *   abaixo da carga (pré-selecionado kg) que dispara onChooseUnit.
 * - Validação local (validarInteiroCampo/validarCarga) com mensagem visível e
 *   SEM commitar: rótulos exatos "repetições" e "tempo";
 *   carga negativa → "A carga não pode ser negativa.";
 *   carga não numérica → "Informe um valor numérico válido para a carga."
 * - D7: vazio ≠ 0 — placeholder "—" quando vazio, "0" exibido como 0.
 * - D10: valor convertido na unidade secundária, MENOR e em CINZA MAIS CLARO,
 *   via formatarCargaComSecundaria (1 casa decimal).
 * - "Aplicar a todas" dispara onApplyAll (re-executável — D2/D5).
 * - readOnly (Programa inativo) oculta campos e ações (TASK-014 AC5).
 */

type SerieField = "reps" | "durationSeconds" | "load";

interface SeriesCardProps {
  series: WorkoutSeries;
  index: number;
  loadUnit: LoadUnit | null;
  readOnly: boolean;
  onCommit: (field: SerieField, value: number | null) => void;
  onApplyAll: () => void;
  onChooseUnit: (unit: LoadUnit) => void;
}

const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";

function makeSeries(overrides: Partial<WorkoutSeries> = {}): WorkoutSeries {
  return {
    id: "s1",
    entryId: "entry-1",
    position: 1,
    reps: null,
    durationSeconds: null,
    load: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
    ...overrides,
  };
}

function base(overrides: Partial<SeriesCardProps> = {}): SeriesCardProps {
  return {
    series: makeSeries(),
    index: 0,
    loadUnit: "kg",
    readOnly: false,
    onCommit: vi.fn(),
    onApplyAll: vi.fn(),
    onChooseUnit: vi.fn(),
    ...overrides,
  };
}

/** Campo por rótulo (label/aria-label) com fallback para placeholder. */
function campo(rotulo: RegExp): HTMLElement {
  const porLabel = screen.queryByLabelText(rotulo);
  if (porLabel) return porLabel;
  const porPlaceholder = screen.queryByPlaceholderText(rotulo);
  if (porPlaceholder) return porPlaceholder;
  throw new Error(`Campo com rótulo ${rotulo} não encontrado`);
}

function digitarEComapitar(
  rotulo: RegExp,
  valor: string,
): void {
  const alvo = campo(rotulo);
  fireEvent.change(alvo, { target: { value: valor } });
  fireEvent.blur(alvo);
}

describe("SeriesCard", () => {
  describe("rótulo da série", () => {
    it("index 0 renderiza o rótulo 'Série 1'", () => {
      render(<SeriesCard {...base({ index: 0 })} />);

      expect(screen.getByText("Série 1")).toBeInTheDocument();
    });

    it("index 1 renderiza o rótulo 'Série 2'", () => {
      render(<SeriesCard {...base({ index: 1 })} />);

      expect(screen.getByText("Série 2")).toBeInTheDocument();
    });

    it("index 3 renderiza o rótulo 'Série 4' (numerado 1-based, ordem de criação)", () => {
      render(<SeriesCard {...base({ index: 3 })} />);

      expect(screen.getByText("Série 4")).toBeInTheDocument();
      expect(screen.queryByText("Série 3")).not.toBeInTheDocument();
    });
  });

  describe("validações de inteiro (repetições e tempo)", () => {
    it("repetições válidas commitam ('reps', número) e vazio commita null", () => {
      const onCommit = vi.fn();
      render(<SeriesCard {...base({ onCommit })} />);

      digitarEComapitar(/repetições/i, "8");
      expect(onCommit).toHaveBeenCalledWith("reps", 8);

      digitarEComapitar(/repetições/i, "");
      expect(onCommit).toHaveBeenLastCalledWith("reps", null);
    });

    it.each(["abc", "-1", "2.5"])(
      "repetições inválidas ('%s') mostram 'Use um número inteiro maior ou igual a zero para repetições.' e não commitam",
      (valor) => {
        const onCommit = vi.fn();
        render(<SeriesCard {...base({ onCommit })} />);

        digitarEComapitar(/repetições/i, valor);

        expect(
          screen.getByText(
            "Use um número inteiro maior ou igual a zero para repetições.",
          ),
        ).toBeInTheDocument();
        expect(onCommit).not.toHaveBeenCalled();
      },
    );

    it("tempo válido commita ('durationSeconds', número); inválido mostra a mensagem exata do rótulo 'tempo'", () => {
      const onCommit = vi.fn();
      render(<SeriesCard {...base({ onCommit })} />);

      // Alternar para modo tempo (o campo único reps/tempo tem toggle)
      fireEvent.click(screen.getByRole("button", { name: /alternar para tempo/i }));
      digitarEComapitar(/tempo/i, "45");
      expect(onCommit).toHaveBeenCalledWith("durationSeconds", 45);

      digitarEComapitar(/tempo/i, "-1");
      expect(
        screen.getByText("Use um número inteiro maior ou igual a zero para tempo."),
      ).toBeInTheDocument();
      expect(onCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe("validações de carga (D7)", () => {
    it("carga negativa mostra 'A carga não pode ser negativa.' e não commita", () => {
      const onCommit = vi.fn();
      render(<SeriesCard {...base({ onCommit })} />);

      digitarEComapitar(/carga/i, "-5");

      expect(MSG_CARGA_NEGATIVA).toBe("A carga não pode ser negativa.");
      expect(screen.getByText(MSG_CARGA_NEGATIVA)).toBeInTheDocument();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("carga não numérica mostra 'Informe um valor numérico válido para a carga.' e não commita", () => {
      const onCommit = vi.fn();
      render(<SeriesCard {...base({ onCommit })} />);

      digitarEComapitar(/carga/i, "abc");

      expect(MSG_CARGA_NAO_NUMERICA).toBe(
        "Informe um valor numérico válido para a carga.",
      );
      expect(screen.getByText(MSG_CARGA_NAO_NUMERICA)).toBeInTheDocument();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("carga válida commita ('load', número) e zero é valor legítimo (commita 0)", () => {
      const onCommit = vi.fn();
      render(<SeriesCard {...base({ onCommit })} />);

      digitarEComapitar(/carga/i, "42.5");
      expect(onCommit).toHaveBeenCalledWith("load", 42.5);

      digitarEComapitar(/carga/i, "0");
      expect(onCommit).toHaveBeenLastCalledWith("load", 0);
    });

    it("carga vazia commita null (vazio ≠ 0 — D7)", () => {
      const onCommit = vi.fn();
      render(<SeriesCard {...base({ onCommit })} />);

      digitarEComapitar(/carga/i, "");

      expect(onCommit).toHaveBeenCalledWith("load", null);
    });
  });

  describe("exibição: vazio é traço e 0 é 0 (D7)", () => {
    it("carga sem valor exibe o placeholder '—' (traço), não zero", () => {
      render(<SeriesCard {...base({ series: makeSeries({ load: null }) })} />);

      expect(campo(/carga/i)).toHaveAttribute("placeholder", "—");
      expect(campo(/carga/i)).not.toHaveValue("0");
    });

    it("carga 0 é exibida como 0", () => {
      render(<SeriesCard {...base({ series: makeSeries({ load: 0 }) })} />);

      expect(campo(/carga/i)).toHaveValue("0");
      expect(campo(/carga/i)).not.toHaveAttribute("placeholder", "—");
    });
  });

  describe("unidade secundária convertida (D10)", () => {
    it("exibe o valor convertido, menor e em cinza mais claro, quando há unidade", () => {
      render(
        <SeriesCard
          {...base({ series: makeSeries({ load: 50 }), loadUnit: "kg" })}
        />,
      );

      const { secundaria } = formatarCargaComSecundaria(50, "kg");
      expect(secundaria).toBe("110.2");

      const convertido = screen.getByText(new RegExp(secundaria ?? ""));
      expect(convertido.className).toMatch(
        /text-(muted-foreground|gray-|zinc-|slate-|neutral-|stone-)/,
      );
      expect(convertido.className).toMatch(/text-(xs|\[1[0-9]px\])/);
    });

    it("sem unidade escolhida não há valor secundário convertido", () => {
      render(
        <SeriesCard
          {...base({ series: makeSeries({ load: 50 }), loadUnit: null })}
        />,
      );

      // 50 kg = 110.2 lb — sem unidade escolhida nada é convertido.
      expect(screen.queryByText(/110\.2/)).not.toBeInTheDocument();
    });
  });

  describe("'Aplicar a todas' (D2/D5)", () => {
    it("acionar dispara onApplyAll", () => {
      const onApplyAll = vi.fn();
      render(<SeriesCard {...base({ onApplyAll })} />);

      fireEvent.click(screen.getByRole("button", { name: /aplicar a todas/i }));

      expect(onApplyAll).toHaveBeenCalledTimes(1);
    });
  });

  

  describe("toggle de unidade kg/lb abaixo da carga (CA-26)", () => {
    it("clicar em lb dispara onChooseUnit('libra')", () => {
      const onChooseUnit = vi.fn();
      render(<SeriesCard {...base({ onChooseUnit })} />);

      fireEvent.click(screen.getByRole("button", { name: /^lb$/i }));

      expect(onChooseUnit).toHaveBeenCalledTimes(1);
      expect(onChooseUnit).toHaveBeenCalledWith("libra");
    });

    it("clicar em kg dispara onChooseUnit('kg')", () => {
      const onChooseUnit = vi.fn();
      render(<SeriesCard {...base({ onChooseUnit })} />);

      fireEvent.click(screen.getByRole("button", { name: /^kg$/i }));

      expect(onChooseUnit).toHaveBeenCalledTimes(1);
      expect(onChooseUnit).toHaveBeenCalledWith("kg");
    });
  });

  describe("readOnly (Programa inativo)", () => {
    it("oculta campos e ações", () => {
      render(<SeriesCard {...base({ readOnly: true })} />);

      expect(screen.queryByLabelText(/repetições/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/tempo/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/carga/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /aplicar a todas/i }),
      ).not.toBeInTheDocument();
      // O rótulo da série continua visível (conteúdo somente leitura).
      expect(screen.getByText("Série 1")).toBeInTheDocument();
    });
  });
});
