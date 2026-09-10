import { TransactionWithDetails } from "@/lib/pluto/repositories";
import { AvailablePeriods } from "@/lib/pluto/types";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";

// Standalone functions for hooks (create Supabase client internally)
export async function getTransactionsForMonth(year: number, month: number): Promise<TransactionWithDetails[]> {
  const supabase = createBrowserDatabaseClient();
  const { getTransactionsByMonth } = await import("@/lib/pluto/repositories/transactions");
  return getTransactionsByMonth(supabase, year, month);
}

export async function getAvailableYearsAndMonths(): Promise<AvailablePeriods> {
  const supabase = createBrowserDatabaseClient();
  const { getAllOpenMonthlyPeriods } = await import("@/lib/pluto/repositories/months");
  const allOpen = await getAllOpenMonthlyPeriods(supabase);
  const years = Array.from(new Set(allOpen.map((p) => p.year))).sort((a, b) => a - b);
  return { years, openMonths: allOpen };
}

export function computeMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}