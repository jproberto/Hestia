import { IDatabaseClient } from "@/lib/shared/database";
import type {
  TransactionInput,
  TransactionUpdateInput,
  TransactionWithDetails,
  TransactionRow,
} from "../types";

export type { TransactionInput, TransactionUpdateInput, TransactionWithDetails, TransactionRow };

export async function getTransactionsByMonth(
  db: IDatabaseClient,
  year: number,
  month: number
): Promise<TransactionWithDetails[]> {
  const { data, error } = await db
    .from<TransactionRow>("transactions")
    .select(`
      *,
      categories ( name ),
      financial_accounts ( name )
    `)
    .eq("period_year", year)
    .eq("period_month", month)
    .order("date", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  return ((data || []) as unknown as TransactionRow[]).map((t) => ({
    ...t,
    category_name: t.categories?.name ?? "Sem categoria",
    account_name: t.financial_accounts?.name ?? "Sem conta",
  }));
}

export async function createTransaction(
  db: IDatabaseClient,
  input: TransactionInput,
  email: string
): Promise<TransactionWithDetails> {
  const { data: period, error: periodError } = await db
    .from<{ status: string }>("monthly_periods")
    .select("status")
    .eq("year", input.period_year)
    .eq("month", input.period_month)
    .maybeSingle();

  if (periodError) throw periodError;

  if (!period || period.status !== "aberto") {
    throw new Error(
      `Não é possível registrar transações no período ${input.period_month}/${input.period_year} pois ele não está aberto.`
    );
  }

  const { data, error } = await db
    .from<TransactionRow>("transactions")
    .insert({
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      is_refund: input.is_refund,
      date: input.date,
      category_id: input.category_id,
      account_id: input.account_id,
      period_year: input.period_year,
      period_month: input.period_month,
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
  db: IDatabaseClient,
  id: string,
  input: TransactionUpdateInput
): Promise<TransactionWithDetails> {
  const { data: existing, error: fetchError } = await db
    .from<TransactionRow>("transactions")
    .select("id, period_year, period_month")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Transação não encontrada.");

  const { data: period, error: periodError } = await db
    .from<{ status: string }>("monthly_periods")
    .select("status")
    .eq("year", existing.period_year)
    .eq("month", existing.period_month)
    .maybeSingle();

  if (periodError) throw periodError;

  if (!period || period.status !== "aberto") {
    throw new Error(
      `Não é possível alterar transações no período ${existing.period_month}/${existing.period_year} pois ele não está aberto.`
    );
  }

  const { data, error } = await db
    .from<TransactionRow>("transactions")
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
  db: IDatabaseClient,
  id: string
): Promise<void> {
  const { data: tx, error: fetchError } = await db
    .from<TransactionRow>("transactions")
    .select("id, period_year, period_month")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;
  if (!tx) throw new Error("Transação não encontrada.");

  const { data: period, error: periodError } = await db
    .from<{ status: string }>("monthly_periods")
    .select("status")
    .eq("year", tx.period_year)
    .eq("month", tx.period_month)
    .maybeSingle();

  if (periodError) throw periodError;

  if (!period || period.status !== "aberto") {
    throw new Error(
      `Não é possível excluir transações no período ${tx.period_month}/${tx.period_year} pois ele não está aberto.`
    );
  }

  const { error } = await db.from<TransactionRow>("transactions").delete().eq("id", id);
  if (error) throw error;
}
