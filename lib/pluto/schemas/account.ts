import { z } from "zod";

export const accountTypeSchema = z.enum(["conta", "cartao"]);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const accountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  type: accountTypeSchema,
  created_at: z.string().datetime().optional(),
  created_by: z.string().optional(),
});
export type Account = z.infer<typeof accountSchema>;

export const createAccountDataSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  type: accountTypeSchema.default("conta"),
});
export type CreateAccountInput = z.infer<typeof createAccountDataSchema>;

export const getOrCreateAccountParamsSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  email: z.string().email("Email inválido"),
  type: accountTypeSchema.default("conta"),
});
export type GetOrCreateAccountParams = z.infer<typeof getOrCreateAccountParamsSchema>;