// Fake em memória de IWorkoutExecutionRepository p/ contracts (fakes-only, decisão 57).
// Espelha as regras do repository real: abertura idempotente reusando a
// existente sem trocar o início, cascata da exclusão sobre as realizadas,
// retrato gravado na marcação, marcação idempotente por execução + série.
import type {
  IWorkoutExecutionRepository,
  MarkExecutionSeriesInput,
} from "../interfaces";
import type {
  WorkoutExecution,
  WorkoutExecutionSeries,
  WorkoutExecutionSnapshot,
} from "../../types";

export interface WorkoutExecutionSeed {
  executions?: WorkoutExecution[];
  doneSeries?: WorkoutExecutionSeries[];
}

export class FakeWorkoutExecutionRepository
  implements IWorkoutExecutionRepository
{
  private executions = new Map<string, WorkoutExecution>();
  private done = new Map<string, WorkoutExecutionSeries>();
  private seq = 0;

  constructor(seed: WorkoutExecutionSeed = {}) {
    this.seed(seed);
  }

  seed(seed: WorkoutExecutionSeed = {}): void {
    this.executions.clear();
    this.done.clear();
    // Foto congelada (2ª volta): execução sem foto registrada segue com
    // snapshot nula explícita (estado transitório do banco nunca persiste).
    for (const e of seed.executions ?? []) {
      this.executions.set(e.id, { ...e, snapshot: e.snapshot ?? null });
    }
    for (const d of seed.doneSeries ?? []) this.done.set(d.id, { ...d });
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-fake-${this.seq}`;
  }

  async findOpenExecutionByWorkout(
    workoutId: string,
  ): Promise<WorkoutExecution | null> {
    for (const execution of this.executions.values()) {
      if (execution.workoutId === workoutId && execution.finishedAt === null) {
        return { ...execution };
      }
    }
    return null;
  }

  async startExecution(
    workoutId: string,
    programId: string,
    email: string,
  ): Promise<WorkoutExecution> {
    const aberta = await this.findOpenExecutionByWorkout(workoutId);
    if (aberta) return aberta;

    const now = new Date().toISOString();
    const execution: WorkoutExecution = {
      id: this.nextId("exec"),
      workoutId,
      programId,
      startedAt: now,
      finishedAt: null,
      createdAt: now,
      created_by: email,
      snapshot: null,
    };
    this.executions.set(execution.id, execution);
    return { ...execution };
  }

  async setExecutionSnapshot(
    executionId: string,
    snapshot: WorkoutExecutionSnapshot,
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Falha ao gravar foto: execução ${executionId} não encontrada.`);
    }
    this.executions.set(executionId, { ...execution, snapshot });
  }

  async clearExecution(executionId: string): Promise<void> {
    this.executions.delete(executionId);
    for (const [id, realizada] of this.done) {
      if (realizada.executionId === executionId) this.done.delete(id);
    }
  }

  async listDoneByExecution(
    executionId: string,
  ): Promise<WorkoutExecutionSeries[]> {
    return [...this.done.values()]
      .filter((d) => d.executionId === executionId)
      .sort((a, b) => a.position - b.position)
      .map((d) => ({ ...d }));
  }

  async markSeriesDone(
    input: MarkExecutionSeriesInput,
    email: string,
  ): Promise<WorkoutExecutionSeries> {
    for (const realizada of this.done.values()) {
      if (
        realizada.executionId === input.executionId &&
        realizada.seriesId === input.seriesId
      ) {
        return { ...realizada };
      }
    }

    const now = new Date().toISOString();
    const done: WorkoutExecutionSeries = {
      id: this.nextId("done"),
      executionId: input.executionId,
      entryId: input.entryId,
      seriesId: input.seriesId,
      position: input.position,
      reps: input.reps,
      durationSeconds: input.durationSeconds,
      load: input.load,
      createdAt: now,
      created_by: email,
    };
    this.done.set(done.id, done);
    return { ...done };
  }

  async unmarkSeries(executionId: string, seriesId: string): Promise<void> {
    for (const [id, realizada] of this.done) {
      if (
        realizada.executionId === executionId &&
        realizada.seriesId === seriesId
      ) {
        this.done.delete(id);
        return;
      }
    }
  }
}

export function createFakeWorkoutExecutionRepository(
  seed: WorkoutExecutionSeed = {},
): FakeWorkoutExecutionRepository {
  return new FakeWorkoutExecutionRepository(seed);
}
