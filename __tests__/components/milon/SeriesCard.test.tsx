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

  /**
   * Contrato RED (correção 2026-10-08) — Mílon #5 Execução série a série:
   * card inteiro clicável, SEM checkbox, SEM botão editar.
   *
   * Fonte: spec §3 alinhada (cada série é um card que é o próprio marcador;
   * não há caixinha nem botão de editar; todo o card é área clicável; toque
   * curto alterna na hora sem confirmação; toque longo abre o modal; marcada
   * tem fundo na cor do módulo) + plan.md §3 (longo de 500ms sem alternar ao
   * soltar; Enter/Espaço como alternativa por teclado; alvos ≥44px; readOnly
   * não interage) + tasks.json TASK-005.
   *
   * CONTRATO FIXADO AQUI (nomes que a TASK-006 deve implementar, exportados
   * pelo módulo do SeriesCard):
   * - `export interface SeriesExecutionProps { doneBySeriesId:
   *   Record<string, boolean>; onToggle: (seriesId: string) => void;
   *   onOpenEditor: (seriesId: string) => void; }`
   * - `SeriesCardProps` ganha `execution?: SeriesExecutionProps` (opt-in).
   * - Em execução: card é `role="button"` (ou equivalente acessível) com o
   *   nome da série; SEM `role="checkbox"`; SEM botão "Editar"; marcada usa
   *   fundo na cor do módulo (#B7602B, MilonLayout).
   *
   * Expected: FAIL enquanto a produção ainda tem checkbox/botão e ainda não
   * tem card-botão com fundo do módulo; o bloco "sem pacote" passa como trava
   * de regressão. Hefesto fará GREEN na TASK-006.
   */
  describe("modo execução — card clicável (correção 2026-10-08 — RED)", () => {
    interface SeriesExecutionProps {
      doneBySeriesId: Record<string, boolean>;
      onToggle: (seriesId: string) => void;
      onOpenEditor: (seriesId: string) => void;
    }

    function exec(
      overrides: Partial<SeriesExecutionProps> = {},
    ): SeriesExecutionProps {
      return {
        doneBySeriesId: {},
        onToggle: vi.fn(),
        onOpenEditor: vi.fn(),
        ...overrides,
      };
    }

    /** Repassa `execution` sem erro de tipo (prop ainda não existe). */
    function comExecucao(
      props: Partial<SeriesCardProps> = {},
      execution: SeriesExecutionProps,
    ) {
      return {
        ...base(props),
        ...( { execution } as unknown as Record<string, unknown> ),
      };
    }

    function cartaoDaSerie(): HTMLElement {
      return screen.getByRole("button", { name: /^série 1/i });
    }

    function temFundoDoModulo(el: HTMLElement): boolean {
      const alvo = `${el.className} ${(el.getAttribute("style") ?? "")}`.toLowerCase();
      return (
        alvo.includes("b7602b") ||
        alvo.includes("183, 96, 43") ||
        alvo.includes("183,96,43")
      );
    }

    it("com pacote exibe card clicável bloqueado (sem inputs de edição)", () => {
      render(
        <SeriesCard {...comExecucao({}, exec())} />,
      );

      expect(cartaoDaSerie()).toBeInTheDocument();
      expect(screen.getByText("Série 1")).toBeInTheDocument();
      expect(screen.queryByLabelText(/repetições/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/carga/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /aplicar a todas/i }),
      ).not.toBeInTheDocument();
    });

    it("com pacote não há checkbox nem botão de editar (card é o próprio marcador)", () => {
      render(
        <SeriesCard {...comExecucao({}, exec())} />,
      );

      expect(cartaoDaSerie()).toBeInTheDocument();
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(
        screen.queryByRole("button", { name: /editar/i }),
      ).not.toBeInTheDocument();
    });

    it("marcada tem fundo na cor do módulo; desmarcada não tem", () => {
      const { unmount } = render(
        <SeriesCard {...comExecucao({}, exec({ doneBySeriesId: { s1: true } }))} />,
      );
      expect(temFundoDoModulo(cartaoDaSerie())).toBe(true);
      unmount();

      render(
        <SeriesCard {...comExecucao({}, exec({ doneBySeriesId: {} }))} />,
      );
      expect(temFundoDoModulo(cartaoDaSerie())).toBe(false);
    });

    it("toque curto no card alterna na hora (onToggle com o id)", () => {
      const onToggle = vi.fn();
      render(
        <SeriesCard {...comExecucao({}, exec({ onToggle }))} />,
      );

      fireEvent.click(cartaoDaSerie());

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith("s1");
    });

    it("toque longo de 500ms abre o editor sem disparar a alternância ao soltar", () => {
      vi.useFakeTimers();
      try {
        const onToggle = vi.fn();
        const onOpenEditor = vi.fn();
        render(
          <SeriesCard {...comExecucao({}, exec({ onToggle, onOpenEditor }))} />,
        );

        const alvo = cartaoDaSerie();
        fireEvent.pointerDown(alvo, { pointerType: "touch" });
        vi.advanceTimersByTime(500);
        fireEvent.pointerUp(alvo, { pointerType: "touch" });

        expect(onOpenEditor).toHaveBeenCalledTimes(1);
        expect(onOpenEditor).toHaveBeenCalledWith("s1");
        expect(onToggle).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("teclado (Enter/Espaço) no card focado equivale ao toque curto", () => {
      const onToggle = vi.fn();
      render(
        <SeriesCard {...comExecucao({}, exec({ onToggle }))} />,
      );

      cartaoDaSerie().focus();
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Enter" });
      expect(onToggle).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(document.activeElement as HTMLElement, { key: " " });
      expect(onToggle).toHaveBeenCalledTimes(2);
      expect(onToggle).toHaveBeenLastCalledWith("s1");
    });

    it("toque curto (<500ms) não abre o editor, só alterna", () => {
      vi.useFakeTimers();
      try {
        const onToggle = vi.fn();
        const onOpenEditor = vi.fn();
        render(
          <SeriesCard {...comExecucao({}, exec({ onToggle, onOpenEditor }))} />,
        );

        const alvo = cartaoDaSerie();
        fireEvent.pointerDown(alvo, { pointerType: "touch" });
        vi.advanceTimersByTime(200);
        fireEvent.pointerUp(alvo, { pointerType: "touch" });
        fireEvent.click(alvo);

        expect(onOpenEditor).not.toHaveBeenCalled();
        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onToggle).toHaveBeenCalledWith("s1");
      } finally {
        vi.useRealTimers();
      }
    });

    it("alvos de toque com pelo menos 44px (mão suada)", () => {
      render(
        <SeriesCard {...comExecucao({}, exec())} />,
      );

      expect(cartaoDaSerie().className).toMatch(/44/);
    });

    it("programa inativo (readOnly) não interage mesmo com pacote", () => {
      const onToggle = vi.fn();
      const onOpenEditor = vi.fn();
      render(
        <SeriesCard
          {...comExecucao({ readOnly: true }, exec({ onToggle, onOpenEditor }))}
        />,
      );

      expect(
        screen.queryByRole("button", { name: /^série 1/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(
        screen.queryByRole("button", { name: /editar/i }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByText("Série 1"));

      expect(onToggle).not.toHaveBeenCalled();
      expect(onOpenEditor).not.toHaveBeenCalled();
    });

    it("sem pacote renderiza idêntico a hoje (trava de regressão — passa no RED)", () => {
      render(<SeriesCard {...base()} />);

      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(
        screen.queryByRole("button", { name: /^série 1/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText(/repetições/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /aplicar a todas/i }),
      ).toBeInTheDocument();
    });
  });
});

/**
 * Correção humana 2026-10-08 (verdade) — Mílon #5 Execução série a série:
 * (1) toggles de tempo/repetições e kg/lb aparecem SOMENTE no modal
 * (SeriesEditModal, inalterado); no card do Treino do Dia mostra-se SOMENTE
 * o que está valendo (rótulos + valores + unidade vigentes, sem botões
 * alternar/kg/lb no card em execução). (2) Texto cinza sobre fundo marrom
 * da marcada → cinza mais claro (contraste).
 *
 * Fonte: correção humana delegada via Zeus (spec §3 "mesma cara" lida com a
 * correção: rótulos e valores mantidos, toggles só no modal) + manutenção
 * inalterada (com toggles — trava de regressão no bloco acima).
 *
 * Expected: FAIL — o ramo de execução ainda renderiza os toggles
 * (alternar + kg/lb + linha "Unidade:") e ainda usa text-muted-foreground
 * sobre o fundo #B7602B. Hefesto fará GREEN removendo os toggles do card
 * e clareando o cinza da marcada, sem mudar estes testes.
 */
describe("SeriesCard — execução somente leitura vigente (correção 2026-10-08 — RED)", () => {
  interface ExecPkg {
    doneBySeriesId: Record<string, boolean>;
    onToggle: (seriesId: string) => void;
    onOpenEditor: (seriesId: string) => void;
  }

  function execPkg(overrides: Partial<ExecPkg> = {}): ExecPkg {
    return {
      doneBySeriesId: {},
      onToggle: vi.fn(),
      onOpenEditor: vi.fn(),
      ...overrides,
    };
  }

  function renderExecucao(
    seriesOverrides: Partial<WorkoutSeries> = {},
    loadUnit: LoadUnit | null = "kg",
    pkgOverrides: Partial<ExecPkg> = {},
  ) {
    const props = {
      ...base({
        series: makeSeries({ reps: 10, durationSeconds: null, load: 50, ...seriesOverrides }),
        loadUnit,
      }),
      execution: execPkg(pkgOverrides),
    } as unknown as Parameters<typeof SeriesCard>[0];
    render(<SeriesCard {...props} />);
  }

  it("com reps exibe o rótulo Repetições (não só números)", () => {
    renderExecucao({ reps: 10, durationSeconds: null });

    expect(screen.getByText("Repetições")).toBeInTheDocument();
  });

  it("com tempo exibe o rótulo Tempo (s) conforme o modo", () => {
    renderExecucao({ reps: null, durationSeconds: 45 });

    expect(screen.getByText("Tempo (s)")).toBeInTheDocument();
  });

  it("exibe o rótulo Carga com a unidade visível", () => {
    renderExecucao({ load: 50 }, "kg");

    expect(screen.getByText("Carga")).toBeInTheDocument();
    expect(screen.getByText(/kg/)).toBeInTheDocument();
  });

  it("exibe a conversão secundária de carga da manutenção", () => {
    renderExecucao({ load: 50 }, "kg");

    const { secundaria } = formatarCargaComSecundaria(50, "kg");
    expect(secundaria).toBe("110.2");
    expect(screen.getByText(new RegExp(secundaria ?? ""))).toBeInTheDocument();
  });

  it("NÃO expõe botão de alternar repetição/tempo no card em execução (só no modal)", () => {
    renderExecucao();

    expect(
      screen.queryByRole("button", { name: /alternar para (tempo|repetições)/i }),
    ).not.toBeInTheDocument();
  });

  it("NÃO expõe botões kg/lb no card em execução (só no modal)", () => {
    renderExecucao();

    expect(screen.queryByRole("button", { name: /^kg$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^lb$/i })).not.toBeInTheDocument();
  });

  it("NÃO exibe linha de Unidade: no card em execução", () => {
    renderExecucao({ load: 50 }, "kg");

    expect(screen.queryByText(/unidade:/i)).not.toBeInTheDocument();
  });

  it("marcada tem fundo na cor do módulo (#B7602B)", () => {
    const props = {
      ...base({ series: makeSeries({ reps: 10, load: 50 }) }),
      execution: execPkg({ doneBySeriesId: { s1: true } }),
    } as unknown as Parameters<typeof SeriesCard>[0];
    render(<SeriesCard {...props} />);

    const cartao = screen.getByRole("button", { name: /^série 1/i });
    const alvo = `${cartao.className} ${(cartao.getAttribute("style") ?? "")}`.toLowerCase();
    expect(alvo).toMatch(/b7602b/);
  });

  it("não há checkbox nem botão de marcar (o card é o próprio marcador)", () => {
    renderExecucao();

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: /marcar/i }),
    ).not.toBeInTheDocument();
  });

  it("D17: sem botão Aplicar a todas em execução", () => {
    renderExecucao();

    expect(
      screen.queryByRole("button", { name: /aplicar a todas/i }),
    ).not.toBeInTheDocument();
  });

  it("exibe somente o valor vigente como texto (card somente leitura, sem inputs)", () => {
    renderExecucao({ reps: 10, durationSeconds: null, load: 50 }, "kg");

    expect(screen.getByText("Repetições")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Carga")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("marcada usa cinza claro na conversão secundária (contraste sobre #B7602B, sem muted-foreground)", () => {
    const props = {
      ...base({ series: makeSeries({ reps: 10, load: 50 }) }),
      execution: execPkg({ doneBySeriesId: { s1: true } }),
    } as unknown as Parameters<typeof SeriesCard>[0];
    render(<SeriesCard {...props} />);

    const { secundaria } = formatarCargaComSecundaria(50, "kg");
    const convertido = screen.getByText(new RegExp(secundaria ?? ""));
    expect(convertido.className).not.toMatch(/muted-foreground/);
    expect(convertido.className).toMatch(
      /text-(white|stone-(100|200)|neutral-(100|200)|zinc-(100|200)|slate-(100|200)|gray-(100|200))/,
    );
  });
});
