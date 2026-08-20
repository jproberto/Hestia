import { describe, it, expect } from 'vitest';
import { checkGlobalBudgetOverflow, checkMonthBudgetOverflow } from '@/lib/checklist-budget';

describe('checkGlobalBudgetOverflow', () => {
  it('retorna isOverflow: false quando soma prevista <= orçamento', () => {
    const globalItems = [
      { id: '1', category_id: 'cat1', amount: 100, month_id: null, is_active: true }
    ];
    const budgetItems = [
      { category_id: 'cat1', amount: 500 }
    ];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(false);
    expect(result.totalChecklist).toBe(300);
  });

  it('retorna isOverflow: true quando soma prevista > orçamento', () => {
    const globalItems = [
      { id: '1', category_id: 'cat1', amount: 400, month_id: null, is_active: true }
    ];
    const budgetItems = [
      { category_id: 'cat1', amount: 500 }
    ];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(true);
    expect(result.totalChecklist).toBe(600);
  });

  it('exclui item pelo excludeItemId no cálculo (cenário de edição)', () => {
    const globalItems = [
      { id: '1', category_id: 'cat1', amount: 400, month_id: null, is_active: true }
    ];
    const budgetItems = [
      { category_id: 'cat1', amount: 500 }
    ];
    // editando o item '1', então seu valor atual (400) sai da soma e entra o novo (600)
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 600, '1');
    expect(result.isOverflow).toBe(true);
    expect(result.totalChecklist).toBe(600);
  });

  it('ignora itens com amount nulo', () => {
    const globalItems = [
      { id: '1', category_id: 'cat1', amount: null, month_id: null, is_active: true }
    ];
    const budgetItems = [
      { category_id: 'cat1', amount: 500 }
    ];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(false);
    expect(result.totalChecklist).toBe(200);
  });

  it('retorna isOverflow: false quando não há orçamento definido para a categoria', () => {
    const globalItems = [
      { id: '1', category_id: 'cat1', amount: 400, month_id: null, is_active: true }
    ];
    const budgetItems = [];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(false);
  });

  it('filtra apenas itens com month_id === null e is_active === true', () => {
    const globalItems = [
      { id: '1', category_id: 'cat1', amount: 400, month_id: '2023-10', is_active: true },
      { id: '2', category_id: 'cat1', amount: 400, month_id: null, is_active: false }
    ];
    const budgetItems = [
      { category_id: 'cat1', amount: 500 }
    ];
    const result = checkGlobalBudgetOverflow(globalItems, budgetItems, 'cat1', 200);
    expect(result.isOverflow).toBe(false);
    expect(result.totalChecklist).toBe(200);
  });
});

describe('checkMonthBudgetOverflow', () => {
  it('retorna isOverflow: true quando soma de itens do mês excede orçamento', () => {
    const monthItems = [
      { id: '1', category_id: 'cat1', amount: 600 }
    ];
    const budgetItems = [
      { category_id: 'cat1', amount: 500 }
    ];
    const result = checkMonthBudgetOverflow(monthItems, budgetItems, 'cat1');
    expect(result.isOverflow).toBe(true);
    expect(result.totalChecklist).toBe(600);
  });

  it('retorna isOverflow: false quando soma <= orçamento', () => {
    const monthItems = [
      { id: '1', category_id: 'cat1', amount: 400 }
    ];
    const budgetItems = [
      { category_id: 'cat1', amount: 500 }
    ];
    const result = checkMonthBudgetOverflow(monthItems, budgetItems, 'cat1');
    expect(result.isOverflow).toBe(false);
    expect(result.totalChecklist).toBe(400);
  });
});
