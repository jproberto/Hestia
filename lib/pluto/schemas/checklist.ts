import { z } from "zod";

export const checklistItemTypeSchema = z.enum(["receita", "despesa"]);
export type ChecklistItemType = z.infer<typeof checklistItemTypeSchema>;

export const checklistItemInputSchema = z.object({
  day: z.number().int().min(1).max(31),
  description: z.string().min(1, "Descrição é obrigatória").max(255, "Descrição muito longa"),
  type: checklistItemTypeSchema,
  category_id: z.string().uuid("ID da categoria inválido"),
  amount: z.number().finite().nullable().optional(),
  created_by: z.string(),
});
export type ChecklistItemInput = z.infer<typeof checklistItemInputSchema>;

export const checklistItemSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  month_id: z.string().uuid().nullable().optional(),
  day: z.number().int().min(1).max(31),
  description: z.string().min(1).max(255),
  type: checklistItemTypeSchema,
  category_id: z.string().uuid(),
  amount: z.number().finite().nullable().optional(),
  is_completed: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  created_by: z.string(),
  category_name: z.string().optional(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const createChecklistItemDataSchema = z.object({
  day: z.number().int().min(1, "Dia deve ser entre 1 e 31").max(31, "Dia deve ser entre 1 e 31"),
  description: z.string().min(1, "Descrição é obrigatória").max(255, "Descrição muito longa"),
  type: checklistItemTypeSchema,
  category_id: z.string().uuid("ID da categoria inválido"),
  amount: z.number().finite().nullable().optional(),
  created_by: z.string(),
  isGlobal: z.boolean(),
});
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemDataSchema>;

export const updateChecklistItemDataSchema = z.object({
  day: z.number().int().min(1).max(31).optional(),
  description: z.string().min(1).max(255).optional(),
  type: checklistItemTypeSchema.optional(),
  category_id: z.string().uuid().optional(),
  amount: z.number().finite().nullable().optional(),
});
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemDataSchema>;

export const getMonthChecklistItemsParamsSchema = z.object({
  monthId: z.string().uuid("ID do mês inválido"),
});
export type GetMonthChecklistItemsParams = z.infer<typeof getMonthChecklistItemsParamsSchema>;

export const checklistOverflowResultSchema = z.object({
  isOverflow: z.boolean(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  totalChecklist: z.number().finite(),
  budgetAmount: z.number().finite(),
});
export type BudgetOverflowResult = z.infer<typeof checklistOverflowResultSchema>;

export const createChecklistWithOverflowParamsSchema = z.object({
  data: createChecklistItemDataSchema,
  globalItems: z.array(checklistItemSchema),
  budgetItems: z.array(z.object({
    category_id: z.string().uuid(),
    category_name: z.string().optional(),
    amount: z.number().finite(),
  })),
  currentMonthId: z.string().uuid().nullable().optional(),
  categories: z.array(z.object({
    id: z.string().uuid(),
    type: checklistItemTypeSchema,
  })).optional(),
});
export type CreateChecklistWithOverflowParams = z.infer<typeof createChecklistWithOverflowParamsSchema>;