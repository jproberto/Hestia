import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BudgetEmptyState from "@/components/pluto/BudgetEmptyState";
import BudgetSummaryCards from "@/components/pluto/BudgetSummaryCards";

describe("BudgetEmptyState", () => {
  it("mostra CTA de iniciar orçamento do ano", () => {
    const onStart = vi.fn();
    render(<BudgetEmptyState year={2026} onStart={onStart} />);
    expect(screen.getByText(/Nenhum orçamento cadastrado para o ano 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Iniciar Orçamento de 2026"));
    expect(onStart).toHaveBeenCalled();
  });
});

describe("BudgetSummaryCards", () => {
  it("renderiza totais formatados", () => {
    render(<BudgetSummaryCards totalRevenues={5000} totalExpenses={1000} netBudget={4000} />);
    expect(screen.getByText("Receitas Previstas")).toBeInTheDocument();
    expect(screen.getByText("Despesas Previstas")).toBeInTheDocument();
    expect(screen.getByText("Saldo Planejado")).toBeInTheDocument();
  });
});
