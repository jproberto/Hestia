import { z } from "zod";

export const transactionTypeSchema = z.enum(["receita", "despesa"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const createTransactionDataSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").max(255, "Descrição muito longa"),
  amount: z.number().positive("Valor deve ser positivo").finite("Valor deve ser um número válido"),
  type: transactionTypeSchema,
  is_refund: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  account_name: z.string().min(1, "Nome da conta é obrigatório").max(100, "Nome da conta muito longo"),
  account_type: z.enum(["conta", "cartao"]),
  category_name: z.string().min(1, "Nome da categoria é obrigatório").max(100, "Nome da categoria muito longo"),
});
export type CreateTransactionInput = z.infer<typeof createTransactionDataSchema>;

export const transactionInputSchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().positive().finite(),
  type: transactionTypeSchema,
  is_refund: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid("ID da categoria inválido"),
  account_id: z.string().uuid("ID da conta inválido"),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const transactionWithDetailsSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(255),
  amount: z.number().finite(),
  type: transactionTypeSchema,
  is_refund: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid(),
  account_id: z.string().uuid(),
  created_at: z.string().datetime(),
  created_by: z.string(),
  category_name: z.string().optional(),
  account_name: z.string().optional(),
});
export type TransactionWithDetails = z.infer<typeof transactionWithDetailsSchema>;

export const computeMonthRangeSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});
export type ComputeMonthRangeInput = z.infer<typeof computeMonthRangeSchema>;

export const availableYearsMonthsSchema = z.object({
  years: z.array(z.number().int().min(2000).max(2100)),
  openMonths: z.array(z.object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
  })),
});
export type AvailableYearsMonthsOutput = z.infer<typeof availableYearsMonthsSchema>;