import type { IAccountRepository } from "../interfaces";
import type { Account } from "@/lib/pluto/types";

export class FakeAccountRepository implements IAccountRepository {
  private accounts: Map<string, Account> = new Map();
  private idCounter = 0;

  constructor(initialAccounts: Account[] = []) {
    initialAccounts.forEach((a) => this.accounts.set(a.id, a));
  }

  reset(): void {
    this.accounts.clear();
    this.idCounter = 0;
  }

  seed(initialData: Account[]): void {
    this.reset();
    initialData.forEach((a) => this.accounts.set(a.id, a));
  }

  private generateId(): string {
    return `acc-${++this.idCounter}-${Date.now()}`;
  }

  async getAccounts(): Promise<Account[]> {
    const results = Array.from(this.accounts.values());
    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
  }

  async getOrCreateAccount(
    name: string,
    email: string,
    accountType: "conta" | "cartao" = "conta"
  ): Promise<string> {
    const normalizedName = name.trim();

    for (const account of this.accounts.values()) {
      if (account.name.toLowerCase() === normalizedName.toLowerCase()) {
        return account.id;
      }
    }

    const id = this.generateId();
    const now = new Date().toISOString();

    const account: Account = {
      id,
      name: normalizedName,
      type: accountType,
      created_at: now,
      created_by: email,
    };

    this.accounts.set(id, account);
    return id;
  }
}