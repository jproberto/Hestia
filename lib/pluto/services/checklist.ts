import {
  IChecklistRepository,
  IMonthRepository,
  ChecklistItem,
  BudgetItem,
} from "@/lib/pluto/repositories";
import { BudgetOverflowResult } from "@/lib/pluto/checklist-budget";
import {
  updateChecklistItemDataSchema,
  getMonthChecklistItemsParamsSchema,
  createChecklistWithOverflowParamsSchema,
  type CreateChecklistItemInput,
  type UpdateChecklistItemInput,
} from "@/lib/pluto/schemas";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import {
  createChecklistItemUseCase,
  CreateChecklistItemUseCaseDeps,
  updateChecklistItemUseCase,
  UpdateChecklistItemUseCaseDeps,
  deleteChecklistItemUseCase,
  DeleteChecklistItemUseCaseDeps,
  toggleChecklistItemCompletionUseCase,
  ToggleChecklistItemCompletionUseCaseDeps,
  getChecklistItemsForMonthUseCase,
  GetChecklistItemsForMonthUseCaseDeps,
} from "@/lib/pluto/use-cases";

export function createChecklistService(
  checklistRepo: IChecklistRepository,
  monthRepo: IMonthRepository
) {
  const getDeps: GetChecklistItemsForMonthUseCaseDeps = { checklistRepo };
  const createDeps: CreateChecklistItemUseCaseDeps = { checklistRepo };
  const updateDeps: UpdateChecklistItemUseCaseDeps = { checklistRepo };
  const deleteDeps: DeleteChecklistItemUseCaseDeps = { checklistRepo };
  const toggleDeps: ToggleChecklistItemCompletionUseCaseDeps = { checklistRepo };

  return {
    async getMonthChecklistItems(monthId: string): Promise<ChecklistItem[]> {
      const params = getMonthChecklistItemsParamsSchema.parse({ monthId });
      const result = await getChecklistItemsForMonthUseCase(getDeps, params.monthId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },

    async getGlobalItems(): Promise<ChecklistItem[]> {
      return checklistRepo.getGlobalChecklistItems();
    },

    async createChecklistItemWithOverflowCheck(
      data: CreateChecklistItemInput,
      globalItems: ChecklistItem[],
      budgetItems: BudgetItem[],
      currentMonthId?: string | null,
      categories?: { id: string; type: "receita" | "despesa" }[]
    ): Promise<{ success: boolean; overflow?: BudgetOverflowResult }> {
      const params = createChecklistWithOverflowParamsSchema.parse({
        data,
        globalItems,
        budgetItems,
        currentMonthId,
        categories,
      });

      const normalizedGlobalItems: ChecklistItem[] = params.globalItems.map((g) => ({
        ...g,
        amount: g.amount ?? null,
        category_name: g.category_name ?? "Sem categoria",
        parent_id: g.parent_id ?? null,
        month_id: g.month_id ?? null,
      }));

      const result = await createChecklistItemUseCase(createDeps, {
        day: params.data.day,
        description: params.data.description,
        type: params.data.type,
        category_id: params.data.category_id,
        amount: params.data.amount ?? null,
        created_by: params.data.created_by,
        isGlobal: params.data.isGlobal,
        currentMonthId: params.currentMonthId,
      }, normalizedGlobalItems, params.budgetItems, params.categories || []);

      if (!result.success) {
        throw new Error("Failed to create checklist item");
      }
      return result.data;
    },

    async updateChecklistItemWithOverflowCheck(
      id: string,
      data: Partial<UpdateChecklistItemInput>,
      updateGlobal: boolean,
      parentId?: string | null,
      globalItems: ChecklistItem[] = [],
      _budgetItems: BudgetItem[] = [],
      categories: { id: string; type: "receita" | "despesa" }[] = []
    ): Promise<{ success: boolean; overflow?: BudgetOverflowResult }> {
      const validatedData = updateChecklistItemDataSchema.parse(data);

      const result = await updateChecklistItemUseCase(updateDeps, id, validatedData, updateGlobal, parentId, globalItems, _budgetItems, categories);
      if (!result.success) {
        throw new Error("Failed to update checklist item");
      }
      return result.data;
    },

    async deleteChecklistItemWithScope(
      id: string,
      deleteGlobal: boolean,
      parentId?: string | null
    ): Promise<void> {
      const result = await deleteChecklistItemUseCase(deleteDeps, id, deleteGlobal, parentId);
      if (!result.success) throw new Error(result.error);
    },

    async toggleItemCompletion(id: string, isCompleted: boolean): Promise<void> {
      const result = await toggleChecklistItemCompletionUseCase(toggleDeps, id, isCompleted);
      if (!result.success) throw new Error(result.error);
    },

    async instantiateGlobalsForNewMonth(monthId: string, email: string): Promise<void> {
      await checklistRepo.instantiateGlobalChecklistItemsForMonth(monthId, email);
    },

    async getOpenMonths(): Promise<{ id: string; month: number; year: number; status: string }[]> {
      return monthRepo.getAllOpenMonthlyPeriods();
    },
  };
}

export type ChecklistService = ReturnType<typeof createChecklistService>;

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