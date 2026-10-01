import fs from "node:fs";
import path from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExerciseList from "@/components/milon/ExerciseList";
import type { Exercise } from "@/lib/milon/types";

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: "https://video.exemplo/supino",
    createdAt: "2026-09-12T00:00:00Z",
    created_by: "a@hestia.com",
    ...overrides,
  };
}

function defaultProps(overrides = {}) {
  return {
    visibleItems: [makeExercise()],
    remainingCount: 0,
    muscleOptions: ["Peito", "Perna"],
    muscleFilter: "",
    searchText: "",
    loading: false,
    error: null as string | null,
    errorOrigin: null,
    isEmpty: false,
    onFilterChange: vi.fn(),
    onSearchChange: vi.fn(),
    onShowMore: vi.fn(),
    onRetry: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

describe("ExerciseList", () => {
  it("renderiza título da seção com itens ordenados, nome, músculo e acesso ao vídeo", () => {
    const items = [
      makeExercise({ id: "2", name: "Rosca direta", muscle: "Braço", videoLink: null }),
      makeExercise({ id: "1", name: "Supino reto", muscle: "Peito" }),
    ];
    render(<ExerciseList {...defaultProps({ visibleItems: items })} />);

    expect(screen.getByRole("heading", { name: /exercícios/i })).toBeInTheDocument();
    expect(screen.getByText("Supino reto")).toBeInTheDocument();
    expect(screen.getAllByText("Peito").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /ver vídeo/i })).toHaveAttribute(
      "href",
      "https://video.exemplo/supino",
    );
  });

  it("não mostra acesso ao vídeo para item sem link", () => {
    const items = [
      makeExercise({ id: "2", name: "Agachamento", muscle: "Perna", videoLink: null }),
    ];
    render(<ExerciseList {...defaultProps({ visibleItems: items })} />);

    expect(screen.getByText("Agachamento")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ver vídeo/i })).not.toBeInTheDocument();
  });

  it("conecta filtro por músculo com opção de limpar e busca livre aos callbacks", () => {
    const onFilterChange = vi.fn();
    const onSearchChange = vi.fn();
    render(
      <ExerciseList
        {...defaultProps({ onFilterChange, onSearchChange, muscleFilter: "Peito" })}
      />,
    );

    const filter = screen.getByLabelText(/filtrar por músculo/i);
    fireEvent.change(filter, { target: { value: "" } });
    expect(onFilterChange).toHaveBeenCalledWith("");

    const search = screen.getByLabelText(/buscar exercício/i);
    fireEvent.change(search, { target: { value: "sup" } });
    expect(onSearchChange).toHaveBeenCalledWith("sup");
  });

  it("mostra ação de mostrar-mais indicando restantes e some ao esgotar", () => {
    const onShowMore = vi.fn();
    const { rerender } = render(
      <ExerciseList {...defaultProps({ remainingCount: 7, onShowMore })} />,
    );

    const moreButton = screen.getByRole("button", { name: /mostrar mais \(7 restantes\)/i });
    fireEvent.click(moreButton);
    expect(onShowMore).toHaveBeenCalledTimes(1);

    rerender(<ExerciseList {...defaultProps({ remainingCount: 0 })} />);
    expect(
      screen.queryByRole("button", { name: /mostrar mais/i }),
    ).not.toBeInTheDocument();
  });

  it("mostra biblioteca vazia com orientação de criar o primeiro, sem erro", () => {
    render(
      <ExerciseList {...defaultProps({ visibleItems: [], isEmpty: true })} />,
    );

    expect(screen.getByText(/nenhum exercício cadastrado/i)).toBeInTheDocument();
    expect(screen.queryByText(/tente novamente/i)).not.toBeInTheDocument();
  });

  it("mostra indicador de carregamento", () => {
    render(<ExerciseList {...defaultProps({ loading: true, visibleItems: [] })} />);

    expect(screen.getByText(/carregando exercícios/i)).toBeInTheDocument();
  });

  it("mostra erro com tentar-de-novo que dispara retry", () => {
    const onRetry = vi.fn();
    render(
      <ExerciseList
        {...defaultProps({ error: "Falha ao buscar", onRetry, visibleItems: [] })}
      />,
    );

    expect(screen.getByText(/falha ao buscar/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("mostra mensagem de sem-resultado distinta da mensagem de vazia", () => {
    render(
      <ExerciseList
        {...defaultProps({ visibleItems: [], isEmpty: false, searchText: "zzz" })}
      />,
    );

    expect(screen.getByText(/nada encontrado/i)).toBeInTheDocument();
    expect(screen.queryByText(/nenhum exercício cadastrado/i)).not.toBeInTheDocument();
  });

  it("dispara editar e excluir por item", () => {
    const item = makeExercise();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ExerciseList {...defaultProps({ visibleItems: [item], onEdit, onDelete })} />);

    fireEvent.click(screen.getByRole("button", { name: /editar supino reto/i }));
    expect(onEdit).toHaveBeenCalledWith(item);

    fireEvent.click(screen.getByRole("button", { name: /excluir supino reto/i }));
    expect(onDelete).toHaveBeenCalledWith(item);
  });

  describe("adendo UX v2 — lista compacta, link marrom claro, Ordenar por", () => {
    it("apresentação compacta/densa: item sem excesso de espaço, com toque confortável nas ações", () => {
      const item = makeExercise();
      const { container } = render(
        <ExerciseList {...defaultProps({ visibleItems: [item] })} />,
      );

      const listItem = container.querySelector("li");
      expect(listItem).not.toBeNull();
      // Compacto: sem o padding espaçado anterior (p-4) — denso mobile-first.
      expect(listItem!.className).not.toMatch(/(?:^|\s)p-4(?:\s|$)/);
      expect(listItem!.className).toMatch(/py-2/);

      // Toque confortável: cada ação com alvo mínimo de 40px.
      const editButton = screen.getByRole("button", { name: /editar supino reto/i });
      expect(editButton.className).toMatch(/min-h-10/);
      expect(editButton.className).toMatch(/min-w-10/);
      const deleteButton = screen.getByRole("button", { name: /excluir supino reto/i });
      expect(deleteButton.className).toMatch(/min-h-10/);
      expect(deleteButton.className).toMatch(/min-w-10/);
    });

    it("link 'ver vídeo' em marrom visivelmente mais claro que os títulos #B7602B", () => {
      // Tom escolhido por Hefesto: #C2703D — derivação clara do terracota
      // (luminância maior que #B7602B, contraste 3.7:1 sobre fundo claro + sublinhado).
      const item = makeExercise();
      render(<ExerciseList {...defaultProps({ visibleItems: [item] })} />);

      const link = screen.getByRole("link", { name: /ver vídeo/i });
      expect(link.className).toMatch(/text-\[#C2703D\]/);
      expect(link.className).not.toMatch(/text-sky-700/);
    });

    it("controle 'Ordenar por' com opções Nome e Músculo, padrão Músculo", () => {
      const onSortChange = vi.fn();
      render(
        <ExerciseList
          {...defaultProps({ sortOrder: "muscle", onSortChange })}
        />,
      );

      const control = screen.getByLabelText(/ordenar por/i);
      expect(control).toBeInTheDocument();
      const options = Array.from(control.querySelectorAll("option")).map(
        (option) => option.textContent,
      );
      expect(options).toEqual(expect.arrayContaining(["Nome", "Músculo"]));
      expect(control).toHaveValue("muscle");
    });

    it("trocar a ordenação no controle dispara onSortChange", () => {
      const onSortChange = vi.fn();
      render(
        <ExerciseList
          {...defaultProps({ sortOrder: "muscle", onSortChange })}
        />,
      );

      fireEvent.change(screen.getByLabelText(/ordenar por/i), {
        target: { value: "name" },
      });
      expect(onSortChange).toHaveBeenCalledWith("name");
    });
  });
});

// ---------------------------------------------------------------------------
// Patch v5 (D21, D23, R24–R26) — ADOÇÃO DO AsyncState NO ExerciseList
// Contrato RED da TASK-038. Fonte: spec.md "Patch v5" (D19, D20, D21, D23,
// CA-P5-1, CA-P5-3, CA-P5-5, CA-P5-6, CA-P5-7) + plan.md "Patch v5" §2 alvos
// (ExerciseList — cadeia "a partir da linha 95") e §3 contratos
// ("ExerciseList (mudança de contrato interno)" e "Página da biblioteca") +
// tasks.json TASK-038 acceptanceCriteria 2.
//
// CONTRATO CONSUMIDO (ainda INEXISTENTE na produção):
//   - prop OBRIGATÓRIA `errorOrigin` anulável — espelhada aqui num tipo local
//     para o tsc --noEmit seguir verde até a TASK-039 (mesmo precedente de
//     ProgramList.test.tsx na TASK-022);
//   - a cadeia ternária (loading → error com retry próprio → empty →
//     noResults → lista) vira composição de `components/ui/AsyncState`, com
//     "Tentar novamente" DERIVADO DA ORIGEM dentro do componente: `carga` e
//     origem ausente/nula com retry; `operacao`/`bloqueio` só com a mensagem
//     (CA-P5-3);
//   - banner ACIMA da lista: sob erro os itens permanecem visíveis
//     (CA-P5-1 na biblioteca);
//   - textos de carregamento/vazio/no-results idênticos aos de hoje
//     (CA-P5-5).
//
// STATUS: RED esperado (TASK-039/Hefesto torna verde, sem mexer neste
// arquivo). Hoje o componente não lê origem alguma: `operacao`/`bloqueio`
// ainda exibem o retry próprio (falha: "o botão não deveria existir") e a
// mensagem de erro SUBSTITUI a lista (falha: "título do item fora do
// documento") — comportamento esperado, não erro de sintaxe. Os demais
// cenários são travas de regressão verdes antes e depois (CA-P5-5).
// ---------------------------------------------------------------------------

type ExerciseErrorOrigin = "carga" | "operacao" | "bloqueio";

/** Espelho local do contrato de props (plan §3) + a prop nova `errorOrigin`. */
interface ExerciseListContractProps {
  visibleItems: Exercise[];
  remainingCount: number;
  muscleOptions: string[];
  muscleFilter: string;
  searchText: string;
  loading: boolean;
  error: string | null;
  errorOrigin: ExerciseErrorOrigin | null;
  isEmpty: boolean;
  onFilterChange: (muscle: string) => void;
  onSearchChange: (text: string) => void;
  onShowMore: () => void;
  onRetry: () => void;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}

/** Defaults homologados + origem anulável (default da base = ausente ⇒ carga). */
function contratoProps(
  overrides: Partial<ExerciseListContractProps> = {},
): ExerciseListContractProps {
  return { ...defaultProps(), errorOrigin: null, ...overrides };
}

/** O nó `earlier` aparece antes de `later` na árvore (banner ACIMA). */
function expectAppearsBefore(earlier: HTMLElement, later: HTMLElement): void {
  const position = earlier.compareDocumentPosition(later);
  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

describe("Patch v5 — banner acima da lista e retry por origem (TASK-038 RED)", () => {
  const MENSAGEM_CARGA = "Falha ao buscar exercícios";
  const MENSAGEM_OPERACAO = "Erro ao excluir exercício";
  const MENSAGEM_BLOQUEIO = "Adicione pelo menos um treino com exercícios para ativar";
  const ITEM = "Supino reto";

  it("CA-P5-3: error + 'carga' renderiza a mensagem e 'Tentar novamente', que dispara onRetry", () => {
    const onRetry = vi.fn();
    render(
      <ExerciseList
        {...contratoProps({
          error: MENSAGEM_CARGA,
          errorOrigin: "carga",
          visibleItems: [],
          onRetry,
        })}
      />,
    );

    expect(screen.getByText(MENSAGEM_CARGA)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("D20/CA-P5-3: errorOrigin NULO é tratado como carga — 'Tentar novamente' dispara onRetry", () => {
    const onRetry = vi.fn();
    render(
      <ExerciseList
        {...contratoProps({
          error: MENSAGEM_CARGA,
          errorOrigin: null,
          visibleItems: [],
          onRetry,
        })}
      />,
    );

    expect(screen.getByText(MENSAGEM_CARGA)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("CA-P5-3: error + 'operacao' renderiza a mensagem SEM o botão 'Tentar novamente'", () => {
    const onRetry = vi.fn();
    render(
      <ExerciseList
        {...contratoProps({
          error: MENSAGEM_OPERACAO,
          errorOrigin: "operacao",
          visibleItems: [],
          onRetry,
        })}
      />,
    );

    // A mensagem continua visível (CA-P5-5), mas o retry é exclusivo da carga.
    expect(screen.getByText(MENSAGEM_OPERACAO)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("CA-P5-3: error + 'bloqueio' renderiza a mensagem SEM o botão 'Tentar novamente'", () => {
    const onRetry = vi.fn();
    render(
      <ExerciseList
        {...contratoProps({
          error: MENSAGEM_BLOQUEIO,
          errorOrigin: "bloqueio",
          visibleItems: [],
          onRetry,
        })}
      />,
    );

    expect(screen.getByText(MENSAGEM_BLOQUEIO)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("CA-P5-1: error + 'operacao' com itens => banner ACIMA, lista visível e sem retry", () => {
    const onRetry = vi.fn();
    render(
      <ExerciseList
        {...contratoProps({
          visibleItems: [makeExercise({ id: "ex-1", name: ITEM })],
          error: MENSAGEM_OPERACAO,
          errorOrigin: "operacao",
          isEmpty: false,
          onRetry,
        })}
      />,
    );

    const banner = screen.getByText(MENSAGEM_OPERACAO);
    // R24/CA-P5-1: a lista permanece visível e legível sob o erro…
    const item = screen.getByText(ITEM);
    expectAppearsBefore(banner, item);
    // …sem retry (origem `operacao`)…
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
    // …e os filtros seguem fora da região de estados (R26).
    expect(screen.getByLabelText(/filtrar por músculo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/buscar exercício/i)).toBeInTheDocument();
  });

  it("CA-P5-1/CA-P5-3: error de carga com itens => banner com 'Tentar novamente' ACIMA e a lista visível", () => {
    const onRetry = vi.fn();
    render(
      <ExerciseList
        {...contratoProps({
          visibleItems: [makeExercise({ id: "ex-1", name: ITEM })],
          error: MENSAGEM_CARGA,
          errorOrigin: "carga",
          isEmpty: false,
          onRetry,
        })}
      />,
    );

    const banner = screen.getByText(MENSAGEM_CARGA);
    const item = screen.getByText(ITEM);
    expectAppearsBefore(banner, item);

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("precedência D19: loading verdadeiro vence erro — só 'Carregando exercícios...'", () => {
    render(
      <ExerciseList
        {...contratoProps({
          loading: true,
          visibleItems: [makeExercise({ id: "ex-1", name: ITEM })],
          error: MENSAGEM_OPERACAO,
          errorOrigin: "operacao",
          isEmpty: false,
        })}
      />,
    );

    expect(screen.getByText("Carregando exercícios...")).toBeInTheDocument();
    expect(screen.queryByText(MENSAGEM_OPERACAO)).not.toBeInTheDocument();
    expect(screen.queryByText(ITEM)).not.toBeInTheDocument();
  });

  it("falha de carga SEM itens => somente o banner com retry, sem 'Nenhum exercício cadastrado ainda.'", () => {
    const onRetry = vi.fn();
    render(
      <ExerciseList
        {...contratoProps({
          visibleItems: [],
          error: MENSAGEM_CARGA,
          errorOrigin: "carga",
          isEmpty: true,
          onRetry,
        })}
      />,
    );

    expect(screen.getByText(MENSAGEM_CARGA)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /tentar novamente/i }),
    ).toBeInTheDocument();
    // D19d: falha de carga nunca chega a dizer "nenhum item".
    expect(screen.queryByText("Nenhum exercício cadastrado ainda.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Crie o primeiro exercício da biblioteca para começar."),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("CA-P5-5: os textos de carregamento, vazio e no-results permanecem literais", () => {
    const { rerender } = render(
      <ExerciseList {...contratoProps({ loading: true, visibleItems: [] })} />,
    );
    expect(screen.getByText("Carregando exercícios...")).toBeInTheDocument();

    rerender(
      <ExerciseList
        {...contratoProps({ loading: false, isEmpty: true, visibleItems: [] })}
      />,
    );
    expect(screen.getByText("Nenhum exercício cadastrado ainda.")).toBeInTheDocument();
    expect(
      screen.getByText("Crie o primeiro exercício da biblioteca para começar."),
    ).toBeInTheDocument();

    rerender(
      <ExerciseList
        {...contratoProps({ loading: false, isEmpty: false, visibleItems: [] })}
      />,
    );
    expect(screen.getByText("Nada encontrado para essa combinação.")).toBeInTheDocument();
    expect(
      screen.getByText("Ajuste os filtros ou crie o exercício na biblioteca."),
    ).toBeInTheDocument();
  });
});

/** Fonte do componente (mesmo padrão de leitura de page.test.tsx). */
function exerciseListSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../components/milon/ExerciseList.tsx"),
    "utf8",
  );
}

/** Fonte do componente centralizado. */
function asyncStateSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../components/ui/AsyncState.tsx"),
    "utf8",
  );
}

describe("TASK-039 — critérios de substituição (buscas por placeholder → 0)", () => {
  it("CA-P5-7: 'Tentar novamente' em components/milon/ExerciseList.tsx => 0 ocorrências", () => {
    expect(exerciseListSource().split("Tentar novamente").length - 1).toBe(0);
  });

  it("D21/R26: ExerciseList compõe o AsyncState (import de '@/components/ui/AsyncState')", () => {
    expect(exerciseListSource()).toMatch(/from\s+["']@\/components\/ui\/AsyncState["']/);
  });

  it("CA-P5-7 (reafirmação): 'lib/milon' em components/ui/AsyncState.tsx => 0 ocorrências", () => {
    expect(asyncStateSource().split("lib/milon").length - 1).toBe(0);
  });
});
