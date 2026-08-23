import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import BudgetOverflowModal from "@/components/pluto/BudgetOverflowModal";
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("BudgetOverflowModal", () => {
  const defaultOverflowData = {
    categoryId: "cat-1",
    categoryName: "Contas",
    categoryType: "despesa" as const,
    totalChecklist: 600,
    budgetAmount: 500,
    operationLabel: "incluir",
  };

  const defaultProps = {
    isOpen: true,
    overflowData: defaultOverflowData,
    year: 2026,
    month: 10,
    userEmail: "test@example.com",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush });
  });

  it("não renderiza nada quando isOpen = false", () => {
    const { container } = render(<BudgetOverflowModal {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza a mensagem de bloqueio (Etapa 1) com valores formatados e botões", () => {
    render(<BudgetOverflowModal {...defaultProps} />);
    expect(
      screen.getByText(/Não é possível incluir este item/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Contas/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*600,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*500,00/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar Orçamento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("ao clicar Cancelar na Etapa 1, chama onCancel", () => {
    render(<BudgetOverflowModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("ao clicar Ajustar Orçamento, avança para a Etapa 3 com campo numérico pré-preenchido", () => {
    render(<BudgetOverflowModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Ajustar Orçamento" }));
    
    // Agora estamos na Etapa 3
    expect(screen.getByText(/defina o novo orçamento para Contas/i)).toBeInTheDocument();
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("600");
  });

  it("na Etapa 3, o campo exibe label informativo com mês e nome da categoria", () => {
    render(<BudgetOverflowModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Ajustar Orçamento" }));
    expect(screen.getByText(/Ajuste de Outubro: defina o novo orçamento para Contas/i)).toBeInTheDocument();
  });

  it("na Etapa 3, ao clicar Cancelar, chama onCancel", () => {
    render(<BudgetOverflowModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Ajustar Orçamento" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("na Etapa 3, ao digitar valor >= totalChecklist e clicar Salvar Ajuste e Incluir Item, chama onConfirm", () => {
    render(<BudgetOverflowModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Ajustar Orçamento" }));
    
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "650" } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar Ajuste e/i }));
    
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(650);
  });

  it("na Etapa 3, o botão fica desabilitado se valor < totalChecklist", () => {
    render(<BudgetOverflowModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Ajustar Orçamento" }));
    
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "599" } });
    
    const saveButton = screen.getByRole("button", { name: /Salvar Ajuste e/i });
    expect(saveButton).toBeDisabled();
  });
});
