import type { IChecklistRepository } from "../interfaces";
import type { ChecklistItemInput, ChecklistItem, Category } from "@/lib/pluto/types";

export class FakeChecklistRepository implements IChecklistRepository {
  private checklistItems: Map<string, ChecklistItem> = new Map();
  private categories: Map<string, Category> = new Map();
  private idCounter = 0;

  constructor(
    initialItems: ChecklistItem[] = [],
    initialCategories: Category[] = []
  ) {
    initialItems.forEach((item) => this.checklistItems.set(item.id, item));
    initialCategories.forEach((c) => this.categories.set(c.id, c));
  }

  reset(): void {
    this.checklistItems.clear();
    this.categories.clear();
    this.idCounter = 0;
  }

  seed(data: {
    items?: ChecklistItem[];
    categories?: Category[];
  }): void {
    this.reset();
    data.items?.forEach((item) => this.checklistItems.set(item.id, item));
    data.categories?.forEach((c) => this.categories.set(c.id, c));
  }

  private generateId(): string {
    return `chk-${++this.idCounter}-${Date.now()}`;
  }

  async getChecklistItemsByMonth(monthId: string): Promise<ChecklistItem[]> {
    const results: ChecklistItem[] = [];
    for (const item of this.checklistItems.values()) {
      if (item.month_id === monthId) {
        results.push(item);
      }
    }
    results.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.id.localeCompare(b.id);
    });
    return results;
  }

  async getGlobalChecklistItems(): Promise<ChecklistItem[]> {
    const results: ChecklistItem[] = [];
    for (const item of this.checklistItems.values()) {
      if (item.month_id === null && item.is_active === true) {
        results.push(item);
      }
    }
    results.sort((a, b) => a.day - b.day);
    return results;
  }

  async createChecklistItem(
    input: ChecklistItemInput,
    isGlobal: boolean,
    currentMonthId?: string
  ): Promise<ChecklistItem> {
    const now = new Date().toISOString();

    if (isGlobal) {
      const globalId = this.generateId();
      const globalItem: ChecklistItem = {
        id: globalId,
        parent_id: null,
        month_id: null,
        day: input.day,
        description: input.description,
        type: input.type,
        category_id: input.category_id,
        amount: input.amount ?? null,
        is_completed: false,
        is_active: true,
        created_at: now,
        created_by: input.created_by,
        category_name: this.categories.get(input.category_id)?.name ?? "Sem categoria",
      };
      this.checklistItems.set(globalId, globalItem);

      if (currentMonthId) {
        const monthId = this.generateId();
        const monthItem: ChecklistItem = {
          id: monthId,
          parent_id: globalId,
          month_id: currentMonthId,
          day: input.day,
          description: input.description,
          type: input.type,
          category_id: input.category_id,
          amount: input.amount ?? null,
          is_completed: false,
          is_active: true,
          created_at: now,
          created_by: input.created_by,
          category_name: this.categories.get(input.category_id)?.name ?? "Sem categoria",
        };
        this.checklistItems.set(monthId, monthItem);
        return monthItem;
      }

      return globalItem;
    } else {
      const id = this.generateId();
      const item: ChecklistItem = {
        id,
        parent_id: null,
        month_id: currentMonthId ?? null,
        day: input.day,
        description: input.description,
        type: input.type,
        category_id: input.category_id,
        amount: input.amount ?? null,
        is_completed: false,
        is_active: true,
        created_at: now,
        created_by: input.created_by,
        category_name: this.categories.get(input.category_id)?.name ?? "Sem categoria",
      };
      this.checklistItems.set(id, item);
      return item;
    }
  }

  async updateChecklistItem(
    id: string,
    input: Partial<ChecklistItemInput>,
    updateGlobal: boolean,
    parentId?: string | null
  ): Promise<void> {
    const item = this.checklistItems.get(id);
    if (!item) {
      throw new Error("Checklist item not found");
    }

    const updateData: Partial<ChecklistItem> = {};
    if (input.day !== undefined) updateData.day = input.day;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
      updateData.category_name = this.categories.get(input.category_id)?.name ?? "Sem categoria";
    }
    if (input.amount !== undefined) updateData.amount = input.amount;

    const updated = { ...item, ...updateData };
    this.checklistItems.set(id, updated);

    if (updateGlobal && parentId) {
      const parent = this.checklistItems.get(parentId);
      if (parent) {
        const parentUpdated = { ...parent, ...updateData };
        this.checklistItems.set(parentId, parentUpdated);
      }
    }
  }

  async deleteChecklistItem(
    id: string,
    deleteGlobal: boolean,
    parentId?: string | null
  ): Promise<void> {
    if (deleteGlobal && parentId) {
      const parent = this.checklistItems.get(parentId);
      if (parent) {
        this.checklistItems.set(parentId, { ...parent, is_active: false });
      }
    }

    this.checklistItems.delete(id);
  }

  async toggleChecklistItemCompletion(id: string, isCompleted: boolean): Promise<void> {
    const item = this.checklistItems.get(id);
    if (!item) {
      throw new Error("Checklist item not found");
    }
    this.checklistItems.set(id, { ...item, is_completed: isCompleted });
  }

  async instantiateGlobalChecklistItemsForMonth(
    monthId: string,
    email: string
  ): Promise<void> {
    const globals: ChecklistItem[] = [];
    for (const item of this.checklistItems.values()) {
      if (item.month_id === null && item.is_active === true) {
        globals.push(item);
      }
    }

    if (globals.length === 0) return;

    const now = new Date().toISOString();
    for (const global of globals) {
      const instanceId = this.generateId();
      const instance: ChecklistItem = {
        id: instanceId,
        parent_id: global.id,
        month_id: monthId,
        day: global.day,
        description: global.description,
        type: global.type,
        category_id: global.category_id,
        amount: global.amount ?? null,
        is_completed: false,
        is_active: true,
        created_at: now,
        created_by: email,
        category_name: global.category_name,
      };
      this.checklistItems.set(instanceId, instance);
    }
  }

  // Helper method for testing
  setCategories(categories: Category[]): void {
    this.categories.clear();
    categories.forEach((c) => this.categories.set(c.id, c));
  }
}