import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useChecklistItems } from "@/lib/pluto/hooks/useChecklistItems";
import { ChecklistItem } from "@/lib/pluto/repositories/checklist";
import { BudgetItem } from "@/lib/pluto/repositories/budget";

const mockChecklistItems: ChecklistItem[] = [
  {
    id: "1",
    day: 5,
    description: "Internet",
    type: "despesa",
    category_id: "cat1",
    amount: 100,
    is_completed: false,
    is_active: true,
    created_at: "2024-01-01",
    created_by: "test@test.com",
    category_name: "Internet",
    parent_id: null,
    month_id: "2024-01",
  },
  {
    id: "2",
    day: 15,
    description: "Salário",
    type: "receita",
    category_id: "cat2",
    amount: 5000,
    is_completed: true,
    is_active: true,
    created_at: "2024-01-01",
    created_by: "test@test.com",
    category_name: "Salário",
    parent_id: null,
    month_id: "2024-01",
  },
  {
    id: "3",
    day: 10,
    description: "Aluguel",
    type: "despesa",
    category_id: "cat1",
    amount: 1200,
    is_completed: false,
    is_active: true,
    created_at: "2024-01-01",
    created_by: "test@test.com",
    category_name: "Internet",
    parent_id: null,
    month_id: "2024-01",
  },
];

const mockBudgetItems: BudgetItem[] = [
  { category_id: "cat1", category_name: "Internet", category_type: "despesa", amount: 1000, start_month: 1 },
  { category_id: "cat2", category_name: "Salário", category_type: "receita", amount: 5000, start_month: 1 },
];

describe("useChecklistItems", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-10"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ordena itens por dia", () => {
    const { result } = renderHook(() =>
      useChecklistItems(mockChecklistItems, mockBudgetItems)
    );

    const sortedItems = result.current.sortedItems;
    expect(sortedItems[0].day).toBe(5);
    expect(sortedItems[1].day).toBe(10);
    expect(sortedItems[2].day).toBe(15);
  });

  it("calcula totais por categoria", () => {
    const { result } = renderHook(() =>
      useChecklistItems(mockChecklistItems, mockBudgetItems)
    );

    const totals = result.current.categoryTotals;
    expect(totals.get("cat1")?.total).toBe(1300);
    expect(totals.get("cat1")?.categoryName).toBe("Internet");
    expect(totals.get("cat2")?.total).toBe(5000);
    expect(totals.get("cat2")?.categoryName).toBe("Salário");
  });

  it("detecta overflow de orçamento", () => {
    const { result } = renderHook(() =>
      useChecklistItems(mockChecklistItems, mockBudgetItems)
    );

    const overflows = result.current.overflowCategories;
    expect(overflows.length).toBe(1);
    expect(overflows[0].categoryId).toBe("cat1");
    expect(overflows[0].isOverflow).toBe(true);
    expect(overflows[0].totalChecklist).toBe(1300);
    expect(overflows[0].budgetAmount).toBe(1000);
  });

  it("não detecta overflow quando total <= orçamento", () => {
    const budgetNoOverflow: BudgetItem[] = [
      { category_id: "cat1", category_name: "Internet", category_type: "despesa", amount: 2000, start_month: 1 },
    ];

    const { result } = renderHook(() =>
      useChecklistItems(mockChecklistItems, budgetNoOverflow)
    );

    expect(result.current.overflowCategories.length).toBe(0);
  });

  it("retorna overflowCategories vazio quando não há orçamento", () => {
    const { result } = renderHook(() =>
      useChecklistItems(mockChecklistItems, [])
    );

    expect(result.current.overflowCategories.length).toBe(0);
  });

  it("renderUrgencyBadge retorna elemento React válido", () => {
    const { result } = renderHook(() =>
      useChecklistItems(mockChecklistItems, mockBudgetItems)
    );

    const item = mockChecklistItems[0];
    const badge = result.current.renderUrgencyBadge(item, "warning");
    expect(badge).toBeDefined();
    expect(typeof badge).toBe("object");
  });

  it("getRowBg retorna classe CSS correta para completed", () => {
    const { result } = renderHook(() =>
      useChecklistItems(mockChecklistItems, mockBudgetItems)
    );

    expect(result.current.getRowBg("completed")).toBe("opacity-60 bg-muted/30");
    expect(result.current.getRowBg("overdue")).toBe("");
    expect(result.current.getRowBg("warning")).toBe("");
    expect(result.current.getRowBg("ondue")).toBe("");
  });

  it("memoiza resultados - mesma referência quando inputs não mudam", () => {
    const { result, rerender } = renderHook(
      ({ items, budgetItems }) =>
        useChecklistItems(items, budgetItems),
      { initialProps: { items: mockChecklistItems, budgetItems: mockBudgetItems } }
    );

    const firstSortedItems = result.current.sortedItems;
    const firstTotals = result.current.categoryTotals;
    const firstOverflows = result.current.overflowCategories;

    rerender({ items: mockChecklistItems, budgetItems: mockBudgetItems });

    expect(result.current.sortedItems).toBe(firstSortedItems);
    expect(result.current.categoryTotals).toBe(firstTotals);
    expect(result.current.overflowCategories).toBe(firstOverflows);
  });

  it("recalcula quando items mudam", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useChecklistItems(items, mockBudgetItems),
      { initialProps: { items: mockChecklistItems } }
    );

    const firstSortedItems = result.current.sortedItems;

    const newItems = [...mockChecklistItems, { ...mockChecklistItems[0], id: "4", day: 1 }];
    rerender({ items: newItems });

    expect(result.current.sortedItems).not.toBe(firstSortedItems);
    expect(result.current.sortedItems.length).toBe(4);
  });

  it("recalcula quando budgetItems mudam", () => {
    const { result, rerender } = renderHook(
      ({ budgetItems }) => useChecklistItems(mockChecklistItems, budgetItems),
      { initialProps: { budgetItems: mockBudgetItems } }
    );

    const firstOverflows = result.current.overflowCategories;

    const newBudgetItems: BudgetItem[] = [
      { category_id: "cat1", category_name: "Internet", category_type: "despesa", amount: 2000, start_month: 1 },
    ];
    rerender({ budgetItems: newBudgetItems });

    expect(result.current.overflowCategories).not.toBe(firstOverflows);
    expect(result.current.overflowCategories.length).toBe(0);
  });

  it("lida com amount null corretamente", () => {
    const itemsWithNull: ChecklistItem[] = [
      { ...mockChecklistItems[0], id: "4", amount: null },
    ];

    const { result } = renderHook(() =>
      useChecklistItems(itemsWithNull, mockBudgetItems)
    );

    expect(result.current.categoryTotals.get("cat1")?.total).toBe(0);
  });

  it("usa category_name 'Sem categoria' quando não há nome", () => {
    const itemsNoName: ChecklistItem[] = [
      { ...mockChecklistItems[0], id: "4", category_name: undefined as unknown as string },
    ];

    const { result } = renderHook(() =>
      useChecklistItems(itemsNoName, mockBudgetItems)
    );

    expect(result.current.categoryTotals.get("cat1")?.categoryName).toBe("Sem categoria");
  });
});