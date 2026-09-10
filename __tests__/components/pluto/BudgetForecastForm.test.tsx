import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BudgetForecastForm from "@/components/pluto/BudgetForecastForm";

const baseProps = {
  categoryType: "despesa" as const,
  onTypeChange: vi.fn(),
  categoryName: "",
  onNameChange: vi.fn(),
  suggestions: [],
  onPickSuggestion: vi.fn(),
  amount: "",
  onAmountChange: vi.fn(),
  onSubmit: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
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
});
