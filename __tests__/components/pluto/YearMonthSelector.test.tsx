import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import YearMonthSelector from "@/components/pluto/YearMonthSelector";

describe("YearMonthSelector", () => {
  it("renderiza seletores de ano e mês e propaga mudanças", () => {
    const onYearChange = vi.fn();
    const onMonthChange = vi.fn();
    render(
      <YearMonthSelector
        availableYears={[2026, 2027]}
        openMonths={[
          { id: "m3", year: 2026, month: 3, status: "aberto", created_at: "x", created_by: "y" },
          { id: "m4", year: 2026, month: 4, status: "aberto", created_at: "x", created_by: "y" },
        ]}
        selectedYear={2026}
        selectedMonth={3}
        onYearChange={onYearChange}
        onMonthChange={onMonthChange}
      />
    );

    expect(screen.getByLabelText("Ano:")).toBeInTheDocument();
    expect(screen.getByLabelText("Mês:")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Ano:"), { target: { value: "2027" } });
    expect(onYearChange).toHaveBeenCalledWith(2027);

    fireEvent.change(screen.getByLabelText("Mês:"), { target: { value: "4" } });
    expect(onMonthChange).toHaveBeenCalledWith(4);
  });

  it("oculta seletores quando não há dados", () => {
    render(
      <YearMonthSelector
        availableYears={[]}
        openMonths={[]}
        selectedYear={2026}
        selectedMonth={3}
        onYearChange={vi.fn()}
        onMonthChange={vi.fn()}
      />
    );

    expect(screen.queryByLabelText("Ano:")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mês:")).not.toBeInTheDocument();
  });
});
