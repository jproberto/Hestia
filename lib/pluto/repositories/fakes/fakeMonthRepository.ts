import type { IMonthRepository } from "../interfaces";
import type { MonthlyPeriod } from "@/lib/pluto/types";

export class FakeMonthRepository implements IMonthRepository {
  private monthlyPeriods: Map<string, MonthlyPeriod> = new Map();
  private idCounter = 0;

  constructor(initialPeriods: MonthlyPeriod[] = []) {
    initialPeriods.forEach((p) => this.monthlyPeriods.set(`${p.year}-${p.month}`, p));
  }

  reset(): void {
    this.monthlyPeriods.clear();
    this.idCounter = 0;
  }

  seed(initialData: MonthlyPeriod[]): void {
    this.reset();
    initialData.forEach((p) => this.monthlyPeriods.set(`${p.year}-${p.month}`, p));
  }

  private generateId(): string {
    return `m-${++this.idCounter}-${Date.now()}`;
  }

  private getKey(year: number, month: number): string {
    return `${year}-${month}`;
  }

  async getMonthlyPeriods(year: number): Promise<MonthlyPeriod[]> {
    const results: MonthlyPeriod[] = [];
    for (const period of this.monthlyPeriods.values()) {
      if (period.year === year) {
        results.push(period);
      }
    }
    results.sort((a, b) => a.month - b.month);
    return results;
  }

  async getAllOpenMonthlyPeriods(): Promise<MonthlyPeriod[]> {
    const results: MonthlyPeriod[] = [];
    for (const period of this.monthlyPeriods.values()) {
      if (period.status === "aberto") {
        results.push(period);
      }
    }
    results.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    return results;
  }

  async openMonthlyPeriod(year: number, month: number, email: string): Promise<void> {
    const key = this.getKey(year, month);
    const existing = this.monthlyPeriods.get(key);
    const now = new Date().toISOString();

    if (existing) {
      existing.status = "aberto";
      existing.created_by = email;
    } else {
      const id = this.generateId();
      const period: MonthlyPeriod = {
        id,
        year,
        month,
        status: "aberto",
        created_at: now,
        created_by: email,
      };
      this.monthlyPeriods.set(key, period);
    }
  }

  async closeMonthlyPeriod(year: number, month: number, email: string): Promise<void> {
    const key = this.getKey(year, month);
    const existing = this.monthlyPeriods.get(key);
    const now = new Date().toISOString();

    if (existing) {
      existing.status = "encerrado";
      existing.created_by = email;
    } else {
      const id = this.generateId();
      const period: MonthlyPeriod = {
        id,
        year,
        month,
        status: "encerrado",
        created_at: now,
        created_by: email,
      };
      this.monthlyPeriods.set(key, period);
    }
  }
}