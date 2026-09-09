import { IChecklistRepository } from "@/lib/pluto/repositories";
import { ok, Result } from "./result";

export interface DeleteChecklistItemUseCaseDeps {
  checklistRepo: IChecklistRepository;
}

export async function deleteChecklistItemUseCase(
  deps: DeleteChecklistItemUseCaseDeps,
  id: string,
  deleteGlobal: boolean,
  parentId?: string | null
): Promise<Result<void>> {
  const { checklistRepo } = deps;

  await checklistRepo.deleteChecklistItem(id, deleteGlobal, parentId);
  return ok(undefined);
}