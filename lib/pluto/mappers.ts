// Mapeadores explícitos entre camadas do módulo Pluto
// FormData (UI) → DTO (Service) → Input (Repository) → Row (DB)

import type {
  // FormData
  CreateTransactionFormData,
  UpdateTransactionFormData,
  CreateChecklistItemFormData,
  UpdateChecklistItemFormData,
  CreateBudgetItemFormData,
  UpdateBudgetItemFormData,
  // DTO
  CreateTransactionDTO,
  UpdateTransactionDTO,
  CreateChecklistItemDTO,
  UpdateChecklistItemDTO,
  CreateBudgetItemDTO,
  // Repository Input
  TransactionInput,
  ChecklistItemInput,
  BudgetItemInput,
  // Domain
  TransactionWithDetails,
  ChecklistItem,
  BudgetItem,
  Category,
  Account,
  MonthlyPeriod,
  // Row
  TransactionRow,
  ChecklistItemRow,
  CategoryRow,
  AccountRow,
  MonthlyPeriodRow,
  BudgetAdjustmentRow,
  BudgetItemRow,
  BudgetAdjustment,
} from "./types";

// ============================================================================
// TRANSACTION MAPPERS
// ============================================================================

/** FormData (UI) → DTO (Service) */
export function transactionFormDataToDTO(
  formData: CreateTransactionFormData,
  categoryId: string,
  accountId: string
): CreateTransactionDTO {
  return {
    description: formData.description.trim(),
    amount: formData.amount,
    type: formData.type,
    is_refund: formData.is_refund,
    date: formData.date,
    category_id: categoryId,
    account_id: accountId,
  };
}

export function transactionFormDataToUpdateDTO(
  formData: UpdateTransactionFormData,
  categoryId?: string,
  accountId?: string
): UpdateTransactionDTO {
  const dto: UpdateTransactionDTO = {};
  if (formData.description !== undefined) dto.description = formData.description.trim();
  if (formData.amount !== undefined) dto.amount = formData.amount;
  if (formData.type !== undefined) dto.type = formData.type;
  if (formData.is_refund !== undefined) dto.is_refund = formData.is_refund;
  if (formData.date !== undefined) dto.date = formData.date;
  if (categoryId !== undefined) dto.category_id = categoryId;
  if (accountId !== undefined) dto.account_id = accountId;
  return dto;
}

/** DTO (Service) → Input (Repository) */
export function transactionDTOToInput(dto: CreateTransactionDTO): TransactionInput {
  return {
    description: dto.description,
    amount: dto.amount,
    type: dto.type,
    is_refund: dto.is_refund,
    date: dto.date,
    category_id: dto.category_id,
    account_id: dto.account_id,
  };
}

export function transactionUpdateDTOToInput(dto: UpdateTransactionDTO): Partial<TransactionInput> {
  const input: Partial<TransactionInput> = {};
  if (dto.description !== undefined) input.description = dto.description;
  if (dto.amount !== undefined) input.amount = dto.amount;
  if (dto.type !== undefined) input.type = dto.type;
  if (dto.is_refund !== undefined) input.is_refund = dto.is_refund;
  if (dto.date !== undefined) input.date = dto.date;
  if (dto.category_id !== undefined) input.category_id = dto.category_id;
  if (dto.account_id !== undefined) input.account_id = dto.account_id;
  return input;
}

/** Row (DB) → Domain (enriquecido) */
export function transactionRowToDomain(
  row: TransactionRow,
  categoryName: string,
  accountName: string
): TransactionWithDetails {
  return {
    ...row,
    category_name: categoryName,
    account_name: accountName,
  };
}

/** Domain → FormData (para edição) */
export function transactionDomainToFormData(domain: TransactionWithDetails): CreateTransactionFormData {
  return {
    description: domain.description,
    amount: domain.amount,
    type: domain.type,
    is_refund: domain.is_refund,
    date: domain.date,
    account_name: domain.account_name,
    account_type: "conta", // Será preenchido pelo caller se necessário
    category_name: domain.category_name,
  };
}

// ============================================================================
// CHECKLIST MAPPERS
// ============================================================================

/** FormData (UI) → DTO (Service) */
export function checklistFormDataToDTO(
  formData: CreateChecklistItemFormData,
  createdBy: string
): CreateChecklistItemDTO {
  return {
    day: formData.day,
    description: formData.description.trim(),
    type: formData.type,
    category_id: formData.category_id,
    amount: formData.amount ?? null,
    created_by: createdBy,
    isGlobal: formData.isGlobal,
  };
}

export function checklistFormDataToUpdateDTO(
  formData: UpdateChecklistItemFormData
): UpdateChecklistItemDTO {
  const dto: UpdateChecklistItemDTO = {};
  if (formData.day !== undefined) dto.day = formData.day;
  if (formData.description !== undefined) dto.description = formData.description.trim();
  if (formData.type !== undefined) dto.type = formData.type;
  if (formData.category_id !== undefined) dto.category_id = formData.category_id;
  if (formData.amount !== undefined) dto.amount = formData.amount ?? null;
  if (formData.isGlobal !== undefined) dto.isGlobal = formData.isGlobal;
  return dto;
}

/** DTO (Service) → Input (Repository) */
export function checklistDTOToInput(dto: CreateChecklistItemDTO): ChecklistItemInput {
  return {
    day: dto.day,
    description: dto.description,
    type: dto.type,
    category_id: dto.category_id,
    amount: dto.amount,
    created_by: dto.created_by,
  };
}

export function checklistUpdateDTOToInput(dto: UpdateChecklistItemDTO): Partial<ChecklistItemInput> {
  const input: Partial<ChecklistItemInput> = {};
  if (dto.day !== undefined) input.day = dto.day;
  if (dto.description !== undefined) input.description = dto.description;
  if (dto.type !== undefined) input.type = dto.type;
  if (dto.category_id !== undefined) input.category_id = dto.category_id;
  if (dto.amount !== undefined) input.amount = dto.amount;
  return input;
}

/** Row (DB) → Domain (enriquecido) */
export function checklistRowToDomain(row: ChecklistItemRow, categoryName: string): ChecklistItem {
  return {
    ...row,
    category_name: categoryName,
  };
}

/** Domain → FormData (para edição) */
export function checklistDomainToFormData(domain: ChecklistItem): CreateChecklistItemFormData {
  return {
    day: domain.day,
    description: domain.description,
    type: domain.type,
    category_id: domain.category_id,
    amount: domain.amount,
    isGlobal: domain.month_id === null,
  };
}

// ============================================================================
// BUDGET MAPPERS
// ============================================================================

/** FormData (UI) → DTO (Service) */
export function budgetFormDataToDTO(
  formData: CreateBudgetItemFormData,
  categoryId: string,
  adjustmentId: string
): CreateBudgetItemDTO {
  return {
    category_id: categoryId,
    amount: formData.amount,
    adjustment_id: adjustmentId,
  };
}

export function budgetFormDataToUpdateDTO(formData: UpdateBudgetItemFormData): Partial<CreateBudgetItemDTO> {
  const dto: Partial<CreateBudgetItemDTO> = {};
  if (formData.amount !== undefined) dto.amount = formData.amount;
  // category_id e adjustment_id geralmente não mudam em update
  return dto;
}

/** DTO (Service) → Input (Repository) */
export function budgetDTOToInput(dto: CreateBudgetItemDTO): BudgetItemInput {
  return {
    category_id: dto.category_id,
    amount: dto.amount,
  };
}

/** Row (DB) + Category + Adjustment → Domain */
export function budgetRowToDomain(
  row: BudgetItemRow,
  category: CategoryRow,
  startMonth: number
): BudgetItem {
  return {
    category_id: row.category_id,
    category_name: category.name,
    category_type: category.type,
    amount: row.amount,
    start_month: startMonth,
  };
}

// ============================================================================
// CATEGORY MAPPERS
// ============================================================================

/** Row → Domain */
export function categoryRowToDomain(row: CategoryRow): Category {
  return { ...row };
}

// ============================================================================
// ACCOUNT MAPPERS
// ============================================================================

/** Row → Domain */
export function accountRowToDomain(row: AccountRow): Account {
  return { ...row };
}

// ============================================================================
// MONTHLY PERIOD MAPPERS
// ============================================================================

/** Row → Domain */
export function monthlyPeriodRowToDomain(row: MonthlyPeriodRow): MonthlyPeriod {
  return { ...row };
}

// ============================================================================
// BUDGET ADJUSTMENT MAPPERS
// ============================================================================

/** Row → Domain */
export function budgetAdjustmentRowToDomain(row: BudgetAdjustmentRow): BudgetAdjustment {
  return { ...row };
}

// ============================================================================
// UTILITY MAPPERS
// ============================================================================

/** Extrai category_id de Category pelo nome */
export function findCategoryIdByName(categories: Category[], name: string): string | undefined {
  return categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id;
}

/** Extrai account_id de Account pelo nome */
export function findAccountIdByName(accounts: Account[], name: string): string | undefined {
  return accounts.find((a) => a.name.toLowerCase() === name.toLowerCase())?.id;
}