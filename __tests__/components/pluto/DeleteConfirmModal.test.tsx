import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DeleteConfirmModal from "@/components/pluto/DeleteConfirmModal";
import type { TransactionWithDetails } from "@/lib/pluto/types";

const tx: TransactionWithDetails = {
  id: "t1",
  description: "Supermercado",
  amount: 200,
  type: "despesa",
  is_refund: false,
  date: "2026-03-15",
  category_id: "c1",
  account_id: "a1",
  created_at: "2026-03-15T00:00:00Z",
  created_by: "t@t.com",
  category_name: "Alimentação",
  account_name: "Itaú",
};

describe("DeleteConfirmModal", () => {
  it("não renderiza quando fechado ou sem transação", () => {
    const { container, rerender } = render(
      <DeleteConfirmModal isOpen={false} transaction={tx} deleting={false} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <DeleteConfirmModal isOpen={true} transaction={null} deleting={false} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("exibe descrição/valor e confirma/cancela", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmModal isOpen={true} transaction={tx} deleting={false} onClose={onClose} onConfirm={onConfirm} />
    );

    expect(screen.getByText("Supermercado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Confirmar Exclusão/i }));
    expect(onConfirm).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
