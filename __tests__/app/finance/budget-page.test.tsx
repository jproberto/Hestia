import { render, screen } from "@testing-library/react";
import BudgetPage from "@/app/finance/budget/page";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } })
    }
  })
}));

vi.mock("@/lib/db/budget", () => ({
  getBudgetRevision: vi.fn().mockResolvedValue(null),
  initBudget: vi.fn(),
  getBudgets: vi.fn().mockResolvedValue([]),
  addOrUpdateBudgetItem: vi.fn()
}));

vi.mock("@/lib/db/categories", () => ({
  getCategories: vi.fn().mockResolvedValue([])
}));

describe("Pagina de Orcamento Anual /finance/budget", () => {
  it("deve exibir estado vazio e botao de iniciar orcamento se nenhuma revisao existir", async () => {
    render(<BudgetPage />);
    expect(await screen.findByText(/Nenhum orçamento cadastrado para o ano/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Iniciar Orçamento/i })).toBeInTheDocument();
  });
});
