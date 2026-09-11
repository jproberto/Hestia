import type { ICategoryRepository } from "../interfaces";
import type { Category } from "@/lib/pluto/types";

export class FakeCategoryRepository implements ICategoryRepository {
  private categories: Map<string, Category> = new Map();
  private idCounter = 0;

  constructor(initialCategories: Category[] = []) {
    initialCategories.forEach((c) => this.categories.set(c.id, c));
  }

  reset(): void {
    this.categories.clear();
    this.idCounter = 0;
  }

  seed(initialData: Category[]): void {
    this.reset();
    initialData.forEach((c) => this.categories.set(c.id, c));
  }

  private generateId(): string {
    return `cat-${++this.idCounter}-${Date.now()}`;
  }

  async getCategories(type?: "receita" | "despesa"): Promise<Category[]> {
    const results: Category[] = [];

    for (const category of this.categories.values()) {
      if (!type || category.type === type) {
        results.push(category);
      }
    }

    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
  }

  async getOrCreateCategory(
    name: string,
    type: "receita" | "despesa",
    email: string
  ): Promise<string> {
    const normalizedName = name.trim();

    for (const category of this.categories.values()) {
      if (category.name.toLowerCase() === normalizedName.toLowerCase() && category.type === type) {
        return category.id;
      }
    }

    const id = this.generateId();
    const now = new Date().toISOString();

    const category: Category = {
      id,
      name: normalizedName,
      type,
      created_at: now,
      created_by: email,
    };

    this.categories.set(id, category);
    return id;
  }
}