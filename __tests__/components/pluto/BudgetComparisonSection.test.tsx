import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BudgetComparisonSection from "@/components/pluto/BudgetComparisonSection";

describe("BudgetComparisonSection", () => {
  it("renderiza linhas de receita e despesa com totais", () => {
    render(
      <BudgetComparisonSection
        receitaRows={[{ category_name: "Salário", previsto: 5000, real: 4800 }]}
        despesaRows={[{ category_name: "Alimentação", previsto: 1000, real: 200 }]}
        totalReceitaPrevisto={5000}
        totalReceitaReal={4800}
        totalDespesaPrevisto={1000}
        totalDespesaReal={200}
      />
    );

    expect(screen.getByText("📈 Receitas")).toBeInTheDocument();
    expect(screen.getByText("📉 Despesas")).toBeInTheDocument();
    expect(screen.getByText("Salário")).toBeInTheDocument();
    expect(screen.getByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByText("Total Receitas")).toBeInTheDocument();
    expect(screen.getByText("Total Despesas")).toBeInTheDocument();
  });

  it("mostra estados vazios quando não há categorias", () => {
    render(
      <BudgetComparisonSection
        receitaRows={[]}
        despesaRows={[]}
        totalReceitaPrevisto={0}
        totalReceitaReal={0}
        totalDespesaPrevisto={0}
        totalDespesaReal={0}
      />
    );

    expect(screen.getByText("Nenhuma categoria de receita cadastrada.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma categoria de despesa cadastrada.")).toBeInTheDocument();
  });
});
