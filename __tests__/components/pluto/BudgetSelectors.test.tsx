import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BudgetSelectors from "@/components/pluto/BudgetSelectors";

const adjustments = [
  { id: "r1", year: 2026, start_month: 1, description: "Orçamento Inicial 2026" },
  { id: "a2", year: 2026, start_month: 3, description: "Ajuste Mar" },
] as never;

describe("BudgetSelectors", () => {
  it("lista ajustes e anos; troca notifica", () => {
    const onSelectAdjustment = vi.fn();
    const onSelectYear = vi.fn();
    render(
      <BudgetSelectors
        adjustments={adjustments}
        selectedAdjustmentId="r1"
        onSelectAdjustment={onSelectAdjustment}
        year={2026}
        onSelectYear={onSelectYear}
      />
    );
    expect(screen.getByText("Orçamento Inicial 2026")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ano:"), { target: { value: "2027" } });
    expect(onSelectYear).toHaveBeenCalledWith(2027);
    fireEvent.change(screen.getByLabelText("Ajuste:"), { target: { value: "a2" } });
    expect(onSelectAdjustment).toHaveBeenCalledWith("a2");
  });
});
