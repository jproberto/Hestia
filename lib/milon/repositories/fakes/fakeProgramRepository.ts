// Fake em memória de IProgramRepository p/ testes e contracts (fakes-only, decisão 57).
// Aplica a mesma regra e mensagem de unicidade do ativo por dono do repository real.
import { PROGRAM_ACTIVE_UNICITY_MESSAGE } from "../programs";
import type { IProgramRepository } from "../interfaces";
import type {
  Program,
  CreateProgramInput,
  UpdateProgramInput,
} from "../../types";

export class FakeProgramRepository implements IProgramRepository {
  private programs: Map<string, Program> = new Map();
  private seq = 0;

  constructor(seed: Program[] = []) {
    this.seed(seed);
  }

  seed(items: Program[]): void {
    const activeByOwner = new Map<string, number>();
    for (const item of items) {
      if (item.status === "ativo") {
        const count = (activeByOwner.get(item.owner) ?? 0) + 1;
        if (count > 1) throw new Error(PROGRAM_ACTIVE_UNICITY_MESSAGE);
        activeByOwner.set(item.owner, count);
      }
    }
    this.programs.clear();
    items.forEach((item) => this.programs.set(item.id, { ...item }));
  }

  async listAll(): Promise<Program[]> {
    return [...this.programs.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async findById(id: string): Promise<Program | null> {
    return this.programs.get(id) ?? null;
  }

  async create(input: CreateProgramInput): Promise<Program> {
    const title = input.title.trim();
    const owner = input.owner.trim();
    const status = input.status ?? "rascunho";
    if (status === "ativo") {
      for (const existing of this.programs.values()) {
        if (existing.owner === owner && existing.status === "ativo") {
          existing.status = "inativo";
        }
      }
    }
    const item: Program = {
      id: `program-fake-${++this.seq}`,
      title,
      owner,
      status,
      createdAt: new Date().toISOString(),
      created_by: owner,
    };
    this.programs.set(item.id, item);
    return item;
  }

  async update(id: string, input: UpdateProgramInput): Promise<Program> {
    const current = this.programs.get(id);
    if (!current) throw new Error("Programa não encontrado.");
    if (input.status === "ativo") {
      for (const existing of this.programs.values()) {
        if (
          existing.owner === current.owner &&
          existing.status === "ativo"
        ) {
          existing.status = "inativo";
        }
      }
    }
    const updated: Program = {
      ...current,
      title: input.title !== undefined ? input.title.trim() : current.title,
      status: input.status ?? current.status,
    };
    this.programs.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.programs.delete(id);
  }

  async findActiveByOwner(owner: string): Promise<Program | null> {
    for (const program of this.programs.values()) {
      if (program.owner === owner && program.status === "ativo") {
        return program;
      }
    }
    return null;
  }
}

export function createFakeProgramRepository(
  seed: Program[] = [],
): FakeProgramRepository {
  return new FakeProgramRepository(seed);
}
