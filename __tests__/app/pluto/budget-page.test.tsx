import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import BudgetPage from "@/app/pluto/budget/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getBudgetAdjustment, getBudgets, getBudgetAdjustments, createBudgetAdjustment } from "@/lib/pluto/db/budget";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { MascotProvider } from "@/lib/hestia/MascotProvider";

const mockUsePathname = vi.hoisted(() => vi.fn(() => '/pluto/budget'));
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() })));

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
  useSearchParams: vi.fn(),
  usePathname: mockUsePathname,
  useRouter: mockUseRouter,
}));

function renderWithMascotProvider(ui: React.ReactElement) {
  return render(
    <MascotProvider>
      {ui}
    </MascotProvider>
  );
}

describe("Pagina de Orcamento Anual /pluto/budget (Revisada por Ajustes)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/pluto/budget');
    mockUseRouter.mockReturnValue({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() });
  });

  it("deve exibir estado vazio e botao de iniciar orcamento se nenhuma revisao existir", async () => {
    (useSearchParams as Mock).mockReturnValue(new URLSearchParams(""));
    (getBudgetAdjustment as Mock).mockResolvedValue(null);
    (getBudgetAdjustments as Mock).mockResolvedValue([]);
    (getBudgets as Mock).mockResolvedValue([]);

    renderWithMascotProvider(<BudgetPage />);

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

    renderWithMascotProvider(<BudgetPage />);

    // 1. Deve carregar a tabela e focar por padrao no ajuste mais recente (Agosto)
    expect(await screen.findByText("Alimentação")).toBeInTheDocument();

    // 2. Como vigencia de Agosto (mês 8) !== Outubro (mês 10), a tela deve estar em Somente-Leitura
    expect(screen.queryByRole("button", { name: /Adicionar Previsão/i })).not.toBeInTheDocument();
    expect(screen.getByText(/1\.000,00/, { selector: "span" })).toHaveClass("cursor-default");

    // 3. E o botao "Criar Novo Ajuste" deve estar visivel para permitir ajustar o mes corrente
    const createBtn = screen.getByRole("button", { name: /Criar Novo Ajuste/i });
    expect(createBtn).toBeInTheDocument();

    // 4. Ao clicar em Criar Novo Ajuste
    fireEvent.click(createBtn);

    // 5. Deve abrir o modal de novo ajuste
    const modal = await screen.findByText(/Novo Ajuste de Orçamento/i);
    expect(modal).toBeInTheDocument();

    // 6. Preencher dados do novo ajuste
    fireEvent.change(screen.getByLabelText(/Mês de Início/i), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Ajuste de Outubro" } });

    // 7. Adicionar item de previsão
    fireEvent.change(screen.getByLabelText(/Categoria/i), { target: { value: "Transporte" } });
    fireEvent.change(screen.getByLabelText(/Valor/i), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar Previsão/i }));

    // 8. Verificar que o item foi adicionado
    expect(await screen.findByText("Transporte")).toBeInTheDocument();
    expect(await screen.findByText("500,00")).toBeInTheDocument();

    // 9. Salvar o ajuste
    fireEvent.click(screen.getByRole("button", { name: /Salvar Ajuste/i }));

    // 10. Verificar que o ajuste foi criado
    expect(createBudgetAdjustment).toHaveBeenCalledWith(
      expect.anything(),
      2026,
      10,
      "Ajuste de Outubro",
      expect.arrayContaining([
        expect.objectContaining({
          category_name: "Transporte",
          amount: 500,
          start_month: 10,
        })
      ]),
      "teste@hestia.com"
    );
  });
});