import { SupabaseClient } from "@supabase/supabase-js";

export interface TransactionInput {
  description: string;
  amount: number;
  type: "receita" | "despesa";
  is_refund: boolean;
  date: string; // Formato YYYY-MM-DD
  category_id: string;
  account_id: string;
}

export interface TransactionWithDetails {
  id: string;
  description: string;
  amount: number;
  type: "receita" | "despesa";
  is_refund: boolean;
  date: string;
  category_id: string;
  account_id: string;
  created_at: string;
  created_by: string;
  category_name?: string;
  account_name?: string;
}

interface TransactionRow extends TransactionWithDetails {
  categories?: { name: string } | null;
  financial_accounts?: { name: string } | null;
}

export async function getTransactionsByMonth(
  supabase: SupabaseClient,
  year: number,
  month: number
): Promise<TransactionWithDetails[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      categories ( name ),
      financial_accounts ( name )
    `)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) throw error;

  return ((data || []) as unknown as TransactionRow[]).map((t) => ({
    ...t,
    category_name: t.categories?.name ?? "Sem categoria",
    account_name: t.financial_accounts?.name ?? "Sem conta",
  }));
}

export async function createTransaction(
  supabase: SupabaseClient,
  input: TransactionInput,
  email: string
): Promise<TransactionWithDetails> {
  const [yearStr, monthStr] = input.date.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const { data: period, error: periodError } = await supabase
    .from("monthly_periods")
    .select("status")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (periodError) throw periodError;

  if (!period || period.status !== "aberto") {
    throw new Error(
      `Não é possível registrar transações no período ${month}/${year} pois ele não está aberto.`
    );
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      is_refund: input.is_refund,
      date: input.date,
      category_id: input.category_id,
      account_id: input.account_id,
      created_by: email,
    })
    .select(`
      *,
      categories ( name ),
      financial_accounts ( name )
    `)
    .single();

  if (error) throw error;

  const row = data as unknown as TransactionRow;

  return {
    ...row,
    category_name: row.categories?.name ?? "Sem categoria",
    account_name: row.financial_accounts?.name ?? "Sem conta",
  };
}

export async function updateTransaction(
  supabase: SupabaseClient,
  id: string,
  input: TransactionInput,
  email: string
): Promise<TransactionWithDetails> {
  const [yearStr, monthStr] = input.date.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const { data: period, error: periodError } = await supabase
    .from("monthly_periods")
    .select("status")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (periodError) throw periodError;

  if (!period || period.status !== "aberto") {
    throw new Error(
      `Não é possível alterar transações no período ${month}/${year} pois ele não está aberto.`
    );
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      is_refund: input.is_refund,
      date: input.date,
      category_id: input.category_id,
      account_id: input.account_id,
    })
    .eq("id", id)
    .select(`
      *,
      categories ( name ),
      financial_accounts ( name )
    `)
    .single();

  if (error) throw error;

  const row = data as unknown as TransactionRow;

  return {
    ...row,
    category_name: row.categories?.name ?? "Sem categoria",
    account_name: row.financial_accounts?.name ?? "Sem conta",
  };
}

export async function deleteTransaction(
  supabase: SupabaseClient,
  id: string,
  email: string
): Promise<void> {
  const { data: tx, error: fetchError } = await supabase
    .from("transactions")
    .select("id, date")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;
  if (!tx) throw new Error("Transação não encontrada.");

  const [yearStr, monthStr] = (tx.date as string).split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const { data: period, error: periodError } = await supabase
    .from("monthly_periods")
    .select("status")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (periodError) throw periodError;

  if (!period || period.status !== "aberto") {
    throw new Error(
      `Não é possível excluir transações no período ${month}/${year} pois ele não está aberto.`
    );
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

