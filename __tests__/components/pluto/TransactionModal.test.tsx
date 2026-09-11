import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import TransactionModal, { type TransactionModalProps } from "@/components/pluto/TransactionModal";

function makeProps(overrides: Partial<TransactionModalProps> = {}): TransactionModalProps {
  return {
    isOpen: true,
    editingTransaction: null,
    accountInput: "Itaú",
    description: "",
    amount: "",
    type: "despesa",
    isRefund: false,
    date: "2026-03-15",
    categoryInput: "",
    savingTx: false,
    txSuccessMsg: null,
    accounts: [{ id: "a1", name: "Itaú", type: "conta", created_at: null, created_by: null }],
    categories: [{ id: "c1", name: "Alimentação", type: "despesa", created_at: "x", created_by: "y" }],
    selectedYear: 2026,
    selectedMonth: 3,
    minDateStr: "2026-03-01",
    maxDateStr: "2026-03-31",
    descInputRef: createRef<HTMLInputElement>(),
    onClose: vi.fn(),
    onSave: vi.fn((e: React.FormEvent) => e.preventDefault()),
    onSaveAndAddAnother: vi.fn(),
    onDescriptionChange: vi.fn(),
    onAmountChange: vi.fn(),
    onTypeChange: vi.fn(),
    onIsRefundChange: vi.fn(),
    onDateChange: vi.fn(),
    onAccountInputChange: vi.fn(),
    onCategoryInputChange: vi.fn(),
    ...overrides,
  };
}

describe("TransactionModal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(<TransactionModal {...makeProps({ isOpen: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza título de criação com conta e chama onSave no submit", () => {
    const onSave = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = render(<TransactionModal {...makeProps({ onSave })} />);

    expect(screen.getByRole("heading", { name: /Nova Transação \(Itaú\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar e Adicionar Outro/i })).toBeInTheDocument();

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(onSave).toHaveBeenCalled();
  });

  it("renderiza título de edição e esconde salvar-e-adicionar-outro", () => {
    render(
      <TransactionModal
        {...makeProps({
          editingTransaction: {
            id: "t1",
            description: "X",
            amount: 1,
            type: "despesa",
            is_refund: false,
            date: "2026-03-15",
            category_id: "c1",
            account_id: "a1",
            created_at: "x",
            created_by: "y",
            category_name: "Alimentação",
            account_name: "Itaú",
          },
        })}
      />
    );

    expect(screen.getByRole("heading", { name: /Editar Transação/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Salvar e Adicionar Outro/i })).not.toBeInTheDocument();
  });

  it("propaga mudanças de campo e fechar", () => {
    const props = makeProps();
    render(<TransactionModal {...props} />);

    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: "Luz" } });
    expect(props.onDescriptionChange).toHaveBeenCalledWith("Luz");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("mostra checkbox de reembolso só para despesa", () => {
    const { rerender } = render(<TransactionModal {...makeProps({ type: "despesa" })} />);
    expect(screen.getByLabelText(/Reembolso/i)).toBeInTheDocument();

    rerender(<TransactionModal {...makeProps({ type: "receita" })} />);
    expect(screen.queryByLabelText(/Reembolso/i)).not.toBeInTheDocument();
  });
});
