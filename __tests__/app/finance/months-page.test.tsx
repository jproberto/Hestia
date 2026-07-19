import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import MonthsPage from "@/app/finance/months/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getMonthlyPeriods, openMonthlyPeriod } from "@/lib/db/months";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } })
    }
  })
}));

vi.mock("@/lib/db/months", () => ({
  getMonthlyPeriods: vi.fn(),
  openMonthlyPeriod: vi.fn(),
  closeMonthlyPeriod: vi.fn(),
}));

describe("Página de Gestão de Meses /finance/months", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("deve renderizar os 12 meses do ano e exibir status inicial 'Não Iniciado'", async () => {
    (getMonthlyPeriods as Mock).mockResolvedValue([]);

    render(<MonthsPage />);

    expect(await screen.findByText("Janeiro")).toBeInTheDocument();
    expect(screen.getByText("Dezembro")).toBeInTheDocument();

    const notOpenedBadges = screen.getAllByText("Não Iniciado");
    expect(notOpenedBadges).toHaveLength(12);

    const openButtons = screen.getAllByRole("button", { name: "Abrir Mês" });
    expect(openButtons).toHaveLength(12);
  });

  it("deve permitir abrir um mês não iniciado", async () => {
    (getMonthlyPeriods as Mock).mockResolvedValue([]);
    (openMonthlyPeriod as Mock).mockResolvedValue(undefined);

    render(<MonthsPage />);

    const openBtn = await screen.findAllByRole("button", { name: "Abrir Mês" });
    fireEvent.click(openBtn[0]); // Clica no botão de Janeiro

    await waitFor(() => {
      expect(openMonthlyPeriod).toHaveBeenCalledWith(expect.any(Object), 2026, 1, "teste@hestia.com");
    });
  });

  it("deve exibir status 'Aberto' e botão 'Encerrar Mês' se o período estiver aberto", async () => {
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "1", year: 2026, month: 1, status: "aberto", created_by: "teste@hestia.com" }
    ]);

    render(<MonthsPage />);

    expect(await screen.findByText("Aberto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encerrar Mês" })).toBeInTheDocument();
  });
});
