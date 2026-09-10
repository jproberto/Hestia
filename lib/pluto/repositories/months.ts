import { IDatabaseClient } from "@/lib/shared/database";
import { instantiateGlobalChecklistItemsForMonth } from "@/lib/pluto/repositories/checklist";
import type { MonthlyPeriod, MonthlyPeriodRow } from "../types";

export type { MonthlyPeriod, MonthlyPeriodRow };

export async function getMonthlyPeriods(
  db: IDatabaseClient,
  year: number
): Promise<MonthlyPeriod[]> {
  const { data, error } = await db
    .from<MonthlyPeriodRow>("monthly_periods")
    .select("*")
    .eq("year", year)
    .order("month", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAllOpenMonthlyPeriods(
  db: IDatabaseClient
): Promise<MonthlyPeriod[]> {
  const { data, error } = await db
    .from<MonthlyPeriodRow>("monthly_periods")
    .select("*")
    .eq("status", "aberto")
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function openMonthlyPeriod(
  db: IDatabaseClient,
  year: number,
  month: number,
  email: string
): Promise<void> {
  const { data, error } = await db
    .from<MonthlyPeriodRow>("monthly_periods")
    .upsert({
      year,
      month,
      status: "aberto",
      created_by: email
    }, { onConflict: "year,month" })
    .select("id")
    .single();

  if (error) throw error;

  if (data?.id) {
    await instantiateGlobalChecklistItemsForMonth(db, data.id, email);
  }
}

export async function closeMonthlyPeriod(
  db: IDatabaseClient,
  year: number,
  month: number,
  email: string
): Promise<void> {
  const { error } = await db
    .from<MonthlyPeriodRow>("monthly_periods")
    .upsert({
      year,
      month,
      status: "encerrado",
      created_by: email
    }, { onConflict: "year,month" });

  if (error) throw error;
}

// Standalone functions for hooks
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";

export async function getMonthlyPeriodsStandalone(year: number): Promise<MonthlyPeriod[]> {
  const db = createBrowserDatabaseClient();
  return getMonthlyPeriods(db, year);
}

export async function getAllOpenMonthlyPeriodsStandalone(): Promise<MonthlyPeriod[]> {
  const db = createBrowserDatabaseClient();
  return getAllOpenMonthlyPeriods(db);
}