import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import BudgetPage from "@/app/finance/budget/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getBudgetRevision, getBudgets } from "@/lib/db/budget";
import { useSearchParams } from "next/navigation";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } })
    }
  })
}));

vi.mock("@/lib/db/budget", () => ({
  getBudgetRevision: vi.fn(),
  initBudget: vi.fn(),
  getBudgets: vi.fn(),
  adjustBudgetItem: vi.fn(),
  addOrUpdateBudgetItem: vi.fn()
}));

vi.mock("@/lib/db/categories", () => ({
  getCategories: vi.fn().mockResolvedValue([])
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn()
}));

describe("Pagina de Orcamento Anual /finance/budget", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("deve exibir estado vazio e botao de iniciar orcamento se nenhuma revisao existir", async () => {
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams(""));
    (getBudgetRevision as Mock).mockResolvedValue(null);
    (getBudgets as Mock).mockResolvedValue([]);

    render(<BudgetPage />);

    expect(await screen.findByText(/Nenhum orçamento cadastrado para o ano/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Iniciar Orçamento/i })).toBeInTheDocument();
  });

  it("deve validar as restricoes de edicao com base no mockMonth (meses passados bloqueados e meses futuros permitidos)", async () => {
    // Configura o retorno mockado de useSearchParams
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams("?mockMonth=5"));

    (getBudgetRevision as Mock).mockResolvedValue({ id: "rev-123", year: 2026, start_month: 1 });
    (getBudgets as Mock).mockResolvedValue([
      { category_id: "cat-1", category_name: "Alimentação", category_type: "despesa", amount: 1000, start_month: 1 }
    ]);

    render(<BudgetPage />);

    // 1. Aguarda o carregamento inicial (mes atual/Julho) que deve estar aberto
    expect(await screen.findByText("Alimentação", {}, { timeout: 4500 })).toBeInTheDocument();

    // 2. Muda o seletor de mes para o mes 4 (Abril, menor que mockMonth=5) e valida bloqueio
    const monthSelect = screen.getByLabelText(/Mês:/i);
    fireEvent.change(monthSelect, { target: { value: "4" } });

    await waitFor(() => {
      expect(screen.getByText("Fechado")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /Adicionar Previsão/i })).not.toBeInTheDocument();
    expect(screen.getByText("R$ 1000.00", { selector: "span" })).toHaveClass("cursor-default");

    // 3. Muda o seletor de mes para o mes 6 (Junho, maior que mockMonth=5) e valida liberacao
    const monthSelect6 = screen.getByLabelText(/Mês:/i);
    fireEvent.change(monthSelect6, { target: { value: "6" } });

    // Aguarda carregar os dados de volta (loading = false)
    await waitFor(() => {
      expect(screen.getByText("Alimentação")).toBeInTheDocument();
    });

    // Valida que o mes esta aberto para edicao
    expect(screen.queryByText("Fechado")).not.toBeInTheDocument();
    expect(screen.getByText("Aberto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar Previsão/i })).toBeInTheDocument();
    expect(screen.getByText("R$ 1000.00", { selector: "span" })).toHaveClass("cursor-pointer");
  });
});

