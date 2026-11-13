import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import TransactionModal, { type TransactionModalProps } from "@/components/pluto/TransactionModal";

// Cast ponte: a prop onCategoryBlur ainda não existe em TransactionModalProps
// (é exatamente o que o RED desta task fixa); ela vira obrigatória na T5.
type TransactionModalPropsComBlur = TransactionModalProps & {
  onCategoryBlur: () => void;
};

function makeProps(
  overrides: Partial<TransactionModalPropsComBlur> = {}
): TransactionModalPropsComBlur {
  return {
    isOpen: true,
    editingTransaction: null,
    accountInput: "Itaú",
    description: "",
    amount: "",
    type: "despesa",
    isRefund: false,
    date: "2026-03-15",
    categoryInput: "",
    savingTx: false,
    txSuccessMsg: null,
    accounts: [{ id: "a1", name: "Itaú", type: "conta", created_at: null, created_by: null }],
    categories: [{ id: "c1", name: "Alimentação", type: "despesa", created_at: "x", created_by: "y" }],
    // 05e: o modal não recebe limites de data nem mês da tela (data livre).
    descInputRef: createRef<HTMLInputElement>(),
    onClose: vi.fn(),
    onSave: vi.fn((e: React.FormEvent) => e.preventDefault()),
    onSaveAndAddAnother: vi.fn(),
    onDescriptionChange: vi.fn(),
    onAmountChange: vi.fn(),
    onTypeChange: vi.fn(),
    onIsRefundChange: vi.fn(),
    onDateChange: vi.fn(),
    onAccountInputChange: vi.fn(),
    onCategoryInputChange: vi.fn(),
    onCategoryBlur: vi.fn(),
    ...overrides,
  };
}

function datalistValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("#categories-list option")).map(
    (opt) => (opt as HTMLOptionElement).value
  );
}

describe("TransactionModal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(<TransactionModal {...makeProps({ isOpen: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza título de criação com conta e chama onSave no submit", () => {
    const onSave = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = render(<TransactionModal {...makeProps({ onSave })} />);

    expect(screen.getByRole("heading", { name: /Nova Transação \(Itaú\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar e Adicionar Outro/i })).toBeInTheDocument();

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(onSave).toHaveBeenCalled();
  });

  it("renderiza título de edição e esconde salvar-e-adicionar-outro", () => {
    render(
      <TransactionModal
        {...makeProps({
          editingTransaction: {
            id: "t1",
            description: "X",
            amount: 1,
            type: "despesa",
            is_refund: false,
            date: "2026-03-15",
            category_id: "c1",
            account_id: "a1",
            period_year: 2026,
            period_month: 3,
            created_at: "x",
            created_by: "y",
            category_name: "Alimentação",
            account_name: "Itaú",
          },
        })}
      />
    );

    expect(screen.getByRole("heading", { name: /Editar Transação/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Salvar e Adicionar Outro/i })).not.toBeInTheDocument();
  });

  it("propaga mudanças de campo e fechar", () => {
    const props = makeProps();
    render(<TransactionModal {...props} />);

    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Luz" } });
    expect(props.onDescriptionChange).toHaveBeenCalledWith("Luz");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("campo de data livre: rótulo exato 'Data' e input sem atributos min/max", () => {
    render(<TransactionModal {...makeProps()} />);

    // Regra 1 da spec: sem min/max no campo e rótulo simples "Data".
    const dateInput = screen.getByLabelText("Data") as HTMLInputElement;
    expect(dateInput).toHaveAttribute("type", "date");
    expect(dateInput).not.toHaveAttribute("min");
    expect(dateInput).not.toHaveAttribute("max");
  });

  it("mostra checkbox de reembolso só para despesa", () => {
    const { rerender } = render(<TransactionModal {...makeProps({ type: "despesa" })} />);
    expect(screen.getByLabelText(/Reembolso/i)).toBeInTheDocument();

    rerender(<TransactionModal {...makeProps({ type: "receita" })} />);
    expect(screen.queryByLabelText(/Reembolso/i)).not.toBeInTheDocument();
  });

  // R6 / D13 + DT-7: a datalist pré-filtra por normalizeName e o value de
  // cada option continua sendo a grafia ORIGINAL (escolher preenche o nome
  // existente — spec §8 edge 12).
  it("datalist pré-filtra: com categoryInput 'alimentacao' aparece a option 'Alimentação' com a grafia original e a opção sem relação some", () => {
    const { container } = render(
      <TransactionModal
        {...makeProps({
          categoryInput: "alimentacao",
          categories: [
            { id: "c1", name: "Alimentação", type: "despesa", created_at: "x", created_by: "y" },
            { id: "c2", name: "Salário", type: "receita", created_at: "x", created_by: "y" },
          ],
        })}
      />
    );

    const values = datalistValues(container);
    // valor = grafia original da linha existente
    expect(values).toContain("Alimentação");
    // pré-filtro normalizado: "Salário" não casa com "alimentacao"
    expect(values).not.toContain("Salário");
  });

  it("com entrada vazia a datalist renderiza a lista completa", () => {
    const { container } = render(
      <TransactionModal
        {...makeProps({
          categoryInput: "",
          categories: [
            { id: "c1", name: "Alimentação", type: "despesa", created_at: "x", created_by: "y" },
            { id: "c2", name: "Salário", type: "receita", created_at: "x", created_by: "y" },
          ],
        })}
      />
    );

    const values = datalistValues(container);
    expect(values).toContain("Alimentação");
    expect(values).toContain("Salário");
    expect(values).toHaveLength(2);
  });

  it("blur do input de categoria chama onCategoryBlur", () => {
    const onCategoryBlur = vi.fn();
    render(<TransactionModal {...makeProps({ categoryInput: "mercado", onCategoryBlur })} />);

    fireEvent.blur(screen.getByLabelText("Categoria"));

    expect(onCategoryBlur).toHaveBeenCalled();
  });

  it("nenhum elemento ou texto de aviso novo é renderizado no modal", () => {
    const { container } = render(
      <TransactionModal {...makeProps({ categoryInput: "mercado" })} />
    );

    // D5/D13: sem aviso/banner novo embaixo do campo.
    expect(container.querySelector("[role='alert'], [role='status']")).toBeNull();
    expect(container.textContent).not.toMatch(/hom[oô]nim|aviso|atenção/i);
  });

  // Blocker (b) da re-review 2026-11-11 (findings[1]): D19/R2 sanciona
  // homônimas conta × cartão como linhas distintas, mas o select renderiza
  // value={acc.name} para TODAS as options — duas homônimas compartilham o
  // mesmo value, a segunda fica inalcançável e a seleção cai sempre na
  // primeira. O value precisa ser um discriminador (id, ou name+tipo) que
  // identifique a linha exata escolhida.
  describe("select de conta com homônimas conta × cartão (D19/R2)", () => {
    it("homônimas têm values distintos e escolher a segunda dispara onAccountInputChange com o valor da segunda option", () => {
      const props = makeProps({
        accountInput: "",
        accounts: [
          { id: "a1", name: "Itaú", type: "conta", created_at: null, created_by: null },
          { id: "a2", name: "Itaú", type: "cartao", created_at: null, created_by: null },
        ],
      });
      render(<TransactionModal {...props} />);

      const select = screen.getByRole("combobox", {
        name: /Conta \/ Cartão/i,
      }) as HTMLSelectElement;

      // As duas linhas aparecem na lista, com o rótulo de tipo de cada uma.
      expect(select.textContent).toContain("(Conta)");
      expect(select.textContent).toContain("(Cartão)");

      const values = Array.from(select.options)
        .map((opt) => opt.value)
        .filter((value) => value !== "");
      expect(values).toHaveLength(2);
      // Value discriminador: duas linhas distintas não podem colidir no mesmo
      // value — é exatamente a colisão que torna a segunda homônima
      // inalcançável hoje.
      expect(new Set(values).size).toBe(2);

      // Escolher a SEGUNDA homônima comunica o valor da segunda option ao
      // handler (em vez de cair no value da primeira).
      fireEvent.change(select, { target: { value: values[1] } });
      expect(props.onAccountInputChange).toHaveBeenLastCalledWith(values[1]);
    });
  });
});
