import { IChecklistRepository } from "@/lib/pluto/repositories";
import { ok, Result } from "./result";

export interface ToggleChecklistItemCompletionUseCaseDeps {
  checklistRepo: IChecklistRepository;
}

export async function toggleChecklistItemCompletionUseCase(
  deps: ToggleChecklistItemCompletionUseCaseDeps,
  id: string,
  isCompleted: boolean
): Promise<Result<void>> {
  const { checklistRepo } = deps;

  await checklistRepo.toggleChecklistItemCompletion(id, isCompleted);
  return ok(undefined);
}