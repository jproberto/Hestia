import { ChecklistItem } from "@/lib/pluto/repositories";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";

// Standalone functions for hooks
export async function getMonthChecklistItems(monthId: string): Promise<ChecklistItem[]> {
  const supabase = createBrowserDatabaseClient();
  const { getChecklistItemsByMonth: repo } = await import("@/lib/pluto/repositories/checklist");
  return repo(supabase, monthId);
}

export async function getGlobalItems(): Promise<ChecklistItem[]> {
  const supabase = createBrowserDatabaseClient();
  const { getGlobalChecklistItems: repo } = await import("@/lib/pluto/repositories/checklist");
  return repo(supabase);
}

export async function getOpenMonths(): Promise<{ id: string; month: number; year: number; status: string }[]> {
  const supabase = createBrowserDatabaseClient();
  const { getAllOpenMonthlyPeriods: repo } = await import("@/lib/pluto/repositories/months");
  return repo(supabase);
}