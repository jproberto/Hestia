import { describe, it, expect } from 'vitest';
import { checkGlobalBudgetOverflow, checkMonthBudgetOverflow } from '@/lib/pluto/checklist-budget';
import type { BudgetItem, ChecklistItem } from '@/lib/pluto/types';

function makeItem(overrides: Partial<ChecklistItem> & { id: string; category_id: string }): ChecklistItem {
  return {
    day: 1,
    description: 'Item',
    type: 'despesa',
    amount: null,
    is_completed: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: 'test@example.com',
    category_name: 'Categoria',
    parent_id: null,
    month_id: null,
    ...overrides,
  };
}

function makeBudget(overrides: Partial<BudgetItem> & { category_id: string }): BudgetItem {
  return {
    category_name: 'Categoria',
    category_type: 'despesa',
    amount: 0,
    start_month: 1,
    ...overrides,
  };
}

describe('checkGlobalBudgetOverflow', () => {
  it('retorna isOverflow: false quando soma prevista <= orçamento', () => {
    const globalItems = [
      makeItem({ id: '1', category_id: 'cat1', amount: 100, month_id: null, is_active: true })
    ];
    const budgetItems = [
      makeBudget({ category_id: 'cat1', amount: 500 })
    ];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(false);
    expect(result.totalChecklist).toBe(300);
  });

  it('retorna isOverflow: true quando soma prevista > orçamento', () => {
    const globalItems = [
      makeItem({ id: '1', category_id: 'cat1', amount: 400, month_id: null, is_active: true })
    ];
    const budgetItems = [
      makeBudget({ category_id: 'cat1', amount: 500 })
    ];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(true);
    expect(result.totalChecklist).toBe(600);
  });

  it('exclui item pelo excludeItemId no cálculo (cenário de edição)', () => {
    const globalItems = [
      makeItem({ id: '1', category_id: 'cat1', amount: 400, month_id: null, is_active: true })
    ];
    const budgetItems = [
      makeBudget({ category_id: 'cat1', amount: 500 })
    ];
    // editando o item '1', então seu valor atual (400) sai da soma e entra o novo (600)
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 600, '1');
    expect(result.isOverflow).toBe(true);
    expect(result.totalChecklist).toBe(600);
  });

  it('ignora itens com amount nulo', () => {
    const globalItems = [
      makeItem({ id: '1', category_id: 'cat1', amount: null, month_id: null, is_active: true })
    ];
    const budgetItems = [
      makeBudget({ category_id: 'cat1', amount: 500 })
    ];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(false);
    expect(result.totalChecklist).toBe(200);
  });

  it('retorna isOverflow: false quando não há orçamento definido para a categoria', () => {
    const globalItems = [
      makeItem({ id: '1', category_id: 'cat1', amount: 400, month_id: null, is_active: true })
    ];
    const budgetItems: BudgetItem[] = [];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(false);
  });

  it('filtra apenas itens com month_id === null e is_active === true', () => {
    const globalItems = [
      makeItem({ id: '1', category_id: 'cat1', amount: 400, month_id: '2023-10', is_active: true }),
      makeItem({ id: '2', category_id: 'cat1', amount: 400, month_id: null, is_active: false })
    ];
    const budgetItems = [
      makeBudget({ category_id: 'cat1', amount: 500 })
    ];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(false);
    expect(result.totalChecklist).toBe(200);
  });
});

describe('checkMonthBudgetOverflow', () => {
  it('retorna isOverflow: true quando soma de itens do mês excede orçamento', () => {
    const monthItems = [
      makeItem({ id: '1', category_id: 'cat1', amount: 600 })
    ];
    const budgetItems = [
      makeBudget({ category_id: 'cat1', amount: 500 })
    ];
    const result = checkMonthBudgetOverflow(monthItems, budgetItems, 'cat1');
    expect(result.isOverflow).toBe(true);
    expect(result.totalChecklist).toBe(600);
  });

  it('retorna isOverflow: false quando soma <= orçamento', () => {
    const monthItems = [
      makeItem({ id: '1', category_id: 'cat1', amount: 400 })
    ];
    const budgetItems = [
      makeBudget({ category_id: 'cat1', amount: 500 })
    ];
    const result = checkMonthBudgetOverflow(monthItems, budgetItems, 'cat1');
    expect(result.isOverflow).toBe(false);
    expect(result.totalChecklist).toBe(400);
  });
});
