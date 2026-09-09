import { z } from "zod";

export const categoryTypeSchema = z.enum(["receita", "despesa"]);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  type: categoryTypeSchema,
  created_at: z.string().datetime(),
  created_by: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const createCategoryDataSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  type: categoryTypeSchema,
});
export type CreateCategoryInput = z.infer<typeof createCategoryDataSchema>;

export const getCategoriesParamsSchema = z.object({
  type: categoryTypeSchema.optional(),
});
export type GetCategoriesParams = z.infer<typeof getCategoriesParamsSchema>;