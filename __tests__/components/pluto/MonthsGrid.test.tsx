import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MonthsGrid from "@/components/pluto/MonthsGrid";
import type { MonthlyPeriod } from "@/lib/pluto/types";

const periods: MonthlyPeriod[] = [
  { id: "p1", year: 2026, month: 1, status: "aberto", created_at: "2026-01-01T00:00:00Z", created_by: "t@t.com" },
  { id: "p2", year: 2026, month: 2, status: "encerrado", created_at: "2026-02-01T00:00:00Z", created_by: "t@t.com" },
];

function renderGrid(overrides = {}) {
  const onOpenMonth = vi.fn();
  const onCloseMonth = vi.fn();
  render(
    <MonthsGrid
      year={2026}
      periods={periods}
      totalOpen={1}
      totalClosed={1}
      totalNotStarted={10}
      actionLoading={{}}
      onOpenMonth={onOpenMonth}
      onCloseMonth={onCloseMonth}
      {...overrides}
    />
  );
  return { onOpenMonth, onCloseMonth };
}

describe("MonthsGrid", () => {
  it("renderiza resumo anual e ações por status", () => {
    renderGrid();

    expect(screen.getByText("Abertos")).toBeInTheDocument();
    expect(screen.getByText("Encerrados")).toBeInTheDocument();
    expect(screen.getByText("Não Iniciados")).toBeInTheDocument();
    expect(screen.getByText("Aberto")).toBeInTheDocument();
    expect(screen.getByText("Encerrado")).toBeInTheDocument();
    expect(screen.getByText("Encerrar Mês")).toBeInTheDocument();
    expect(screen.getByText("Reabrir Mês")).toBeInTheDocument();
    expect(screen.getAllByText("Abrir Mês").length).toBeGreaterThan(0);
  });

  it("abre mês não iniciado ao clicar", () => {
    const { onOpenMonth } = renderGrid();

    fireEvent.click(screen.getAllByText("Abrir Mês")[0]);
    expect(onOpenMonth).toHaveBeenCalled();
  });

  it("encerra mês aberto ao clicar", () => {
    const { onCloseMonth } = renderGrid();

    fireEvent.click(screen.getByText("Encerrar Mês"));
    expect(onCloseMonth).toHaveBeenCalledWith(1);
  });

  it("mostra Processando e desabilita durante a ação", () => {
    renderGrid({ actionLoading: { 1: true } });

    expect(screen.getByText("Processando...")).toBeInTheDocument();
    expect(screen.getByText("Processando...").closest("button")).toBeDisabled();
  });
});
