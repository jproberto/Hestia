import { z } from "zod";

export const budgetAdjustmentSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  start_month: z.number().int().min(1).max(12),
  description: z.string().min(1).max(255),
  created_by: z.string(),
});
export type BudgetAdjustment = z.infer<typeof budgetAdjustmentSchema>;

export const budgetItemSchema = z.object({
  category_id: z.string().uuid(),
  category_name: z.string().min(1).max(100),
  category_type: z.enum(["receita", "despesa"]),
  amount: z.number().finite(),
  start_month: z.number().int().min(1).max(12),
});
export type BudgetItem = z.infer<typeof budgetItemSchema>;

export const createBudgetItemDataSchema = z.object({
  categoryName: z.string().min(1, "Nome da categoria é obrigatório").max(100, "Nome muito longo"),
  categoryType: z.enum(["receita", "despesa"]),
  amount: z.number().finite("Valor deve ser um número válido"),
});
export type CreateBudgetItemInput = z.infer<typeof createBudgetItemDataSchema>;

export const budgetSummarySchema = z.object({
  budgets: z.array(budgetItemSchema),
  categories: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    type: z.enum(["receita", "despesa"]),
    created_at: z.string().datetime(),
    created_by: z.string(),
  })),
});
export type BudgetSummary = z.infer<typeof budgetSummarySchema>;

export const initBudgetParamsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  email: z.string().email(),
});
export type InitBudgetParams = z.infer<typeof initBudgetParamsSchema>;

export const createMonthAdjustmentParamsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  email: z.string().email(),
});
export type CreateMonthAdjustmentParams = z.infer<typeof createMonthAdjustmentParamsSchema>;

export const getBudgetSummaryParamsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  startMonth: z.number().int().min(1).max(12),
});
export type GetBudgetSummaryParams = z.infer<typeof getBudgetSummaryParamsSchema>;

export const getAllAdjustmentsParamsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
});
export type GetAllAdjustmentsParams = z.infer<typeof getAllAdjustmentsParamsSchema>;

export const saveBudgetItemParamsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  startMonth: z.number().int().min(1).max(12),
  data: createBudgetItemDataSchema,
  email: z.string().email(),
});
export type SaveBudgetItemParams = z.infer<typeof saveBudgetItemParamsSchema>;

export const updateBudgetItemParamsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  startMonth: z.number().int().min(1).max(12),
  categoryName: z.string().min(1).max(100),
  categoryType: z.enum(["receita", "despesa"]),
  amount: z.number().finite(),
  email: z.string().email(),
});
export type UpdateBudgetItemParams = z.infer<typeof updateBudgetItemParamsSchema>;