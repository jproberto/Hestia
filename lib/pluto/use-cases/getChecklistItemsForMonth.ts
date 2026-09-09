import { IChecklistRepository, ChecklistItem } from "@/lib/pluto/repositories";
import { ok, Result } from "./result";

export interface GetChecklistItemsForMonthUseCaseDeps {
  checklistRepo: IChecklistRepository;
}

export async function getChecklistItemsForMonthUseCase(
  deps: GetChecklistItemsForMonthUseCaseDeps,
  monthId: string
): Promise<Result<ChecklistItem[]>> {
  const { checklistRepo } = deps;

  const result = await checklistRepo.getChecklistItemsByMonth(monthId);
  return ok(result);
}