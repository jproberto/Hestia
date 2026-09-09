// Types consolidados do módulo Pluto - Fonte única de verdade
// Exportados publicamente via lib/pluto/index.ts

// Re-export shared utilities
export type {
  ItemUrgency,
} from "@/lib/shared";

export {
  MONTH_NAMES,
  formatCurrency,
  formatCurrencyOptional,
  formatDateBR,
  getMonthRange,
  parseYearMonth,
  getItemUrgency,
  getUrgencyBadgeConfig,
} from "@/lib/shared";

export function getMonthLabel(month: number): string {
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return names[month - 1] ?? "";
}

// ============================================================================
// TIPOS DE BANCO DE DADOS (Row types - estrutura bruta do Supabase)
// ============================================================================

export interface TransactionRow {
  id: string;
  description: string;
  amount: number;
  type: "receita" | "despesa";
  is_refund: boolean;
  date: string;
  category_id: string;
  account_id: string;
  created_at: string;
  created_by: string;
  categories?: { name: string } | null;
  financial_accounts?: { name: string } | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  type: "receita" | "despesa";
  created_at: string;
  created_by: string;
}

export interface AccountRow {
  id: string;
  name: string;
  type: "conta" | "cartao";
  created_at: string | null;
  created_by: string | null;
}

export interface MonthlyPeriodRow {
  id: string;
  year: number;
  month: number;
  status: "aberto" | "encerrado";
  created_at: string;
  created_by: string;
}

export interface ChecklistItemRow {
  id: string;
  parent_id: string | null;
  month_id: string | null;
  day: number;
  description: string;
  type: "receita" | "despesa";
  category_id: string;
  amount: number | null;
  is_completed: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string;
  categories?: { name: string } | null;
}

export interface BudgetAdjustmentRow {
  id: string;
  year: number;
  start_month: number;
  description: string;
  created_by: string;
}

export interface BudgetItemRow {
  adjustment_id: string;
  category_id: string;
  amount: number;
  created_by: string;
}

// ============================================================================
// TIPOS DE ENTRADA DO REPOSITÓRIO (Repository Input types)
// ============================================================================

export interface TransactionInput {
  description: string;
  amount: number;
  type: "receita" | "despesa";
  is_refund: boolean;
  date: string; // YYYY-MM-DD
  category_id: string;
  account_id: string;
}

export interface ChecklistItemInput {
  day: number;
  description: string;
  type: "receita" | "despesa";
  category_id: string;
  amount: number | null;
  created_by: string;
}

export interface BudgetItemInput {
  category_id: string;
  amount: number;
}

// ============================================================================
// TIPOS DE DOMÍNIO (Domain types - com dados enriquecidos/joined)
// ============================================================================

export interface TransactionWithDetails {
  id: string;
  description: string;
  amount: number;
  type: "receita" | "despesa";
  is_refund: boolean;
  date: string;
  category_id: string;
  account_id: string;
  created_at: string;
  created_by: string;
  category_name: string;
  account_name: string;
}

export interface Category {
  id: string;
  name: string;
  type: "receita" | "despesa";
  created_at: string;
  created_by: string;
}

export interface Account {
  id: string;
  name: string;
  type: "conta" | "cartao";
  created_at: string | null;
  created_by: string | null;
}

export interface MonthlyPeriod {
  id: string;
  year: number;
  month: number;
  status: "aberto" | "encerrado";
  created_at: string;
  created_by: string;
}

export interface ChecklistItem {
  id: string;
  parent_id?: string | null;
  month_id?: string | null;
  day: number;
  description: string;
  type: "receita" | "despesa";
  category_id: string;
  amount: number | null;
  is_completed: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string;
  category_name: string;
}

export interface BudgetAdjustment {
  id: string;
  year: number;
  start_month: number;
  description: string;
  created_by: string;
}

export interface BudgetItem {
  category_id: string;
  category_name: string;
  category_type: "receita" | "despesa";
  amount: number;
  start_month: number;
}

// ============================================================================
// TIPOS DE FORMULÁRIO/UI (FormData types - dados vindos do frontend)
// ============================================================================

export interface CreateTransactionFormData {
  description: string;
  amount: number;
  type: "receita" | "despesa";
  is_refund: boolean;
  date: string;
  account_name: string;
  account_type: "conta" | "cartao";
  category_name: string;
}

export type UpdateTransactionFormData = Partial<CreateTransactionFormData>;

export interface CreateChecklistItemFormData {
  day: number;
  description: string;
  type: "receita" | "despesa";
  category_id: string;
  amount: number | null;
  isGlobal: boolean;
}

export type UpdateChecklistItemFormData = Partial<CreateChecklistItemFormData>;

export interface CreateBudgetItemFormData {
  categoryName: string;
  categoryType: "receita" | "despesa";
  amount: number;
}

export type UpdateBudgetItemFormData = Partial<CreateBudgetItemFormData>;

// ============================================================================
// TIPOS DE SERVIÇO/DTO (Service/DTO types - entrada dos services)
// ============================================================================

export interface CreateTransactionDTO {
  description: string;
  amount: number;
  type: "receita" | "despesa";
  is_refund: boolean;
  date: string;
  category_id: string;
  account_id: string;
}

export type UpdateTransactionDTO = Partial<CreateTransactionDTO>;

export interface CreateChecklistItemDTO {
  day: number;
  description: string;
  type: "receita" | "despesa";
  category_id: string;
  amount: number | null;
  created_by: string;
  isGlobal: boolean;
}

export type UpdateChecklistItemDTO = Partial<CreateChecklistItemDTO>;

export interface CreateBudgetItemDTO {
  category_id: string;
  amount: number;
  adjustment_id: string;
}

// ============================================================================
// TIPOS AUXILIARES E RESULTADOS
// ============================================================================

/**
 * Minimal budget shape needed for overflow checks.
 * Full BudgetItem[] is assignable to this.
 */
export interface BudgetLikeItem {
  category_id: string;
  amount: number;
  category_name?: string;
}

export interface BudgetOverflowResult {
  isOverflow: boolean;
  categoryId: string;
  categoryName: string;
  totalChecklist: number;
  budgetAmount: number;
  categoryType?: "receita" | "despesa";
}

export interface BudgetSummary {
  budgets: BudgetItem[];
  categories: Category[];
}

/** Linha agregada do comparativo orçado vs real (receitas ou despesas). */
export interface BudgetComparisonRow {
  category_name: string;
  previsto: number;
  real: number;
}

/** Conta/cartão com suas transações do mês (para o grid de extratos). */
export interface AccountCardData {
  account: Account;
  txs: TransactionWithDetails[];
}

/** Operação de checklist pendente de confirmação de overflow de orçamento. */
export interface ChecklistPendingOperation {
  type: "create" | "edit";
  input: ChecklistItemInput;
  isGlobal: boolean;
  itemId?: string;
  updateGlobal?: boolean;
  parentId?: string | null;
}

/** Estado do modal de estouro de orçamento do checklist. */
export interface ChecklistOverflowState extends BudgetOverflowResult {
  categoryType: "receita" | "despesa";
  operationLabel: string;
  pendingOperation: ChecklistPendingOperation | null;
}

export interface AvailablePeriods {
  years: number[];
  openMonths: MonthlyPeriod[];
}

// ============================================================================
// TYPE ALIASES E ENUMS
// ============================================================================

export type TransactionType = "receita" | "despesa";
export type AccountType = "conta" | "cartao";
export type PeriodStatus = "aberto" | "encerrado";

// ============================================================================
// CONSTANTES (usando as re-exportadas do shared)
// ============================================================================

export const TRANSACTION_TYPES: TransactionType[] = ["receita", "despesa"];
export const ACCOUNT_TYPES: AccountType[] = ["conta", "cartao"];
export const PERIOD_STATUSES: PeriodStatus[] = ["aberto", "encerrado"];