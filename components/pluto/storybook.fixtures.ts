import type {
  Account,
  BudgetComparisonRow,
  BudgetItem,
  BudgetOverflowResult,
  Category,
  ChecklistItem,
  MonthlyPeriod,
  TransactionWithDetails,
} from "@/lib/pluto/types";

export const storyCategories: Category[] = [
  { id: "cat-1", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "story@hestia.com" },
  { id: "cat-2", name: "Salário", type: "receita", created_at: "2026-01-01T00:00:00Z", created_by: "story@hestia.com" },
  { id: "cat-3", name: "Contas", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: "story@hestia.com" },
];

export const storyAccounts: Account[] = [
  { id: "acc-1", name: "Itaú Corrente", type: "conta", created_at: null, created_by: null },
  { id: "acc-2", name: "Nubank", type: "cartao", created_at: null, created_by: null },
];

export const storyTransactions: TransactionWithDetails[] = [
  {
    id: "tx-1",
    description: "Supermercado",
    amount: 200,
    type: "despesa",
    is_refund: false,
    date: "2026-03-15",
    category_id: "cat-1",
    account_id: "acc-1",
    created_at: "2026-03-15T00:00:00Z",
    created_by: "story@hestia.com",
    category_name: "Alimentação",
    account_name: "Itaú Corrente",
  },
  {
    id: "tx-2",
    description: "Salário",
    amount: 5000,
    type: "receita",
    is_refund: false,
    date: "2026-03-05",
    category_id: "cat-2",
    account_id: "acc-1",
    created_at: "2026-03-05T00:00:00Z",
    created_by: "story@hestia.com",
    category_name: "Salário",
    account_name: "Itaú Corrente",
  },
];

export const storyChecklistItems: ChecklistItem[] = [
  {
    id: "chk-1",
    parent_id: null,
    month_id: "mes-1",
    day: 10,
    description: "Internet",
    type: "despesa",
    category_id: "cat-3",
    amount: 120,
    is_completed: false,
    is_active: true,
    created_at: "2026-03-01T00:00:00Z",
    created_by: "story@hestia.com",
    category_name: "Contas",
  },
  {
    id: "chk-2",
    parent_id: null,
    month_id: "mes-1",
    day: 5,
    description: "Aluguel",
    type: "despesa",
    category_id: "cat-3",
    amount: 1500,
    is_completed: true,
    is_active: true,
    created_at: "2026-03-01T00:00:00Z",
    created_by: "story@hestia.com",
    category_name: "Contas",
  },
];

export const storyBudgetItems: BudgetItem[] = [
  { category_id: "cat-1", category_name: "Alimentação", category_type: "despesa", amount: 1000, start_month: 1 },
  { category_id: "cat-2", category_name: "Salário", category_type: "receita", amount: 5000, start_month: 1 },
];

export const storyMonthlyPeriods: MonthlyPeriod[] = [
  { id: "mes-1", year: 2026, month: 3, status: "aberto", created_at: "2026-03-01T00:00:00Z", created_by: "story@hestia.com" },
  { id: "mes-2", year: 2026, month: 4, status: "aberto", created_at: "2026-04-01T00:00:00Z", created_by: "story@hestia.com" },
];

export const storyOverflow: BudgetOverflowResult & {
  categoryType: "receita" | "despesa";
  operationLabel: string;
} = {
  isOverflow: true,
  categoryId: "cat-3",
  categoryName: "Contas",
  totalChecklist: 600,
  budgetAmount: 500,
  categoryType: "despesa",
  operationLabel: "incluir",
};

export const storyReceitaRows: BudgetComparisonRow[] = [
  { category_name: "Salário", previsto: 5000, real: 4800 },
];

export const storyDespesaRows: BudgetComparisonRow[] = [
  { category_name: "Alimentação", previsto: 1000, real: 200 },
  { category_name: "Lazer", previsto: 0, real: 150 },
];
