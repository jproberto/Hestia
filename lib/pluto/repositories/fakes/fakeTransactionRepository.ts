import type { ITransactionRepository } from "../interfaces";
import type {
  TransactionInput,
  TransactionWithDetails,
  Category,
  Account,
  MonthlyPeriod,
} from "@/lib/pluto/types";

export class FakeTransactionRepository implements ITransactionRepository {
  private transactions: Map<string, TransactionWithDetails> = new Map();
  private categories: Map<string, Category> = new Map();
  private accounts: Map<string, Account> = new Map();
  private monthlyPeriods: Map<string, MonthlyPeriod> = new Map();
  private idCounter = 0;

  constructor(
    initialTransactions: TransactionWithDetails[] = [],
    initialCategories: Category[] = [],
    initialAccounts: Account[] = [],
    initialMonthlyPeriods: MonthlyPeriod[] = []
  ) {
    initialTransactions.forEach((t) => this.transactions.set(t.id, t));
    initialCategories.forEach((c) => this.categories.set(c.id, c));
    initialAccounts.forEach((a) => this.accounts.set(a.id, a));
    initialMonthlyPeriods.forEach((p) => this.monthlyPeriods.set(`${p.year}-${p.month}`, p));
  }

  reset(): void {
    this.transactions.clear();
    this.categories.clear();
    this.accounts.clear();
    this.monthlyPeriods.clear();
    this.idCounter = 0;
  }

  seed(data: {
    transactions?: TransactionWithDetails[];
    categories?: Category[];
    accounts?: Account[];
    monthlyPeriods?: MonthlyPeriod[];
  }): void {
    this.reset();
    data.transactions?.forEach((t) => this.transactions.set(t.id, t));
    data.categories?.forEach((c) => this.categories.set(c.id, c));
    data.accounts?.forEach((a) => this.accounts.set(a.id, a));
    data.monthlyPeriods?.forEach((p) => this.monthlyPeriods.set(`${p.year}-${p.month}`, p));
  }

  private generateId(): string {
    return `tx-${++this.idCounter}-${Date.now()}`;
  }

  private getMonthKey(year: number, month: number): string {
    return `${year}-${month}`;
  }

  private checkPeriodOpen(year: number, month: number, operation: "registrar" | "alterar" | "excluir" = "registrar"): void {
    const period = this.monthlyPeriods.get(this.getMonthKey(year, month));
    if (!period || period.status !== "aberto") {
      const verbs = {
        registrar: "registrar",
        alterar: "alterar",
        excluir: "excluir",
      };
      throw new Error(
        `Não é possível ${verbs[operation]} transações no período ${month}/${year} pois ele não está aberto.`
      );
    }
  }

  async getTransactionsByMonth(year: number, month: number): Promise<TransactionWithDetails[]> {
    const { startDate, endDate } = getMonthRange(year, month);
    const results: TransactionWithDetails[] = [];

    for (const tx of this.transactions.values()) {
      if (tx.date >= startDate && tx.date <= endDate) {
        results.push(tx);
      }
    }

    results.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.id.localeCompare(b.id);
    });

    return results;
  }

  async createTransaction(input: TransactionInput, email: string): Promise<TransactionWithDetails> {
    const { year, month } = parseYearMonth(input.date);
    this.checkPeriodOpen(year, month, "registrar");

    const id = this.generateId();
    const now = new Date().toISOString();

    const category = this.categories.get(input.category_id);
    const account = this.accounts.get(input.account_id);

    const transaction: TransactionWithDetails = {
      id,
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      is_refund: input.is_refund,
      date: input.date,
      category_id: input.category_id,
      account_id: input.account_id,
      created_at: now,
      created_by: email,
      category_name: category?.name ?? "Sem categoria",
      account_name: account?.name ?? "Sem conta",
    };

    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: string, input: TransactionInput): Promise<TransactionWithDetails> {
    const { year, month } = parseYearMonth(input.date);
    this.checkPeriodOpen(year, month, "alterar");

    const existing = this.transactions.get(id);
    if (!existing) {
      throw new Error("Transação não encontrada.");
    }

    const category = this.categories.get(input.category_id);
    const account = this.accounts.get(input.account_id);

    const updated: TransactionWithDetails = {
      ...existing,
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      is_refund: input.is_refund,
      date: input.date,
      category_id: input.category_id,
      account_id: input.account_id,
      category_name: category?.name ?? "Sem categoria",
      account_name: account?.name ?? "Sem conta",
    };

    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    const existing = this.transactions.get(id);
    if (!existing) {
      throw new Error("Transação não encontrada.");
    }

    const { year, month } = parseYearMonth(existing.date);
    this.checkPeriodOpen(year, month, "excluir");

    this.transactions.delete(id);
  }
}

function getMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function parseYearMonth(date: string): { year: number; month: number } {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}