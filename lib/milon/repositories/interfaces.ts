// Contratos de repositório do módulo Mílon (DIP: consumidos via interfaces).
import type {
  Exercise,
  CreateExerciseInput,
  UpdateExerciseInput,
  MilonItem,
  CreateMilonInput,
} from "../types";

export interface IExerciseRepository {
  list(): Promise<Exercise[]>;
  create(input: CreateExerciseInput, email: string): Promise<Exercise>;
  update(id: string, input: UpdateExerciseInput): Promise<Exercise>;
  remove(id: string): Promise<void>;
}

// Legado do scaffold (removido na TASK-004/005 junto a db/example e useExamples).
// Mantido nesta task para não quebrar `tsc` enquanto o scaffold ainda consome.
export interface IMilonRepository {
  list(): Promise<MilonItem[]>;
  create(input: CreateMilonInput): Promise<MilonItem>;
}
