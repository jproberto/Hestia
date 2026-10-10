import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WorkoutEntriesList from "@/components/milon/WorkoutEntriesList";
import type { ErrorOrigin } from "@/lib/shared";
import type {
  Exercise,
  WorkoutEntry,
  WorkoutEntryView,
  WorkoutSeries,
} from "@/lib/milon/types";

/**
 * Contrato (plan.md §3 "WorkoutEntriesList (props)" + tasks.json TASK-013 +
 * spec §3 "Detalhe do treino — lista de exercícios" / D8 / norma D27-R31):
 * - props: entries, programId, readOnly, empty, errorMsg, errorOrigin,
 *   onAdd, onRetry, onReorder(orderedIds) + callbacks repassados a cada
 *   ExerciseEntryCard: onQuantityCommit, onRequestReduce, onRestCommit,
 *   onSeriesCommit, onApplyAll, onEditExercise, onRemoveEntry, onConfirmUnit.
 * - Estados via `AsyncState` centralizado (proibido reimplementar):
 *   emptyTitle exato "Nenhum exercício ainda." com emptyText orientando a
 *   adicionar; erro de carga exibe "Tentar novamente" e `operacao`/`bloqueio`
 *   não exibem (D27/R31).
 * - Um `ExerciseEntryCard` por entrada, com o `h3` na ordem de `position`.
 * - readOnly (Programa inativo) propaga: oculta handle, campos e ações
 *   (TASK-014 acceptanceCriteria 5).
 * - D8: handle de arrastar e soltar visível; soltar dispara onReorder com
 *   `orderedIds` refletindo a ordem otimista do DOM.
 *
 * NOTA DE ANTI-ALUCINAÇÃO (assinaturas): o plan.md §3 fixa os NOMES dos 8
 * callbacks repassados aos cards, mas não a lista de argumentos deles (só os do
 * ExerciseEntryCard, §3 "ExerciseEntryCard (props)"). Por isso o espelho local
 * declara esses 8 sem parâmetros (compatível com qualquer assinatura em tsc) e
 * os argumentos são travados em RUNTIME: a identidade da entrada/exercício alvo
 * deve aparecer entre os argumentos (string direta ou dentro de um objeto
 * entry/entryView), com os valores exatos do plano (quantidade, segundos,
 * série, unidade). onAdd/onRetry/onReorder têm assinatura fixada no plano e
 * são comparados com `toHaveBeenCalledWith` exato.
 */

interface WorkoutEntriesListProps {
  entries: WorkoutEntryView[];
  programId: string;
  readOnly: boolean;
  empty: boolean;
  errorMsg: string | null;
  errorOrigin: ErrorOrigin | null;
  onAdd: () => void;
  onRetry: () => void;
  onReorder: (orderedIds: string[]) => void;
  onQuantityCommit: () => void;
  onRequestReduce: () => void;
  onRestCommit: () => void;
  onSeriesCommit: () => void;
  onApplyAll: () => void;
  onEditExercise: () => void;
  onRemoveEntry: () => void;
  onConfirmUnit: () => void;
}

const PROGRAM_ID = "prog-001";
const WORKOUT_ID = "wout-001";
const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";

const MSG_VAZIO = "Nenhum exercício ainda.";
const ROTULO_HANDLE = /arrastar|reordenar|handle|segurar/i;

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: null,
    loadUnit: null,
    deletedAt: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<WorkoutEntry> = {}): WorkoutEntry {
  return {
    id: "entry-1",
    workoutId: WORKOUT_ID,
    programId: PROGRAM_ID,
    exerciseId: "ex-1",
    position: 1,
    restSeconds: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
    ...overrides,
  };
}

function makeSeries(overrides: Partial<WorkoutSeries> = {}): WorkoutSeries {
  return {
    id: "serie-1",
    entryId: "entry-1",
    position: 1,
    value: null,
    load: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
    ...overrides,
  };
}

function makeView(
  entry: WorkoutEntry,
  exercise: Exercise,
  series: WorkoutSeries[],
): WorkoutEntryView {
  return { entry, exercise, series };
}

// Duas entradas: a 1ª com unidade já escolhida (kg) e série preenchida; a 2ª
// sem unidade (loadUnit null) — é o alvo da maioria das interações, para
// provar que os callbacks carregam a identidade certa.
const SUPINO = makeExercise({ id: "ex-1", name: "Supino reto", loadUnit: "kg" });
const ROSCA = makeExercise({ id: "ex-2", name: "Rosca direta", muscle: "Braço" });

const ENTRADA_1 = makeEntry({ id: "entry-1", exerciseId: "ex-1", position: 1 });
const ENTRADA_2 = makeEntry({ id: "entry-2", exerciseId: "ex-2", position: 2 });

const SERIE_1A = makeSeries({ id: "s1", entryId: "entry-1", position: 1, value: 10, load: 40 });
const SERIE_1B = makeSeries({ id: "s2", entryId: "entry-1", position: 2 });
const SERIE_2A = makeSeries({ id: "s3", entryId: "entry-2", position: 1, value: 12 });
const SERIE_2B = makeSeries({ id: "s4", entryId: "entry-2", position: 2 });

const ENTRADAS: WorkoutEntryView[] = [
  makeView(ENTRADA_1, SUPINO, [SERIE_1A, SERIE_1B]),
  makeView(ENTRADA_2, ROSCA, [SERIE_2A, SERIE_2B]),
];

const ID_POR_NOME: Record<string, string> = {
  "Supino reto": "entry-1",
  "Rosca direta": "entry-2",
};

function base(overrides: Partial<WorkoutEntriesListProps> = {}): WorkoutEntriesListProps {
  return {
    entries: ENTRADAS,
    programId: PROGRAM_ID,
    readOnly: false,
    empty: false,
    errorMsg: null,
    errorOrigin: null,
    onAdd: vi.fn(),
    onRetry: vi.fn(),
    onReorder: vi.fn(),
    onQuantityCommit: vi.fn(),
    onRequestReduce: vi.fn(),
    onRestCommit: vi.fn(),
    onSeriesCommit: vi.fn(),
    onApplyAll: vi.fn(),
    onEditExercise: vi.fn(),
    onRemoveEntry: vi.fn(),
    onConfirmUnit: vi.fn(),
    ...overrides,
  };
}

/** Escopo do card: item de lista (mesmo padrão de WorkoutList/ProgramList). */
function cardDe(nome: string): HTMLElement {
  const titulo = screen.getByRole("heading", { level: 3, name: nome });
  const escopo = titulo.closest("li, article, [role='listitem']");
  if (!escopo) {
    throw new Error(`Card "${nome}" não está dentro de li/article/listitem`);
  }
  return escopo as HTMLElement;
}

/**
 * Campo por rótulo (label/aria-label) com fallback para placeholder.
 * O card pode conter N `SeriesCard` (uma por série), cada uma com "Repetições"
 * e "Carga" — por isso a busca é `queryAll*` e o retorno é o 1º da ordem do
 * DOM (série de menor position), que é o alvo fixado nos assertions.
 */
function campo(escopo: HTMLElement, rotulo: RegExp): HTMLElement {
  const porLabel = within(escopo).queryAllByLabelText(rotulo)[0];
  if (porLabel) return porLabel;
  const porPlaceholder = within(escopo).queryAllByPlaceholderText(rotulo)[0];
  if (porPlaceholder) return porPlaceholder;
  throw new Error(`Campo com rótulo ${rotulo} não encontrado no card`);
}

/** 1º match de uma query com suporte a múltiplos (card com N séries). */
function primeiro(resultado: HTMLElement[]): HTMLElement {
  const alvo = resultado[0];
  if (!alvo) throw new Error("Nenhum elemento encontrado");
  return alvo;
}

/** Handle de arrasto (D8): rótulo acessível arrastar/reordenar/handle. */
function handleDe(card: HTMLElement): HTMLElement | null {
  const candidatos = Array.from(
    card.querySelectorAll<HTMLElement>("[aria-label], [title], [draggable='true']"),
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

type MockLike = { mock: { calls: unknown[][] } };

/**
 * A identidade do alvo entre os argumentos da chamada: string/number direto
 * OU dentro de um objeto (entry / entryView / exercise serializado).
 */
function chamadaContemTodos(mock: MockLike, candidatos: (string | number)[]): boolean {
  const args = mock.mock.calls[0] ?? [];
  return candidatos.every((candidato) =>
    args.some((arg) => {
      if (
        typeof arg === "string" ||
        typeof arg === "number" ||
        typeof arg === "boolean"
      ) {
        return String(arg) === String(candidato);
      }
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg).includes(String(candidato));
        } catch {
          return false;
        }
      }
      return false;
    }),
  );
}

function textoNormalizado(node: HTMLElement): string {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Cards = li que contêm o h3 de um exercício conhecido (ignora li aninhados). */
function cardsDe(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll("li")).filter((li) => {
    const titulo = li.querySelector("h3")?.textContent?.trim() ?? "";
    return titulo in ID_POR_NOME;
  });
}

describe("WorkoutEntriesList", () => {
  describe("estados (AsyncState centralizado)", () => {
    it("empty mostra 'Nenhum exercício ainda.' com orientação, ação de adicionar e sem retry", () => {
      const onAdd = vi.fn();
      render(
        <WorkoutEntriesList {...base({ entries: [], empty: true, onAdd })} />,
      );

      expect(screen.getByText(MSG_VAZIO)).toBeVisible();
      // Agora há dois botões "Adicionar exercício" (sticky header + rodapé)
      const botoesAdicionar = screen.getAllByRole("button", { name: /adicionar exercício/i });
      expect(botoesAdicionar.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.queryByRole("button", { name: /tentar novamente/i }),
      ).not.toBeInTheDocument();

      fireEvent.click(botoesAdicionar[0]);
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it("erro com errorOrigin 'carga' exibe a mensagem e 'Tentar novamente' dispara onRetry", () => {
      const onRetry = vi.fn();
      render(
        <WorkoutEntriesList
          {...base({ entries: [], errorMsg: "Falha ao carregar treino", errorOrigin: "carga", onRetry })}
        />,
      );

      expect(screen.getByText("Falha ao carregar treino")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it.each(["operacao", "bloqueio"] as ErrorOrigin[])(
      "erro com errorOrigin '%s' exibe a mensagem SEM 'Tentar novamente' e mantém as entradas visíveis",
      (origem) => {
        const onRetry = vi.fn();
        render(
          <WorkoutEntriesList
            {...base({
              errorMsg: "Este exercício já está em um treino deste programa. Escolha outro exercício.",
              errorOrigin: origem,
              onRetry,
            })}
          />,
        );

        expect(
          screen.getByText(
            "Este exercício já está em um treino deste programa. Escolha outro exercício.",
          ),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /tentar novamente/i }),
        ).not.toBeInTheDocument();
        expect(onRetry).not.toHaveBeenCalled();
        // O banner nunca esconde o conteúdo (D27/R31).
        expect(screen.getByRole("heading", { level: 3, name: "Supino reto" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 3, name: "Rosca direta" })).toBeInTheDocument();
      },
    );
  });

  describe("renderização das entradas (ordem de position)", () => {
    it("renderiza um card por entrada, com os h3 na ordem de position", () => {
      const { container } = render(<WorkoutEntriesList {...base()} />);

      const nomes = Object.keys(ID_POR_NOME);
      const titulos = screen
        .getAllByRole("heading", { level: 3 })
        .map((h) => textoNormalizado(h))
        .filter((texto) => nomes.includes(texto));

      expect(titulos).toEqual(["Supino reto", "Rosca direta"]);
      // Cada entrada mora no seu próprio card (li) — um por entrada.
      expect(cardsDe(container)).toHaveLength(ENTRADAS.length);
      expect(cardDe("Supino reto")).toBeInTheDocument();
      expect(cardDe("Rosca direta")).toBeInTheDocument();
    });

    it("o card expõe o nome do exercício como h3 com o token font-display", () => {
      render(<WorkoutEntriesList {...base()} />);

      const titulo = screen.getByRole("heading", { level: 3, name: "Supino reto" });
      expect(titulo.tagName).toBe("H3");
      expect(titulo.className).toMatch(/font-display/);
    });
  });

  describe("readOnly (Programa inativo) propaga para os cards", () => {
    it("oculta handle, campos e ações em todos os cards", () => {
      const { container } = render(<WorkoutEntriesList {...base({ readOnly: true })} />);

      const cards = cardsDe(container);
      expect(cards).toHaveLength(ENTRADAS.length);
      cards.forEach((card) => {
        expect(handleDe(card)).toBeNull();
        expect(within(card).queryByRole("button", { name: /editar/i })).toBeNull();
        expect(within(card).queryByRole("button", { name: /excluir/i })).toBeNull();
        expect(within(card).queryByLabelText(/séries/i)).toBeNull();
        expect(within(card).queryByLabelText(/descanso/i)).toBeNull();
        expect(
          within(card).queryByRole("button", { name: /aplicar a todas/i }),
        ).toBeNull();
      });
    });

    it("sem readOnly, o handle de arrastar e soltar fica visível (D8)", () => {
      const { container } = render(<WorkoutEntriesList {...base()} />);

      const cards = cardsDe(container);
      expect(cards.length).toBeGreaterThan(0);
      expect(handleDe(cards[0])).not.toBeNull();
    });
  });

  describe("reordenação por arrastar e soltar (D8)", () => {
    it("soltar no handle dispara onReorder com orderedIds na ordem das entradas", () => {
      const onReorder = vi.fn();
      const { container } = render(<WorkoutEntriesList {...base({ onReorder })} />);

      // Geometria determinística em jsdom (sem layout): cada card ocupa uma
      // faixa de 100px na ordem do DOM — é o que permite a implementação
      // detectar o alvo do ponteiro sem APIs de layout ausentes no jsdom.
      const originalRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function (this: Element) {
        const indice = cardsDe(container).findIndex(
          (card) => card === this || card.contains(this),
        );
        const top = indice < 0 ? 0 : indice * 100;
        return {
          x: 0,
          y: top,
          top,
          bottom: top + 100,
          left: 0,
          right: 320,
          width: 320,
          height: 100,
          toJSON: () => ({}),
        } as DOMRect;
      };

      try {
        const card = cardsDe(container)[0];
        const handle = handleDe(card);
        expect(handle).not.toBeNull();

        fireEvent(
          handle as Element,
          new MouseEvent("pointerdown", { bubbles: true, clientX: 20, clientY: 30 }),
        );
        fireEvent(
          handle as Element,
          new MouseEvent("pointermove", { bubbles: true, clientX: 20, clientY: 260 }),
        );
        fireEvent(
          handle as Element,
          new MouseEvent("pointerup", { bubbles: true, clientX: 20, clientY: 260 }),
        );

        expect(onReorder).toHaveBeenCalledTimes(1);
        // O orderedIds entregue no soltar reflete a ordem que está no DOM
        // (reordenação otimista) e contém todos os ids do treino.
        expect(onReorder).toHaveBeenCalledWith(idsNaOrdemDoDOM());
        expect(new Set(onReorder.mock.calls[0][0] as string[])).toEqual(
          new Set(["entry-1", "entry-2"]),
        );
      } finally {
        Element.prototype.getBoundingClientRect = originalRect;
      }
    });
  });

  describe("callbacks repassados aos cards disparam com a entrada e os valores certos", () => {
    it("quantidade commitada dispara onQuantityCommit com a entrada alvo e a quantidade", () => {
      const onQuantityCommit = vi.fn();
      render(
        <WorkoutEntriesList {...base({ onQuantityCommit })} />,
      );

      const card = cardDe("Rosca direta");
      const campoQuantidade = campo(card, /séries/i);
      fireEvent.change(campoQuantidade, { target: { value: "5" } });
      fireEvent.blur(campoQuantidade);

      expect(onQuantityCommit).toHaveBeenCalledTimes(1);
      expect(chamadaContemTodos(onQuantityCommit, ["entry-2", 5])).toBe(true);
    });

    it("redução com série preenchida dispara onRequestReduce com a entrada alvo e a nova quantidade", () => {
      const onRequestReduce = vi.fn();
      render(<WorkoutEntriesList {...base({ onRequestReduce })} />);

      const card = cardDe("Rosca direta");
      const campoQuantidade = campo(card, /séries/i);
      fireEvent.change(campoQuantidade, { target: { value: "1" } });
      fireEvent.blur(campoQuantidade);

      expect(onRequestReduce).toHaveBeenCalledTimes(1);
      expect(chamadaContemTodos(onRequestReduce, ["entry-2", 1])).toBe(true);
    });

    it("descanso commitado dispara onRestCommit com a entrada alvo e os segundos", () => {
      const onRestCommit = vi.fn();
      render(<WorkoutEntriesList {...base({ onRestCommit })} />);

      const card = cardDe("Rosca direta");
      const campoDescanso = campo(card, /descanso/i);
      fireEvent.change(campoDescanso, { target: { value: "90" } });
      fireEvent.blur(campoDescanso);

      expect(onRestCommit).toHaveBeenCalledTimes(1);
      expect(chamadaContemTodos(onRestCommit, ["entry-2", 90])).toBe(true);
    });

    it("campo de série commita onSeriesCommit com série, campo e valor exatos", () => {
      const onSeriesCommit = vi.fn();
      render(<WorkoutEntriesList {...base({ onSeriesCommit })} />);

      const card = cardDe("Rosca direta");
      const campoRepeticoes = campo(card, /repetições/i);
      fireEvent.change(campoRepeticoes, { target: { value: "8" } });
      fireEvent.blur(campoRepeticoes);

      expect(onSeriesCommit).toHaveBeenCalledTimes(1);
      // Assinatura do card é (seriesId, field, value); a lista pode repassar
      // direto ou embrulhar com a entrada — os 3 argumentos fixados pelo plano
      // têm de aparecer de qualquer forma.
      expect(chamadaContemTodos(onSeriesCommit, ["s3", "value", 8])).toBe(true);
    });

    it("'Aplicar a todas' dispara onApplyAll com a entrada e a série de origem", () => {
      const onApplyAll = vi.fn();
      render(<WorkoutEntriesList {...base({ onApplyAll })} />);

      const card = cardDe("Rosca direta");
      // 1 botão "Aplicar a todas" por SeriesCard (2 séries → 2 botões); o 1º
      // da ordem do DOM é o da série s3, fixada no assertion abaixo.
      fireEvent.click(
        primeiro(
          within(card).getAllByRole("button", { name: /aplicar a todas/i }),
        ),
      );

      expect(onApplyAll).toHaveBeenCalledTimes(1);
      expect(chamadaContemTodos(onApplyAll, ["entry-2", "s3"])).toBe(true);
    });

    it("'Editar' dispara onEditExercise identificando a entrada/exercício alvo", () => {
      const onEditExercise = vi.fn();
      render(<WorkoutEntriesList {...base({ onEditExercise })} />);

      fireEvent.click(within(cardDe("Rosca direta")).getByRole("button", { name: /editar/i }));

      expect(onEditExercise).toHaveBeenCalledTimes(1);
      expect(chamadaContemTodos(onEditExercise, ["entry-2"])).toBe(true);
    });

    it("'Excluir' dispara onRemoveEntry identificando a entrada/exercício alvo", () => {
      const onRemoveEntry = vi.fn();
      render(<WorkoutEntriesList {...base({ onRemoveEntry })} />);

      fireEvent.click(within(cardDe("Rosca direta")).getByRole("button", { name: /excluir/i }));

      expect(onRemoveEntry).toHaveBeenCalledTimes(1);
      expect(chamadaContemTodos(onRemoveEntry, ["entry-2"])).toBe(true);
    });

    it("carga com loadUnit null commita direto e o toggle inline dispara onConfirmUnit (sem prompt âmbar)", () => {
      const onConfirmUnit = vi.fn();
      const onSeriesCommit = vi.fn();
      render(<WorkoutEntriesList {...base({ onConfirmUnit, onSeriesCommit })} />);

      // Exercício sem unidade (Rosca direta, loadUnit null) + carga digitada.
      const card = cardDe("Rosca direta");
      const campoCarga = campo(card, /carga/i);
      fireEvent.change(campoCarga, { target: { value: "45" } });
      fireEvent.blur(campoCarga);

      // Carga commita direto (sem prompt âmbar na UI).
      expect(
        within(card).queryByText("Escolha a unidade da carga: kg ou lb."),
      ).not.toBeInTheDocument();
      expect(onSeriesCommit).toHaveBeenCalled();
      expect(
        chamadaContemTodos(onSeriesCommit, ["entry-2", "load", 45]),
      ).toBe(true);

      // Toggle inline kg/lb dispara onConfirmUnit com a unidade escolhida.
      // O card tem 2 séries (2 pares kg/lb) — usa o primeiro par.
      const botoesLb = within(card).getAllByRole("button", { name: /^lb$/i });
      fireEvent.click(botoesLb[0]);
      expect(onConfirmUnit).toHaveBeenCalledTimes(1);
      // O plan.md §3 não fixa a lista de argumentos de onConfirmUnit (só o
      // nome); o que é inegociável é que a unidade escolhida e a entrada
      // cheguem ao callback.
      expect(chamadaContemTodos(onConfirmUnit, ["entry-2", "lb"])).toBe(true);
    });
  });

  /**
   * Contrato RED (correção 2026-10-08) — Mílon #5 Execução série a série:
   * repasse do pacote de execução com card clicável.
   *
   * Fonte: plan.md §2 (WorkoutEntriesList repassa o pacote para cada
   * ExerciseEntryCard; sem ele renderiza idêntico a hoje) + §3 (aceita o
   * pacote como prop opcional e o repassa sem interpretar) + spec §3
   * alinhada (card é o próprio marcador; SEM checkbox; SEM botão de editar;
   * marcada com fundo na cor do módulo) + tasks.json TASK-005.
   *
   * CONTRATO FIXADO AQUI (mesmo da SeriesCard): prop opcional
   * `execution?: { doneBySeriesId: Record<string, boolean>;
   * onToggle: (seriesId: string) => void;
   * onOpenEditor: (seriesId: string) => void }`.
   * Em execução cada série é um `role="button"` ("Série N"), sem checkbox e
   * sem botão "Editar".
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

    it("sem pacote renderiza idêntico a hoje (sem cards clicáveis)", () => {
      render(<WorkoutEntriesList {...base()} />);

      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(
        screen.queryByRole("button", { name: /^série [12]/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Supino reto")).toBeInTheDocument();
    });

    it("com pacote cada série é um card clicável, sem checkbox, com chrome de manutenção visível (replano D14)", () => {
      render(
        <WorkoutEntriesList
          {...( {
            ...base(),
            execution: exec(),
          } as unknown as WorkoutEntriesListProps )}
        />,
      );

      // 2 entradas × 2 séries = 4 cards clicáveis.
      expect(screen.getAllByRole("button", { name: /^série [12]/i })).toHaveLength(4);
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(screen.getAllByRole("button", { name: /editar/i })).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: /excluir/i })).toHaveLength(2);
    });

    it("com pacote o toque curto no card chega ao onToggle com o id da série", () => {
      const onToggle = vi.fn();
      render(
        <WorkoutEntriesList
          {...( {
            ...base(),
            execution: exec({ onToggle }),
          } as unknown as WorkoutEntriesListProps )}
        />,
      );

      fireEvent.click(screen.getAllByRole("button", { name: /^série [12]/i })[2]);

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith("s3");
    });
  });
});

/** Ids das entradas na ordem em que os cards estão no DOM (pós-otimismo). */
function idsNaOrdemDoDOM(): string[] {
  const nomes = Object.keys(ID_POR_NOME);
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((h) => textoNormalizado(h))
    .filter((texto) => nomes.includes(texto))
    .map((texto) => ID_POR_NOME[texto]);
}
