import { SupabaseClient } from "@supabase/supabase-js";
import { instantiateGlobalChecklistItemsForMonth } from "@/lib/pluto/db/checklist";

export interface MonthlyPeriod {
  id: string;
  year: number;
  month: number;
  status: 'aberto' | 'encerrado';
  created_at: string;
  created_by: string;
}

export async function getMonthlyPeriods(
  supabase: SupabaseClient,
  year: number
): Promise<MonthlyPeriod[]> {
  const { data, error } = await supabase
    .from("monthly_periods")
    .select("*")
    .eq("year", year)
    .order("month", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAllOpenMonthlyPeriods(
  supabase: SupabaseClient
): Promise<MonthlyPeriod[]> {
  const { data, error } = await supabase
    .from("monthly_periods")
    .select("*")
    .eq("status", "aberto")
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function openMonthlyPeriod(
  supabase: SupabaseClient,
  year: number,
  month: number,
  email: string
): Promise<void> {
  const { data, error } = await supabase
    .from("monthly_periods")
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
    await instantiateGlobalChecklistItemsForMonth(supabase, data.id, email);
  }
}

export async function closeMonthlyPeriod(
  supabase: SupabaseClient,
  year: number,
  month: number,
  email: string
): Promise<void> {
  const { error } = await supabase
    .from("monthly_periods")
    .upsert({
      year,
      month,
      status: "encerrado",
      created_by: email
    }, { onConflict: "year,month" });

  if (error) throw error;
}
