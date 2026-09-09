import type { IBudgetRepository } from "../interfaces";
import type {
  BudgetAdjustment,
  BudgetItem,
  Category,
} from "@/lib/pluto/types";

export class FakeBudgetRepository implements IBudgetRepository {
  private budgetAdjustments: Map<string, BudgetAdjustment> = new Map();
  private budgetItems: Map<string, Map<string, BudgetItem>> = new Map(); // adjustmentId -> categoryId -> BudgetItem
  private categories: Map<string, Category> = new Map();
  private adjustmentIdCounter = 0;
  private categoryIdCounter = 0;

  // Note: there is intentionally no initialBudgetItems parameter because
  // BudgetItem has no adjustmentId to attach items to. Seed adjustments
  // (and categories) first, then use addOrUpdateBudgetItem() in tests.
  constructor(
    initialAdjustments: BudgetAdjustment[] = [],
    initialCategories: Category[] = []
  ) {
    initialAdjustments.forEach((a) => {
      this.budgetAdjustments.set(a.id, a);
      this.budgetItems.set(a.id, new Map());
    });
    initialCategories.forEach((c) => this.categories.set(c.id, c));
  }

  reset(): void {
    this.budgetAdjustments.clear();
    this.budgetItems.clear();
    this.categories.clear();
    this.adjustmentIdCounter = 0;
    this.categoryIdCounter = 0;
  }

  seed(data: {
    adjustments?: BudgetAdjustment[];
    budgetItems?: BudgetItem[];
    categories?: Category[];
  }): void {
    this.reset();
    data.adjustments?.forEach((a) => {
      this.budgetAdjustments.set(a.id, a);
      this.budgetItems.set(a.id, new Map());
    });
    data.categories?.forEach((c) => this.categories.set(c.id, c));
    // budgetItems seeding is complex without adjustmentId; skip for now
  }

  private generateAdjustmentId(): string {
    return `adj-${++this.adjustmentIdCounter}-${Date.now()}`;
  }

  private generateCategoryId(): string {
    return `cat-${++this.categoryIdCounter}-${Date.now()}`;
  }

  async getBudgetAdjustment(year: number): Promise<BudgetAdjustment | null> {
    for (const adj of this.budgetAdjustments.values()) {
      if (adj.year === year && adj.start_month === 1) {
        return adj;
      }
    }
    return null;
  }

  async initBudget(year: number, email: string): Promise<string> {
    const existing = await this.getBudgetAdjustment(year);
    if (existing) return existing.id;

    const id = this.generateAdjustmentId();
    const adjustment: BudgetAdjustment = {
      id,
      year,
      start_month: 1,
      description: `Orçamento Inicial ${year}`,
      created_by: email,
    };

    this.budgetAdjustments.set(id, adjustment);
    this.budgetItems.set(id, new Map());
    return id;
  }

  async getBudgets(year: number, month: number): Promise<BudgetItem[]> {
    // Get all adjustments for this year with start_month <= month
    const relevantAdjustments: BudgetAdjustment[] = [];
    for (const adj of this.budgetAdjustments.values()) {
      if (adj.year === year && adj.start_month <= month) {
        relevantAdjustments.push(adj);
      }
    }

    // Sort by start_month descending so latest adjustment comes first
    relevantAdjustments.sort((a, b) => b.start_month - a.start_month);

    const uniqueItems: Record<string, BudgetItem> = {};

    for (const adj of relevantAdjustments) {
      const items = this.budgetItems.get(adj.id);
      if (!items) continue;

      for (const item of items.values()) {
        if (!uniqueItems[item.category_id]) {
          const category = this.categories.get(item.category_id);
          if (category) {
            uniqueItems[item.category_id] = {
              category_id: item.category_id,
              category_name: category.name,
              category_type: category.type,
              amount: item.amount,
              start_month: adj.start_month,
            };
          }
        }
      }
    }

    return Object.values(uniqueItems);
  }

  async addOrUpdateBudgetItem(
    adjustmentId: string,
    categoryId: string,
    amount: number,
    _email: string
  ): Promise<void> {
    const items = this.budgetItems.get(adjustmentId);
    if (!items) {
      throw new Error(`Adjustment ${adjustmentId} not found`);
    }

    const existing = items.get(categoryId);
    const category = this.categories.get(categoryId);

    const budgetItem: BudgetItem = {
      category_id: categoryId,
      category_name: category?.name ?? "Sem categoria",
      category_type: category?.type ?? "despesa",
      amount,
      start_month: existing?.start_month ?? 1,
    };

    items.set(categoryId, budgetItem);
  }

  async getBudgetAdjustments(year: number): Promise<BudgetAdjustment[]> {
    const results: BudgetAdjustment[] = [];
    for (const adj of this.budgetAdjustments.values()) {
      if (adj.year === year) {
        results.push(adj);
      }
    }
    results.sort((a, b) => a.start_month - b.start_month);
    return results;
  }

  async createBudgetAdjustment(
    year: number,
    month: number,
    email: string
  ): Promise<string> {
    // Check if adjustment already exists for this year/month
    for (const adj of this.budgetAdjustments.values()) {
      if (adj.year === year && adj.start_month === month) {
        return adj.id;
      }
    }

    const id = this.generateAdjustmentId();
    const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
      new Date(year, month - 1, 1)
    );
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const adjustment: BudgetAdjustment = {
      id,
      year,
      start_month: month,
      description: `Ajuste de ${capitalizedMonth}/${year}`,
      created_by: email,
    };

    this.budgetAdjustments.set(id, adjustment);
    this.budgetItems.set(id, new Map());
    return id;
  }

  async adjustBudgetItem(
    year: number,
    month: number,
    categoryName: string,
    categoryType: "receita" | "despesa",
    amount: number,
    email: string
  ): Promise<void> {
    // Find or create category
    let categoryId: string | null = null;
    for (const cat of this.categories.values()) {
      if (cat.name.toLowerCase() === categoryName.toLowerCase() && cat.type === categoryType) {
        categoryId = cat.id;
        break;
      }
    }

    if (!categoryId) {
      categoryId = this.generateCategoryId();
      const now = new Date().toISOString();
      const category: Category = {
        id: categoryId,
        name: categoryName,
        type: categoryType,
        created_at: now,
        created_by: email,
      };
      this.categories.set(categoryId, category);
    }

    // Create or get adjustment
    const adjustmentId = await this.createBudgetAdjustment(year, month, email);

    // Upsert budget item
    await this.addOrUpdateBudgetItem(adjustmentId, categoryId, amount, email);
  }

  // Helper methods for testing
  getCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  setCategories(categories: Category[]): void {
    this.categories.clear();
    categories.forEach((c) => this.categories.set(c.id, c));
  }
}