import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import BudgetPage from "@/app/pluto/budget/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getBudgetAdjustment, getBudgets, getBudgetAdjustments, createBudgetAdjustment } from "@/lib/pluto/db/budget";
import { useSearchParams } from "next/navigation";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } })
    }
  })
}));

vi.mock("@/lib/pluto/db/budget", () => ({
  getBudgetAdjustment: vi.fn(),
  initBudget: vi.fn(),
  getBudgets: vi.fn(),
  adjustBudgetItem: vi.fn(),
  getBudgetAdjustments: vi.fn(),
  createBudgetAdjustment: vi.fn(),
  addOrUpdateBudgetItem: vi.fn()
}));

vi.mock("@/lib/pluto/db/categories", () => ({
  getCategories: vi.fn().mockResolvedValue([])
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn()
}));

describe("Pagina de Orcamento Anual /pluto/budget (Revisada por Ajustes)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("deve exibir estado vazio e botao de iniciar orcamento se nenhuma revisao existir", async () => {
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams(""));
    (getBudgetAdjustment as Mock).mockResolvedValue(null);
    (getBudgetAdjustments as Mock).mockResolvedValue([]);
    (getBudgets as Mock).mockResolvedValue([]);

    render(<BudgetPage />);

    expect(await screen.findByText(/Nenhum orçamento cadastrado para o ano/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Iniciar Orçamento/i })).toBeInTheDocument();
  });

  it("deve validar as restricoes de edicao com base em start_month === openMonth e criacao de ajustes", async () => {
    // Configura o mês corrente como Outubro (mês 10)
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams("?mockMonth=10"));

    // Mock das revisões existentes (Janeiro e Agosto)
    const mockAdjs = [
      { id: "rev-inicial", year: 2026, start_month: 1, description: "Inicial", created_by: "teste" },
      { id: "rev-agosto", year: 2026, start_month: 8, description: "Ajuste de Agosto", created_by: "teste" }
    ];

    (getBudgetAdjustment as Mock).mockResolvedValue({ id: "rev-inicial", year: 2026, start_month: 1 });
    (getBudgetAdjustments as Mock).mockResolvedValue(mockAdjs);
    (getBudgets as Mock).mockResolvedValue([
      { category_id: "cat-1", category_name: "Alimentação", category_type: "despesa", amount: 1000, start_month: 1 }
    ]);

    render(<BudgetPage />);

    // 1. Deve carregar a tabela e focar por padrao no ajuste mais recente (Agosto)
    expect(await screen.findByText("Alimentação")).toBeInTheDocument();

    // 2. Como vigencia de Agosto (mês 8) !== Outubro (mês 10), a tela deve estar em Somente-Leitura
    expect(screen.queryByRole("button", { name: /Adicionar Previsão/i })).not.toBeInTheDocument();
    expect(screen.getByText(/1\.000,00/, { selector: "span" })).toHaveClass("cursor-default");

    // 3. E o botao "Criar Novo Ajuste" deve estar visivel para permitir ajustar o mes corrente
    const createBtn = screen.getByRole("button", { name: /Criar Novo Ajuste/i });
    expect(createBtn).toBeInTheDocument();

    // 4. Ao clicar em Criar Novo Ajuste
    (createBudgetAdjustment as Mock).mockResolvedValue("rev-outubro");
    
    // Atualiza o mock para incluir o novo ajuste de Outubro cadastrado
    const mockAdjsWithOct = [
      ...mockAdjs,
      { id: "rev-outubro", year: 2026, start_month: 10, description: "Ajuste de Outubro", created_by: "teste" }
    ];
    (getBudgetAdjustments as Mock).mockResolvedValue(mockAdjsWithOct);

    fireEvent.click(createBtn);

    // 5. O teste deve verificar se recarregou e focou em Outubro (agora editavel)
    await waitFor(() => {
      expect(createBudgetAdjustment).toHaveBeenCalledWith(expect.any(Object), 2026, 10, "teste@hestia.com");
    });

    await waitFor(() => {
      // O botao "Criar Novo Ajuste" some pois agora existe um ajuste para o mes corrente
      expect(screen.queryByRole("button", { name: /Criar Novo Ajuste/i })).not.toBeInTheDocument();
      // O botao "Adicionar Previsão" passa a aparecer (esta aberto para edicao)
      expect(screen.getByRole("button", { name: /Adicionar Previsão/i })).toBeInTheDocument();
      // O cursor da celula vira pointer
      expect(screen.getByText(/1\.000,00/, { selector: "span" })).toHaveClass("cursor-pointer");
    });
  });
});
