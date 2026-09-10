import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BudgetTables from "@/components/pluto/BudgetTables";

const revenues = [
  { category_id: "c2", category_name: "Salário", category_type: "receita", amount: 5000 },
] as never;
const expenses = [
  { category_id: "c1", category_name: "Alimentação", category_type: "despesa", amount: 1000 },
] as never;

const baseProps = {
  revenues,
  expenses,
  isEditable: true,
  editingCategoryId: null,
  tempAmount: "",
  savingCategoryId: null,
  onTempAmountChange: vi.fn(),
  onCellClick: vi.fn(),
  onSaveInline: vi.fn(),
  onCancelEdit: vi.fn(),
};

describe("BudgetTables", () => {
  it("renderiza linhas de receitas e despesas", () => {
    render(<BudgetTables {...baseProps} />);
    expect(screen.getByText("Receitas")).toBeInTheDocument();
    expect(screen.getByText("Despesas")).toBeInTheDocument();
    expect(screen.getByText("Salário")).toBeInTheDocument();
    expect(screen.getByText("Alimentação")).toBeInTheDocument();
  });

  it("renderiza estados vazios", () => {
    render(<BudgetTables {...baseProps} revenues={[]} expenses={[]} />);
    expect(screen.getByText("Nenhuma receita planejada.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma despesa planejada.")).toBeInTheDocument();
  });

  it("clique na célula chama onCellClick quando editável", () => {
    const onCellClick = vi.fn();
    render(<BudgetTables {...baseProps} onCellClick={onCellClick} />);
    // Span do valor (classe com cursor-pointer); matcher funcional evita
    // acoplar ao espaço inseparável do Intl.NumberFormat pt-BR.
    const amount = screen.getByText(
      (content, el) => el?.tagName === "SPAN" && content.includes("1.000")
    );
    fireEvent.click(amount);
    expect(onCellClick).toHaveBeenCalledWith("c1", 1000);
  });

  it("mostra input quando a categoria está em edição e Escape cancela", () => {
    const onCancelEdit = vi.fn();
    render(<BudgetTables {...baseProps} editingCategoryId="c1" tempAmount="1000" onCancelEdit={onCancelEdit} />);
    const input = screen.getByDisplayValue("1000");
    expect(input).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCancelEdit).toHaveBeenCalled();
  });
});
