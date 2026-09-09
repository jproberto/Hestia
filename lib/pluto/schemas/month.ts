import { z } from "zod";

export const periodStatusSchema = z.enum(["aberto", "encerrado"]);
export type PeriodStatus = z.infer<typeof periodStatusSchema>;

export const monthlyPeriodSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  status: periodStatusSchema,
  created_at: z.string().datetime(),
  created_by: z.string(),
});
export type MonthlyPeriod = z.infer<typeof monthlyPeriodSchema>;

export const getMonthlyPeriodsParamsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
});
export type GetMonthlyPeriodsParams = z.infer<typeof getMonthlyPeriodsParamsSchema>;

export const openMonthlyPeriodParamsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  email: z.string().email(),
});
export type OpenMonthlyPeriodParams = z.infer<typeof openMonthlyPeriodParamsSchema>;

export const closeMonthlyPeriodParamsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  email: z.string().email(),
});
export type CloseMonthlyPeriodParams = z.infer<typeof closeMonthlyPeriodParamsSchema>;

export const allOpenMonthlyPeriodsSchema = z.array(monthlyPeriodSchema);
export type AllOpenMonthlyPeriods = z.infer<typeof allOpenMonthlyPeriodsSchema>;

export const monthlyPeriodsArraySchema = z.array(monthlyPeriodSchema);
export type MonthlyPeriodsArray = z.infer<typeof monthlyPeriodsArraySchema>;