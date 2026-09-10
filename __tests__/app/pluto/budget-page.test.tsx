import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import BudgetPage from "@/app/pluto/budget/page";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
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

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

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

    (getBudgetAdjustment as Mock).mockResolvedValue({ id: "rev-inicial", year: 2026, start_month: 1, description: "Inicial", created_by: "teste" });
    (getBudgetAdjustments as Mock).mockResolvedValue(mockAdjs);
    (getBudgets as Mock).mockResolvedValue([]);

    renderWithMascotProvider(<BudgetPage />);

    // 1. O seletor deve listar os ajustes existentes
    const select = await screen.findByLabelText("Ajuste:");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Orçamento Inicial 2026")).toBeInTheDocument();
    expect(screen.getByText("Ajuste de Agosto")).toBeInTheDocument();

    // 2. Ao selecionar Agosto (start_month 8 !== openMonth 10), a tela fica Somente-Leitura
    fireEvent.change(select, { target: { value: "rev-agosto" } });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Adicionar Previsão/i })).not.toBeInTheDocument();
    });

    // 3. E o botao "Criar Novo Ajuste" deve estar visivel para permitir ajustar o mes corrente
    const createBtn = screen.getByRole("button", { name: /Criar Novo Ajuste/i });
    expect(createBtn).toBeInTheDocument();

    // 4. Ao clicar em Criar Novo Ajuste, cria o ajuste do mês corrente (Outubro)
    fireEvent.click(createBtn);

    // 5. Verificar que o ajuste foi criado para o mês corrente
    await waitFor(() => {
      expect(createBudgetAdjustment as Mock).toHaveBeenCalledWith(
        expect.anything(),
        2026,
        10,
        "teste@hestia.com"
      );
    });
  });
});