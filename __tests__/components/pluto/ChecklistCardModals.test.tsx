import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChecklistCardModals from "@/components/pluto/ChecklistCardModals";

const baseProps = {
  isAddModalOpen: false,
  editingItem: null,
  deletingItem: null,
  saving: false,
  errorMsg: null,
  categories: [],
  userEmail: "t@t.com",
  onCloseAdd: vi.fn(),
  onSaveAdd: vi.fn(),
  onCloseEdit: vi.fn(),
  onSaveEdit: vi.fn(),
  onCloseDelete: vi.fn(),
  onConfirmDelete: vi.fn(),
};

describe("ChecklistCardModals", () => {
  it("não renderiza modal de adição quando fechado", () => {
    render(<ChecklistCardModals {...baseProps} />);
    expect(screen.queryByText("Adicionar Item ao Checklist")).not.toBeInTheDocument();
  });

  it("renderiza modal de adição quando aberto", () => {
    render(<ChecklistCardModals {...baseProps} isAddModalOpen />);
    expect(screen.getByText("Adicionar Item ao Checklist")).toBeInTheDocument();
  });

  it("renderiza modal de edição com item aberto", () => {
    render(
      <ChecklistCardModals
        {...baseProps}
        editingItem={{ id: "i1", day: 10, description: "Luz", type: "despesa", category_id: "c1", amount: 100 } as never}
      />
    );
    expect(screen.getByText("Editar Item do Checklist")).toBeInTheDocument();
  });
});
