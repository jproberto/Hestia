import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChecklistCard from "@/components/pluto/ChecklistCard";
import { ChecklistItem } from "@/lib/pluto/db/checklist";
import { Category } from "@/lib/pluto/db/categories";
import { BudgetItem } from "@/lib/pluto/db/budget";

const mockCategories: Category[] = [
  { id: "cat-1", name: "Moradia", type: "despesa", created_at: "2026-01-01", created_by: "user@test.com" },
  { id: "cat-2", name: "Renda", type: "receita", created_at: "2026-01-01", created_by: "user@test.com" },
];

const mockBudgetItems: BudgetItem[] = [];

describe("Componente ChecklistCard", () => {
  const defaultProps = {
    items: [],
    categories: mockCategories,
    budgetItems: mockBudgetItems,
    isMonthOpen: true,
    selectedYear: 2026,
    selectedMonth: 8,
    userEmail: "user@test.com",
    onToggleItem: vi.fn(),
    onAddItem: vi.fn(),
    onEditItem: vi.fn(),
    onDeleteItem: vi.fn(),
    onTriggerTransactionModal: vi.fn(),
  };

  it("deve renderizar a lista de itens com os indicadores visuais de urgência", () => {
    const today = new Date();
    const currentDay = today.getDate();

    const pastDay = currentDay > 1 ? currentDay - 1 : 1;
    const nearDay = currentDay <= 28 ? currentDay + 1 : 28;
    const farDay = currentDay <= 25 ? currentDay + 5 : 28;

    const mockItems: ChecklistItem[] = [
      {
        id: "item-vencido",
        month_id: "m-1",
        day: pastDay,
        description: "Conta Vencida",
        type: "despesa",
        category_id: "cat-1",
        category_name: "Moradia",
        amount: 100,
        is_completed: false,
        is_active: true,
        created_at: "2026-01-01",
        created_by: "user@test.com",
      },
      {
        id: "item-atencao",
        month_id: "m-1",
        day: nearDay,
        description: "Conta em Breve",
        type: "despesa",
        category_id: "cat-1",
        category_name: "Moradia",
        amount: 200,
        is_completed: false,
        is_active: true,
        created_at: "2026-01-01",
        created_by: "user@test.com",
      },
      {
        id: "item-em-dia",
        month_id: "m-1",
        day: farDay,
        description: "Conta em Dia",
        type: "despesa",
        category_id: "cat-1",
        category_name: "Moradia",
        amount: 300,
        is_completed: false,
        is_active: true,
        created_at: "2026-01-01",
        created_by: "user@test.com",
      },
      {
        id: "item-concluido",
        month_id: "m-1",
        day: pastDay,
        description: "Conta Concluida",
        type: "despesa",
        category_id: "cat-1",
        category_name: "Moradia",
        amount: 400,
        is_completed: true,
        is_active: true,
        created_at: "2026-01-01",
        created_by: "user@test.com",
      },
    ];

    render(<ChecklistCard {...defaultProps} items={mockItems} />);

    expect(screen.getByText("Conta Vencida")).toBeInTheDocument();
    expect(screen.getByText("Conta em Breve")).toBeInTheDocument();
    expect(screen.getByText("Conta em Dia")).toBeInTheDocument();
    expect(screen.getByText("Conta Concluida")).toBeInTheDocument();
  });

  it("deve disparar onToggleItem e onTriggerTransactionModal ao marcar um item", () => {
    const onToggleItem = vi.fn();
    const onTriggerTransactionModal = vi.fn();

    const mockItem: ChecklistItem = {
      id: "item-1",
      month_id: "m-1",
      day: 10,
      description: "Internet",
      type: "despesa",
      category_id: "cat-1",
      category_name: "Moradia",
      amount: 120,
      is_completed: false,
      is_active: true,
      created_at: "2026-01-01",
      created_by: "user@test.com",
    };

    render(
      <ChecklistCard
        {...defaultProps}
        items={[mockItem]}
        onToggleItem={onToggleItem}
        onTriggerTransactionModal={onTriggerTransactionModal}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(onToggleItem).toHaveBeenCalledWith("item-1", true, mockItem);
    expect(onTriggerTransactionModal).toHaveBeenCalledWith({
      description: "Internet",
      type: "despesa",
      category_id: "cat-1",
      amount: 120,
      date: "2026-08-10",
    });
  });

  it("deve desabilitar interações quando o mês estiver fechado (isMonthOpen = false)", () => {
    const mockItem: ChecklistItem = {
      id: "item-1",
      month_id: "m-1",
      day: 10,
      description: "Aluguel",
      type: "despesa",
      category_id: "cat-1",
      amount: 2000,
      is_completed: false,
      is_active: true,
      created_at: "2026-01-01",
      created_by: "user@test.com",
      category_name: "Moradia",
    };

    render(<ChecklistCard {...defaultProps} isMonthOpen={false} items={[mockItem]} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();

    expect(screen.queryByRole("button", { name: /adicionar/i })).not.toBeInTheDocument();
  });
});
