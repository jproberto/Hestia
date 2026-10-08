import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExerciseEntryCard from "@/components/milon/ExerciseEntryCard";
import {
  MSG_QUANTIDADE_SERIES_INVALIDA,
  MSG_UNIDADE_OBRIGATORIA,
} from "@/lib/milon/workout-utils";
import type { Exercise, LoadUnit, WorkoutEntryView, WorkoutSeries } from "@/lib/milon/types";

/**
 * Contrato (plan.md §3 "ExerciseEntryCard (props)" + tasks.json TASK-013 +
 * spec §3 "Séries do exercício" / D3 / D4 / D7 / D10):
 * - props: entryView, readOnly, unitPromptValue, saving + callbacks
 *   onQuantityCommit(quantity), onRequestReduce(newQuantity),
 *   onRestCommit(seconds), onSeriesCommit(seriesId, field, value),
 *   onApplyAll(seriesId), onEditExercise(), onRemoveEntry(), onChooseUnit(unit).
 * - Composição: handle de arrastar (D8), nome do exercício em h3 com
 *   font-display, campo "Séries" com commit no blur/Enter, campo "Descanso (s)"
 *   (campo único — D4), botões "Editar"/"Excluir" e um SeriesCard por série.
 * - Regras da quantidade (interpretarQuantidadeSeries):
 *     inválida (vazio/zero/não numérico na criação) → mensagem exata
 *     MSG_QUANTIDADE_SERIES_INVALIDA e NADA é enviado;
 *     maior que o total → onQuantityCommit (aumento);
 *     menor que o total ou 0 → hasSeriePreenchida decide entre
 *     onRequestReduce (confirmação) e onQuantityCommit (direto) — é a regra
 *     de confirmação por preenchimento (spec §5 / D6);
 *     igual ao total → no-op.
 * - Carga: commita direto via onSeriesCommit mesmo com loadUnit null;
 *   unidade via toggle inline kg/lb do SeriesCard (default kg, D10);
 *   sem prompt âmbar MSG_UNIDADE_OBRIGATORIA na UI;
 *   carga vazia commita null.
 * - readOnly (Programa inativo): oculta handle, campos e ações (TASK-014 AC5).
 * - Mensagens escritas caractere a caractere conforme plan.md §3.
 */

type SerieField = "reps" | "durationSeconds" | "load";

interface ExerciseEntryCardProps {
  entryView: WorkoutEntryView;
  readOnly: boolean;
  unitPromptValue: number | null;
  saving: boolean;
  onQuantityCommit: (quantity: number) => void;
  onRequestReduce: (newQuantity: number) => void;
  onRestCommit: (seconds: number | null) => void;
  onSeriesCommit: (seriesId: string, field: SerieField, value: number | null) => void;
  onApplyAll: (seriesId: string) => void;
  onEditExercise: () => void;
  onRemoveEntry: () => void;
  onChooseUnit: (unit: LoadUnit) => void;
}

const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";
const ROTULO_HANDLE = /arrastar|reordenar|handle|segurar/i;

function makeSeries(id: string, overrides: Partial<WorkoutSeries> = {}): WorkoutSeries {
  return {
    id,
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

function makeView(
  series: WorkoutSeries[],
  exerciseOverrides: Partial<Exercise> = {},
): WorkoutEntryView {
  const exercise: Exercise = {
    id: "ex-1",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: null,
    loadUnit: "kg",
    deletedAt: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
    ...exerciseOverrides,
  };
  return {
    entry: {
      id: "entry-1",
      workoutId: "wout-1",
      programId: "prog-1",
      exerciseId: exercise.id,
      position: 1,
      restSeconds: null,
      createdAt: CRIADO_EM,
      created_by: DONO,
    },
    exercise,
    series,
  };
}

function base(
  overrides: Partial<ExerciseEntryCardProps> = {},
): ExerciseEntryCardProps {
  return {
    entryView: makeView([makeSeries("s1", { position: 1 }), makeSeries("s2", { position: 2 })]),
    readOnly: false,
    unitPromptValue: null,
    saving: false,
    onQuantityCommit: vi.fn(),
    onRequestReduce: vi.fn(),
    onRestCommit: vi.fn(),
    onSeriesCommit: vi.fn(),
    onApplyAll: vi.fn(),
    onEditExercise: vi.fn(),
    onRemoveEntry: vi.fn(),
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

function handle(): HTMLElement | null {
  const candidatos = Array.from(
    document.querySelectorAll<HTMLElement>("[aria-label], [title], [draggable='true']"),
  );
  return (
    candidatos.find(
      (el) =>
        ROTULO_HANDLE.test(el.getAttribute("aria-label") ?? "") ||
        ROTULO_HANDLE.test(el.getAttribute("title") ?? "") ||
        el.getAttribute("draggable") === "true",
    ) ?? null
  );
}

describe("ExerciseEntryCard", () => {
  describe("composição", () => {
    it("nome do exercício é h3 com font-display e um card por série é renderizado", () => {
      render(<ExerciseEntryCard {...base()} />);

      const titulo = screen.getByRole("heading", { level: 3, name: "Supino reto" });
      expect(titulo.tagName).toBe("H3");
      expect(titulo.className).toMatch(/font-display/);
      expect(screen.getByText("Série 1")).toBeInTheDocument();
      expect(screen.getByText("Série 2")).toBeInTheDocument();
    });

    it("handle de arrastar e soltar visível; botões Editar e Excluir disparam os callbacks", () => {
      const onEditExercise = vi.fn();
      const onRemoveEntry = vi.fn();
      render(
        <ExerciseEntryCard {...base({ onEditExercise, onRemoveEntry })} />,
      );

      expect(handle()).not.toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /editar/i }));
      expect(onEditExercise).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
      expect(onRemoveEntry).toHaveBeenCalledTimes(1);
    });
  });

  describe("quantidade de séries (commit no blur/Enter)", () => {
    it("aumento commita no blur com a quantidade digitada", () => {
      const onQuantityCommit = vi.fn();
      const onRequestReduce = vi.fn();
      render(<ExerciseEntryCard {...base({ onQuantityCommit, onRequestReduce })} />);

      const campoQuantidade = campo(/séries/i);
      fireEvent.change(campoQuantidade, { target: { value: "4" } });
      fireEvent.blur(campoQuantidade);

      expect(onQuantityCommit).toHaveBeenCalledWith(4);
      expect(onRequestReduce).not.toHaveBeenCalled();
    });

    it("commit também acontece ao pressionar Enter", () => {
      const onQuantityCommit = vi.fn();
      render(<ExerciseEntryCard {...base({ onQuantityCommit })} />);

      const campoQuantidade = campo(/séries/i);
      fireEvent.change(campoQuantidade, { target: { value: "7" } });
      fireEvent.keyDown(campoQuantidade, { key: "Enter" });

      expect(onQuantityCommit).toHaveBeenCalledWith(7);
    });

    it.each(["", "0", "abc"])(
      "quantidade inválida na criação ('%s') mostra MSG_QUANTIDADE_SERIES_INVALIDA e não envia nada",
      (valor) => {
        const onQuantityCommit = vi.fn();
        const onRequestReduce = vi.fn();
        render(
          <ExerciseEntryCard
            {...base({
              entryView: makeView([]),
              onQuantityCommit,
              onRequestReduce,
            })}
          />,
        );

        const campoQuantidade = campo(/séries/i);
        fireEvent.change(campoQuantidade, { target: { value: valor } });
        fireEvent.blur(campoQuantidade);

        expect(MSG_QUANTIDADE_SERIES_INVALIDA).toBe(
          "Informe a quantidade de séries (número inteiro maior ou igual a 1).",
        );
        expect(
          screen.getByText(MSG_QUANTIDADE_SERIES_INVALIDA),
        ).toBeInTheDocument();
        expect(onQuantityCommit).not.toHaveBeenCalled();
        expect(onRequestReduce).not.toHaveBeenCalled();
      },
    );

    it("redução com série preenchida dispara onRequestReduce (confirmação) e NÃO onQuantityCommit", () => {
      const onQuantityCommit = vi.fn();
      const onRequestReduce = vi.fn();
      render(
        <ExerciseEntryCard
          {...base({
            entryView: makeView([
              makeSeries("s1", { position: 1, reps: 10 }),
              makeSeries("s2", { position: 2 }),
              makeSeries("s3", { position: 3 }),
            ]),
            onQuantityCommit,
            onRequestReduce,
          })}
        />,
      );

      const campoQuantidade = campo(/séries/i);
      fireEvent.change(campoQuantidade, { target: { value: "1" } });
      fireEvent.blur(campoQuantidade);

      expect(onRequestReduce).toHaveBeenCalledWith(1);
      expect(onQuantityCommit).not.toHaveBeenCalled();
    });

    it("redução sem nenhuma série preenchida vai direto para onQuantityCommit", () => {
      const onQuantityCommit = vi.fn();
      const onRequestReduce = vi.fn();
      render(
        <ExerciseEntryCard
          {...base({ onQuantityCommit, onRequestReduce })}
        />,
      );

      const campoQuantidade = campo(/séries/i);
      fireEvent.change(campoQuantidade, { target: { value: "1" } });
      fireEvent.blur(campoQuantidade);

      expect(onQuantityCommit).toHaveBeenCalledWith(1);
      expect(onRequestReduce).not.toHaveBeenCalled();
    });

    it("zerar sem nenhuma série preenchida remove tudo direto (onQuantityCommit com 0)", () => {
      const onQuantityCommit = vi.fn();
      const onRequestReduce = vi.fn();
      render(
        <ExerciseEntryCard
          {...base({ onQuantityCommit, onRequestReduce })}
        />,
      );

      const campoQuantidade = campo(/séries/i);
      fireEvent.change(campoQuantidade, { target: { value: "0" } });
      fireEvent.blur(campoQuantidade);

      expect(onQuantityCommit).toHaveBeenCalledWith(0);
      expect(onRequestReduce).not.toHaveBeenCalled();
    });

    it("quantidade igual ao total é no-op (nenhum callback)", () => {
      const onQuantityCommit = vi.fn();
      const onRequestReduce = vi.fn();
      render(
        <ExerciseEntryCard {...base({ onQuantityCommit, onRequestReduce })} />,
      );

      const campoQuantidade = campo(/séries/i);
      fireEvent.change(campoQuantidade, { target: { value: "2" } });
      fireEvent.blur(campoQuantidade);

      expect(onQuantityCommit).not.toHaveBeenCalled();
      expect(onRequestReduce).not.toHaveBeenCalled();
    });
  });

  describe("descanso (campo único — D4)", () => {
    it("commita os segundos no blur e aceita vazio como null", () => {
      const onRestCommit = vi.fn();
      render(<ExerciseEntryCard {...base({ onRestCommit })} />);

      const campoDescanso = campo(/descanso/i);
      fireEvent.change(campoDescanso, { target: { value: "90" } });
      fireEvent.blur(campoDescanso);
      expect(onRestCommit).toHaveBeenCalledWith(90);

      fireEvent.change(campoDescanso, { target: { value: "" } });
      fireEvent.blur(campoDescanso);
      expect(onRestCommit).toHaveBeenLastCalledWith(null);
    });

    it.each(["abc", "-1"])(
      "descanso inválido ('%s') mostra 'Use um número inteiro maior ou igual a zero para descanso.' e não commita",
      (valor) => {
        const onRestCommit = vi.fn();
        render(<ExerciseEntryCard {...base({ onRestCommit })} />);

        const campoDescanso = campo(/descanso/i);
        fireEvent.change(campoDescanso, { target: { value: valor } });
        fireEvent.blur(campoDescanso);

        expect(
          screen.getByText(
            "Use um número inteiro maior ou igual a zero para descanso.",
          ),
        ).toBeInTheDocument();
        expect(onRestCommit).not.toHaveBeenCalled();
      },
    );
  });

  describe("carga e escolha da unidade (D10 — toggle inline, sem prompt)", () => {
    it("primeira carga digitada com loadUnit null commita direto (sem prompt âmbar)", () => {
      const onSeriesCommit = vi.fn();
      const onChooseUnit = vi.fn();
      render(
        <ExerciseEntryCard
          {...base({
            entryView: makeView([makeSeries("s1")], { loadUnit: null }),
            onSeriesCommit,
            onChooseUnit,
          })}
        />,
      );

      const campoCarga = campo(/carga/i);
      fireEvent.change(campoCarga, { target: { value: "45" } });
      fireEvent.blur(campoCarga);

      expect(onSeriesCommit).toHaveBeenCalledWith("s1", "load", 45);
      expect(onChooseUnit).not.toHaveBeenCalled();
      // Sem prompt âmbar na UI — unidade via toggle inline do SeriesCard.
      expect(screen.queryByText(MSG_UNIDADE_OBRIGATORIA)).not.toBeInTheDocument();
      // Toggle inline kg/lb visível (default kg quando loadUnit null).
      expect(screen.getByRole("button", { name: /^kg$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^lb$/i })).toBeInTheDocument();
    });

    it("unitPromptValue (deprecated) é ignorado — não exibe prompt", () => {
      render(
        <ExerciseEntryCard
          {...base({
            entryView: makeView([makeSeries("s1")], { loadUnit: null }),
            unitPromptValue: 45,
          })}
        />,
      );

      expect(screen.queryByText(MSG_UNIDADE_OBRIGATORIA)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^kg$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^lb$/i })).toBeInTheDocument();
    });

    it("toggle inline de unidade dispara onChooseUnit", () => {
      const onChooseUnit = vi.fn();
      render(
        <ExerciseEntryCard
          {...base({
            entryView: makeView([makeSeries("s1")], { loadUnit: null }),
            onChooseUnit,
          })}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /^lb$/i }));
      expect(onChooseUnit).toHaveBeenCalledTimes(1);
      expect(onChooseUnit).toHaveBeenCalledWith("libra");

      fireEvent.click(screen.getByRole("button", { name: /^kg$/i }));
      expect(onChooseUnit).toHaveBeenCalledTimes(2);
      expect(onChooseUnit).toHaveBeenLastCalledWith("kg");
    });

    it("com unidade já escolhida a carga commita direto (sem prompt)", () => {
      const onSeriesCommit = vi.fn();
      const onChooseUnit = vi.fn();
      render(
        <ExerciseEntryCard
          {...base({
            entryView: makeView([makeSeries("s1")], { loadUnit: "kg" }),
            onSeriesCommit,
            onChooseUnit,
          })}
        />,
      );

      const campoCarga = campo(/carga/i);
      fireEvent.change(campoCarga, { target: { value: "40" } });
      fireEvent.blur(campoCarga);

      expect(onSeriesCommit).toHaveBeenCalledWith("s1", "load", 40);
      expect(onChooseUnit).not.toHaveBeenCalled();
      expect(screen.queryByText(MSG_UNIDADE_OBRIGATORIA)).not.toBeInTheDocument();
    });

    it("carga vazia commita null (vazio ≠ 0 — D7)", () => {
      const onSeriesCommit = vi.fn();
      render(
        <ExerciseEntryCard
          {...base({
            entryView: makeView([makeSeries("s1", { load: 40 })], { loadUnit: "kg" }),
            onSeriesCommit,
          })}
        />,
      );

      const campoCarga = campo(/carga/i);
      fireEvent.change(campoCarga, { target: { value: "" } });
      fireEvent.blur(campoCarga);

      expect(onSeriesCommit).toHaveBeenCalledWith("s1", "load", null);
    });
  });

  describe("readOnly (Programa inativo)", () => {
    it("oculta handle, campos e ações do card", () => {
      render(<ExerciseEntryCard {...base({ readOnly: true })} />);

      expect(handle()).toBeNull();
      expect(screen.queryByLabelText(/séries/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/descanso/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/carga/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/repetições/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /editar/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /excluir/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /aplicar a todas/i }),
      ).not.toBeInTheDocument();
      // O conteúdo continua visível (somente leitura, não escondido).
      expect(
        screen.getByRole("heading", { level: 3, name: "Supino reto" }),
      ).toBeInTheDocument();
    });
  });

  /**
   * Contrato RED (correção 2026-10-08) — Mílon #5 Execução série a série:
   * repasse do pacote de execução com card clicável.
   *
   * Fonte: plan.md §2 (ExerciseEntryCard repassa o pacote para cada
   * SeriesCard; sem ele renderiza idêntico a hoje) + §3 (aceita o pacote
   * como prop opcional e o repassa sem interpretar) + spec §3 alinhada
   * (card é o próprio marcador; SEM checkbox; SEM botão de editar; marcada
   * com fundo na cor do módulo) + tasks.json TASK-005.
   *
   * CONTRATO FIXADO AQUI (mesmo da SeriesCard): prop opcional
   * `execution?: { doneBySeriesId: Record<string, boolean>;
   * onToggle: (seriesId: string) => void;
   * onOpenEditor: (seriesId: string) => void }`, repassada sem interpretar.
   * Em execução cada série é um `role="button"` ("Série N"), sem checkbox e
   * sem botão "Editar"; o feito aparece no fundo do card (cor do módulo).
   *
   * Expected: FAIL enquanto a produção ainda tem checkbox/botão; o bloco sem
   * pacote passa como trava de regressão. Hefesto fará GREEN na TASK-006.
   */
  describe("repasse do pacote de execução (Mílon #5 — card clicável — RED)", () => {
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

    function cartoesDasSeries(): HTMLElement[] {
      return screen.getAllByRole("button", { name: /^série [12]/i });
    }

    function temFundoDoModulo(el: HTMLElement): boolean {
      const alvo = `${el.className} ${(el.getAttribute("style") ?? "")}`.toLowerCase();
      return (
        alvo.includes("b7602b") ||
        alvo.includes("183, 96, 43") ||
        alvo.includes("183,96,43")
      );
    }

    it("sem pacote renderiza idêntico a hoje (sem cards clicáveis)", () => {
      render(<ExerciseEntryCard {...base()} />);

      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(
        screen.queryByRole("button", { name: /^série [12]/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Série 1")).toBeInTheDocument();
      expect(screen.getByText("Série 2")).toBeInTheDocument();
    });

    it("com pacote cada série é um card clicável, sem checkbox nem botão de editar", () => {
      render(
        <ExerciseEntryCard
          {...( {
            ...base(),
            execution: exec({ doneBySeriesId: { s1: true } }),
          } as unknown as ExerciseEntryCardProps )}
        />,
      );

      const cartoes = cartoesDasSeries();
      expect(cartoes).toHaveLength(2);
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(
        screen.queryByRole("button", { name: /editar/i }),
      ).not.toBeInTheDocument();
      expect(temFundoDoModulo(cartoes[0])).toBe(true);
      expect(temFundoDoModulo(cartoes[1])).toBe(false);
    });

    it("com pacote o toque curto no card repassa a alternância com o id da série", () => {
      const onToggle = vi.fn();
      render(
        <ExerciseEntryCard
          {...( {
            ...base(),
            execution: exec({ onToggle }),
          } as unknown as ExerciseEntryCardProps )}
        />,
      );

      fireEvent.click(cartoesDasSeries()[1]);

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith("s2");
    });

    it("com pacote o toque longo no card repassa a abertura do editor", () => {
      vi.useFakeTimers();
      try {
        const onOpenEditor = vi.fn();
        const onToggle = vi.fn();
        render(
          <ExerciseEntryCard
            {...( {
              ...base(),
              execution: exec({ onOpenEditor, onToggle }),
            } as unknown as ExerciseEntryCardProps )}
          />,
        );

        const alvo = cartoesDasSeries()[0];
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
  });
});
