// Fake em memória de IMilonRepository p/ testes e contracts.
import type { IMilonRepository } from "../interfaces";
import type { MilonItem, CreateMilonInput } from "../../types";

export class FakeMilonRepository implements IMilonRepository {
  private items: MilonItem[] = [];
  private seq = 0;

  seed(items: MilonItem[]): void {
    this.items = [...items];
  }

  async list(): Promise<MilonItem[]> {
    return [...this.items];
  }

  async create(input: CreateMilonInput): Promise<MilonItem> {
    const item: MilonItem = {
      id: `fake-${++this.seq}`,
      name: input.name.trim(),
      created_at: new Date().toISOString(),
    };
    this.items.push(item);
    return item;
  }
}

export function createFakeMilonRepository(seed: MilonItem[] = []): FakeMilonRepository {
  const repo = new FakeMilonRepository();
  repo.seed(seed);
  return repo;
}
