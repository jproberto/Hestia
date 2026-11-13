import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BudgetForecastForm, {
  type BudgetForecastFormProps,
} from "@/components/pluto/BudgetForecastForm";

// Cast ponte: a prop onCategoryBlur ainda não existe em BudgetForecastFormProps
// (é exatamente o que o RED desta task fixa); ela vira obrigatória na T5.
type BudgetForecastFormPropsComBlur = BudgetForecastFormProps & {
  onCategoryBlur: () => void;
};

const baseProps: BudgetForecastFormPropsComBlur = {
  categoryType: "despesa" as const,
  onTypeChange: vi.fn(),
  categoryName: "",
  onNameChange: vi.fn(),
  suggestions: [],
  onPickSuggestion: vi.fn(),
  amount: "",
  onAmountChange: vi.fn(),
  onSubmit: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
  onCategoryBlur: vi.fn(),
};

describe("BudgetForecastForm", () => {
  it("renderiza campos e salva", () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(<BudgetForecastForm {...baseProps} onSubmit={onSubmit} />);
    const nameInput = screen.getByPlaceholderText("Ex: Alimentação");
    const amountInput = screen.getByPlaceholderText("Ex: 800.00");
    // required: preencher antes de submeter (validação nativa bloqueia vazio)
    fireEvent.change(nameInput, { target: { value: "Alimentação" } });
    fireEvent.change(amountInput, { target: { value: "800" } });
    // Precedente do repo (critical-flows): submete o form direto
    fireEvent.submit(screen.getByText("Salvar Previsão").closest("form")!);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("trocar o tipo notifica e limpa o nome", () => {
    const onTypeChange = vi.fn();
    const onNameChange = vi.fn();
    render(<BudgetForecastForm {...baseProps} onTypeChange={onTypeChange} onNameChange={onNameChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "receita" } });
    expect(onTypeChange).toHaveBeenCalledWith("receita");
    expect(onNameChange).toHaveBeenCalledWith("");
  });

  it("sugestões aparecem ao digitar e clique escolhe", () => {
    const onPickSuggestion = vi.fn();
    render(
      <BudgetForecastForm
        {...baseProps}
        categoryName="Alim"
        suggestions={[{ id: "c1", name: "Alimentação" }] as never}
        onPickSuggestion={onPickSuggestion}
      />
    );
    fireEvent.click(screen.getByText("Alimentação"));
    expect(onPickSuggestion).toHaveBeenCalledWith("Alimentação");
  });

  // R7 / D5/D6: o input de Categoria ganha onBlur repassando o handler do
  // editor (cópia da grafia homônima do outro tipo, sem aviso).
  it("blur do input de categoria chama onCategoryBlur", () => {
    const onCategoryBlur = vi.fn();
    // Spread de variável: onCategoryBlur ainda não é prop declarada do
    // componente — é exatamente o que este RED fixa.
    const props = { ...baseProps, categoryName: "mercado", onCategoryBlur };
    render(<BudgetForecastForm {...props} />);

    fireEvent.blur(screen.getByPlaceholderText("Ex: Alimentação"));

    expect(onCategoryBlur).toHaveBeenCalled();
  });

  it("nenhuma mudança visual ou nova mensagem é renderizada (sem aviso novo)", () => {
    const { container } = render(
      <BudgetForecastForm {...baseProps} categoryName="mercado" />
    );

    // D5/D13: nenhum banner/aviso embaixo do campo e a estrutura continua a
    // mesma (tipo + categoria + valor + botão Salvar Previsão).
    expect(container.querySelector("[role='alert'], [role='status']")).toBeNull();
    expect(container.textContent).not.toMatch(/hom[oô]nim|aviso|atenção/i);
    expect(screen.getByText("Tipo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Alimentação")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: 800.00")).toBeInTheDocument();
    expect(screen.getByText("Salvar Previsão")).toBeInTheDocument();
  });
});
