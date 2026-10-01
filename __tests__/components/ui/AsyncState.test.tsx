import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import type { ErrorOrigin } from "@/lib/shared";
import * as AsyncStateModule from "@/components/ui/AsyncState";

/**
 * Contrato (TASK-032 RED → TASK-033 GREEN) — plan.md "Patch v5" §3
 * "AsyncState (props)" + "AsyncState (precedência fixa — D19)" e spec.md Patch v5
 * (D18–D22, R22–R25, CA-P5-2, CA-P5-3, CA-P5-4).
 *
 * Props do componente (plan §3, literal):
 * - `loading` (booleano), `error` (string anulável), `errorOrigin`
 *   (`ErrorOrigin` de `@/lib/shared`, OPCIONAL — ausente ou nulo tratado como
 *   `carga`), `empty` (booleano), `noResults` (booleano), `onRetry` (função),
 *   `loadingText`, `emptyTitle`, `emptyText`, `noResultsTitle`, `noResultsText`
 *   (strings com os textos exatos da tela) e `children` (região de conteúdo).
 *
 * Precedência fixa D19 (spec D19, plan §3, CA-P5-2):
 * (1) `loading` verdadeiro ⇒ a região mostra SOMENTE `loadingText` — sem banner,
 *     sem vazio, sem no-results, sem `children`;
 * (2) havendo `error` ⇒ banner com a mensagem renderizado ACIMA da região
 *     (R24 — nunca substitui o conteúdo; sob erro `children` permanece visível);
 * (3) `error` SEM `children` ⇒ somente o banner — nunca vazio/no-results sob
 *     erro (D19d);
 * (4) sem erro ⇒ `empty` prevalece sobre `noResults`; depois `noResults`;
 *     senão, região vazia.
 *
 * Retry por origem D20/R25/CA-P5-3: "Tentar novamente" SOMENTE para
 * `errorOrigin === 'carga'` OU origem ausente/nula; `operacao`/`bloqueio`
 * exibem só a mensagem. O rótulo é único: "Tentar novamente" (plan §3).
 *
 * D22 (YAGNI): o componente NÃO tem botão de fechar — em erro de carga existe
 * exatamente UM botão (o retry); nos demais estados, nenhum (CA-P5-4).
 *
 * CA-P5-4: nenhum ramo do contrato fica sem asserção — 4 estados, as 4 entradas
 * de origem (`carga`, `operacao`, `bloqueio`, ausente) + nula, presença e
 * ausência do retry, lista visível sob erro e os 5 textos repassados literais.
 *
 * Export: o contrato não fixa default × nomeado (plan §3 só diz "componente
 * presentacional"); o teste aceita os dois, como nos demais componentes.
 *
 * RED esperado (motivo): `components/ui/AsyncState.tsx` não existe —
 * components/ui/ hoje só tem button/input/label. Falha de resolução de módulo,
 * não de sintaxe. Condição de RED da TASK-033.
 */

type AsyncStateComponent = (props: AsyncStateProps) => ReactElement | null;

interface AsyncStateProps {
  loading: boolean;
  error: string | null;
  errorOrigin?: ErrorOrigin | null;
  empty: boolean;
  noResults: boolean;
  onRetry: () => void;
  loadingText: string;
  emptyTitle: string;
  emptyText: string;
  noResultsTitle: string;
  noResultsText: string;
  children?: ReactNode;
}

const mod = AsyncStateModule as unknown as {
  default?: AsyncStateComponent;
  AsyncState?: AsyncStateComponent;
};
const AsyncState = (mod.default ?? mod.AsyncState) as AsyncStateComponent;

// Textos customizados de propósito: só passam se o componente repassar LITERAIS
// das props (default dele não bateria) — CA-P5-4.
const TEXTOS = {
  loadingText: "Carregando itens de teste…",
  emptyTitle: "Nenhum item de teste cadastrado.",
  emptyText: "Crie o primeiro item de teste para começar.",
  noResultsTitle: "Nada de teste encontrado para essa combinação.",
  noResultsText: "Ajuste os filtros de teste para ver mais itens.",
};

const MENSAGEM = "Falha ao carregar os itens de teste";

const TODAS_LINHAS_TEXTOS = [
  /Carregando itens de teste/,
  /Nenhum item de teste cadastrado/,
  /Crie o primeiro item de teste/,
  /Nada de teste encontrado/,
  /Ajuste os filtros de teste/,
  /Falha ao carregar os itens de teste/,
];

function conteudoChildren(): ReactNode {
  return (
    <ul data-testid="conteudo-lista">
      <li>Item Alpha</li>
      <li>Item Beta</li>
    </ul>
  );
}

/**
 * Defaults SEM `errorOrigin` de propósito: a ausência da prop é uma das quatro
 * entradas de origem do contrato (ausente ⇒ `carga`, D20) e precisa ser
 * exercitável sem spread de `undefined`.
 */
function defaultProps(overrides: Partial<AsyncStateProps> = {}): AsyncStateProps {
  return {
    loading: false,
    error: null,
    empty: false,
    noResults: false,
    onRetry: vi.fn(),
    ...TEXTOS,
    ...overrides,
  };
}

function renderAsync(overrides: Partial<AsyncStateProps> = {}) {
  const props = defaultProps(overrides);
  return { ...render(<AsyncState {...props} />), onRetry: props.onRetry };
}

function expectNenhumTextoDeEstado() {
  for (const padrao of TODAS_LINHAS_TEXTOS) {
    expect(screen.queryByText(padrao)).not.toBeInTheDocument();
  }
}

describe("precedência fixa dos 4 estados — D19 / R23 / CA-P5-2", () => {
  it("loading verdadeiro mostra SOMENTE o loadingText: sem banner, sem vazio, sem no-results e sem children", () => {
    renderAsync({
      loading: true,
      error: MENSAGEM,
      errorOrigin: "carga",
      empty: true,
      noResults: true,
      children: conteudoChildren(),
    });

    // (1) loading ocupa a região sozinho (D19a).
    expect(screen.getByText(/Carregando itens de teste/)).toBeInTheDocument();
    expect(screen.queryByText(/Falha ao carregar os itens de teste/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nenhum item de teste cadastrado/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nada de teste encontrado/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ajuste os filtros de teste/)).not.toBeInTheDocument();
    // Nem o conteúdo, nem retry (loading vence o erro).
    expect(screen.queryByTestId("conteudo-lista")).not.toBeInTheDocument();
    expect(screen.queryByText("Item Alpha")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("erro com children: banner ACIMA da região e o conteúdo permanece visível (R24 / CA-P5-1)", () => {
    const { container } = renderAsync({
      error: MENSAGEM,
      errorOrigin: "bloqueio",
      children: conteudoChildren(),
    });

    // Banner com a mensagem presente...
    const banner = screen.getByText(/Falha ao carregar os itens de teste/);
    // ...e o conteúdo continua renderizado (o erro nunca substitui a lista).
    expect(screen.getByTestId("conteudo-lista")).toBeInTheDocument();
    expect(screen.getByText("Item Alpha")).toBeInTheDocument();
    expect(screen.getByText("Item Beta")).toBeInTheDocument();

    // E o banner vem ANTES do conteúdo no DOM (renderizado ACIMA).
    expect(
      banner.compareDocumentPosition(screen.getByTestId("conteudo-lista")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    // Carregando/vazio/no-results nunca aparecem junto do erro.
    expect(screen.queryByText(/Carregando itens de teste/)).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Nenhum item de teste cadastrado/);
    expect(container).not.toHaveTextContent(/Nada de teste encontrado/);
  });

  it("erro SEM children mostra somente o banner — nunca mensagem de vazio nem de no-results sob erro (D19d)", () => {
    renderAsync({
      error: MENSAGEM,
      errorOrigin: "carga",
      empty: true,
      noResults: true,
      // sem children
    });

    expect(screen.getByText(/Falha ao carregar os itens de teste/)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum item de teste cadastrado/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Crie o primeiro item de teste/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nada de teste encontrado/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ajuste os filtros de teste/)).not.toBeInTheDocument();
  });

  it("sem erro, empty e noResults simultâneos: o vazio prevalece sobre o no-results", () => {
    renderAsync({ empty: true, noResults: true });

    expect(screen.getByText(/Nenhum item de teste cadastrado/)).toBeInTheDocument();
    expect(screen.getByText(/Crie o primeiro item de teste/)).toBeInTheDocument();
    expect(screen.queryByText(/Nada de teste encontrado/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ajuste os filtros de teste/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("noResults só sem empty e sem erro: exibe título e texto de no-results, sem o vazio", () => {
    renderAsync({ empty: false, noResults: true, error: null });

    expect(screen.getByText(/Nada de teste encontrado/)).toBeInTheDocument();
    expect(screen.getByText(/Ajuste os filtros de teste/)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum item de teste cadastrado/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Crie o primeiro item de teste/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("sem nenhuma flag e sem children a região fica vazia (nenhum estado renderizado)", () => {
    const { container } = renderAsync();

    expectNenhumTextoDeEstado();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.textContent?.trim()).toBe("");
  });

  it("sem nenhuma flag com children: apenas o conteúdo é renderizado", () => {
    renderAsync({ children: conteudoChildren() });

    expect(screen.getByTestId("conteudo-lista")).toBeInTheDocument();
    expect(screen.getByText("Item Alpha")).toBeInTheDocument();
    expectNenhumTextoDeEstado();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("retry derivado de errorOrigin — D20 / R25 / CA-P5-3", () => {
  it("origem 'carga': renderiza a mensagem e 'Tentar novamente', que dispara onRetry", () => {
    const { onRetry } = renderAsync({ error: MENSAGEM, errorOrigin: "carga" });

    expect(screen.getByText(/Falha ao carregar os itens de teste/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("origem AUSENTE (prop não informada): tratada como 'carga' — com retry que dispara onRetry", () => {
    // errorOrigin deliberadamente fora dos props (defaultProps não o inclui).
    const { onRetry } = renderAsync({ error: MENSAGEM });

    expect(screen.getByText(/Falha ao carregar os itens de teste/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("origem NULA (errorOrigin={null}): tratada como 'carga' — com retry que dispara onRetry", () => {
    const { onRetry } = renderAsync({ error: MENSAGEM, errorOrigin: null });

    expect(screen.getByText(/Falha ao carregar os itens de teste/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("origem 'operacao': exibe só a mensagem, SEM 'Tentar novamente'", () => {
    const { onRetry } = renderAsync({ error: MENSAGEM, errorOrigin: "operacao" });

    expect(screen.getByText(/Falha ao carregar os itens de teste/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("origem 'bloqueio': exibe só a mensagem, SEM 'Tentar novamente'", () => {
    const { onRetry } = renderAsync({ error: MENSAGEM, errorOrigin: "bloqueio" });

    expect(screen.getByText(/Falha ao carregar os itens de teste/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });
});

describe("sem botão de fechar — D22 / CA-P5-4", () => {
  it("erro de carga tem exatamente UM botão na região, e ele é o retry", () => {
    renderAsync({ error: MENSAGEM, errorOrigin: "carga" });

    const botoes = screen.getAllByRole("button");
    expect(botoes).toHaveLength(1);
    expect(botoes[0]).toHaveTextContent(/Tentar novamente/i);
  });

  it("nenhum estado renderiza botão de fechar (só o retry existe, e só na carga)", () => {
    // Estados sem erro: nenhum botão.
    renderAsync({ loading: true });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    renderAsync({ empty: true });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    renderAsync({ noResults: true });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    // Erro sem origem de carga: nenhum botão (logo, nenhum de fechar).
    renderAsync({ error: MENSAGEM, errorOrigin: "operacao" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    for (const rotulo of [/fechar/i, /fechar mensagem/i, /✕/i]) {
      expect(screen.queryByRole("button", { name: rotulo })).not.toBeInTheDocument();
    }
  });
});

describe("textos repassados literalmente pelas props — CA-P5-4 / CA-P5-5", () => {
  it("loading: renderiza exatamente o texto da prop loadingText", () => {
    renderAsync({ loading: true });

    expect(screen.getByText("Carregando itens de teste…")).toBeInTheDocument();
  });

  it("empty: renderiza exatamente emptyTitle e emptyText", () => {
    renderAsync({ empty: true });

    expect(screen.getByText("Nenhum item de teste cadastrado.")).toBeInTheDocument();
    expect(screen.getByText("Crie o primeiro item de teste para começar.")).toBeInTheDocument();
  });

  it("noResults: renderiza exatamente noResultsTitle e noResultsText", () => {
    renderAsync({ noResults: true });

    expect(screen.getByText("Nada de teste encontrado para essa combinação.")).toBeInTheDocument();
    expect(screen.getByText("Ajuste os filtros de teste para ver mais itens.")).toBeInTheDocument();
  });

  it("error: renderiza exatamente a mensagem recebida na prop error", () => {
    renderAsync({ error: MENSAGEM, errorOrigin: "bloqueio" });

    expect(screen.getByText(MENSAGEM)).toBeInTheDocument();
  });
});
