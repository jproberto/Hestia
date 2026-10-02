// Fake em memória de IExerciseRepository p/ testes e contracts (fakes-only, decisão 57).
// Aplica a mesma regra e mensagem anti-duplicata do repository real.
import { EXERCISE_DUPLICATE_MESSAGE } from "../exercises";
import { compareExercisesByMuscleThenName, isSameExercise } from "../../utils";
import type { IExerciseRepository } from "../interfaces";
import type {
  Exercise,
  CreateExerciseInput,
  LoadUnit,
  UpdateExerciseInput,
} from "../../types";

export class FakeExerciseRepository implements IExerciseRepository {
  private exercises: Map<string, Exercise> = new Map();
  private seq = 0;

  constructor(initialExercises: Exercise[] = []) {
    this.seed(initialExercises);
  }

  seed(items: Exercise[]): void {
    this.exercises.clear();
    items.forEach((item) => this.exercises.set(item.id, item));
  }

  async list(): Promise<Exercise[]> {
    return [...this.exercises.values()]
      .filter((item) => item.deletedAt == null)
      .sort(compareExercisesByMuscleThenName);
  }

  async listAll(): Promise<Exercise[]> {
    return [...this.exercises.values()].sort(
      compareExercisesByMuscleThenName,
    );
  }

  async setExerciseLoadUnit(id: string, unit: LoadUnit): Promise<void> {
    const current = this.exercises.get(id);
    if (!current) throw new Error("Exercício não encontrado.");
    this.exercises.set(id, { ...current, loadUnit: unit });
  }

  async create(input: CreateExerciseInput, email: string): Promise<Exercise> {
    const name = input.name.trim();
    const muscle = input.muscle.trim();
    for (const existing of this.exercises.values()) {
      if (
        existing.deletedAt == null &&
        isSameExercise(existing, { name, muscle })
      ) {
        throw new Error(EXERCISE_DUPLICATE_MESSAGE);
      }
    }
    const item: Exercise = {
      id: `exercise-fake-${++this.seq}`,
      name,
      muscle,
      videoLink: input.videoLink ?? null,
      loadUnit: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      created_by: email,
    };
    this.exercises.set(item.id, item);
    return item;
  }

  async update(id: string, input: UpdateExerciseInput): Promise<Exercise> {
    const current = this.exercises.get(id);
    if (!current) throw new Error("Exercício não encontrado.");
    const name = input.name.trim();
    const muscle = input.muscle.trim();
    for (const existing of this.exercises.values()) {
      if (
        existing.id !== id &&
        existing.deletedAt == null &&
        isSameExercise(existing, { name, muscle })
      ) {
        throw new Error(EXERCISE_DUPLICATE_MESSAGE);
      }
    }
    const updated: Exercise = {
      ...current,
      name,
      muscle,
      videoLink: input.videoLink,
    };
    this.exercises.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const current = this.exercises.get(id);
    if (!current) return;
    this.exercises.set(id, {
      ...current,
      deletedAt: new Date().toISOString(),
    });
  }
}

export function createFakeExerciseRepository(
  seed: Exercise[] = [],
): FakeExerciseRepository {
  return new FakeExerciseRepository(seed);
}
