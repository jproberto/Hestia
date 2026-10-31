// Fake em memória de IWorkoutExecutionRepository p/ contracts (fakes-only, decisão 57).
// Espelha as regras do repository real: abertura idempotente reusando a
// existente sem trocar o início, selamento só de execução aberta (duplo selo
// ou id inexistente vira erro de operação), cascata da exclusão sobre as
// realizadas e marcação idempotente por execução + série.
import type {
  IWorkoutExecutionRepository,
  MarkExecutionSeriesInput,
} from "../interfaces";
import type {
  WorkoutExecution,
  WorkoutExecutionSeries,
} from "../../types";

export interface WorkoutExecutionSeed {
  executions?: WorkoutExecution[];
  doneSeries?: WorkoutExecutionSeries[];
}

// Espelho do texto de corrida do repository real (Mílon 07c, TASK-002):
// literal completo congelado aqui, idêntico ao real, contendo o fragmento
// da spec EC3 ("já existe execução ativa"). Demais textos congelados
// preservados sem paráfrase (tooltip AC1, arquivar AC5, ativar AC9,
// remover AC10 — fora deste fake).
const FAKE_EXECUTION_OWNER_CONFLICT_MESSAGE =
  "Já existe execução ativa para este dono";

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
    for (const e of seed.executions ?? []) {
      this.executions.set(e.id, { ...e });
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

  // Aberta por dono como o real (Mílon 07c, R1, plan §3): created_by igual ao
  // e-mail, finishedAt nulo, mais recente por startedAt desc com desempate
  // por id desc. Mesmo texto de corrida do real (espelho, sem importar o
  // módulo de execuções).
  async findOpenExecutionByOwner(
    email: string,
  ): Promise<WorkoutExecution | null> {
    const abertas = [...this.executions.values()]
      .filter((e) => e.created_by === email && e.finishedAt === null)
      .sort((a, b) => {
        if (a.startedAt !== b.startedAt)
          return a.startedAt < b.startedAt ? 1 : -1;
        if (a.id !== b.id) return a.id < b.id ? 1 : -1;
        return 0;
      });
    const aberta = abertas[0];
    return aberta ? { ...aberta } : null;
  }

  async startExecution(
    workoutId: string,
    programId: string,
    email: string,
  ): Promise<WorkoutExecution> {
    const abertaPorDono = await this.findOpenExecutionByOwner(email);
    if (abertaPorDono) {
      if (abertaPorDono.workoutId === workoutId) return abertaPorDono;
      throw new Error(FAKE_EXECUTION_OWNER_CONFLICT_MESSAGE);
    }

    const now = new Date().toISOString();
    const execution: WorkoutExecution = {
      id: this.nextId("exec"),
      workoutId,
      programId,
      startedAt: now,
      finishedAt: null,
      createdAt: now,
      created_by: email,
    };
    this.executions.set(execution.id, execution);
    return { ...execution };
  }

  async finishExecution(executionId: string): Promise<WorkoutExecution> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.finishedAt !== null) {
      throw new Error(
        "Falha ao finalizar execução: execução não encontrada ou já finalizada.",
      );
    }
    const sealed: WorkoutExecution = {
      ...execution,
      finishedAt: new Date().toISOString(),
    };
    this.executions.set(executionId, sealed);
    return { ...sealed };
  }

  async clearExecution(executionId: string): Promise<void> {
    this.executions.delete(executionId);
    for (const [id, realizada] of this.done) {
      if (realizada.executionId === executionId) this.done.delete(id);
    }
  }

  // Última selada do programa como o real (Mílon 07b, D1/DSELT1): finished_at
  // não-nulo por finished_at desc, desempate por created_at desc e id desc.
  async findLastSealedExecutionByProgram(
    programId: string,
  ): Promise<WorkoutExecution | null> {
    const seladas = [...this.executions.values()]
      .filter((e) => e.programId === programId && e.finishedAt !== null)
      .sort((a, b) => {
        const fimA = a.finishedAt as string;
        const fimB = b.finishedAt as string;
        if (fimA !== fimB) return fimA < fimB ? 1 : -1;
        if (a.createdAt !== b.createdAt)
          return a.createdAt < b.createdAt ? 1 : -1;
        if (a.id !== b.id) return a.id < b.id ? 1 : -1;
        return 0;
      });
    const ultima = seladas[0];
    return ultima ? { ...ultima } : null;
  }

  // Aberta do programa como o real (Mílon 07b, D10/DABT1): finished_at nulo,
  // mais recente por started_at desc com desempate por id desc.
  async findOpenExecutionByProgram(
    programId: string,
  ): Promise<WorkoutExecution | null> {
    const abertas = [...this.executions.values()]
      .filter((e) => e.programId === programId && e.finishedAt === null)
      .sort((a, b) => {
        if (a.startedAt !== b.startedAt)
          return a.startedAt < b.startedAt ? 1 : -1;
        if (a.id !== b.id) return a.id < b.id ? 1 : -1;
        return 0;
      });
    const aberta = abertas[0];
    return aberta ? { ...aberta } : null;
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
      value: input.value,
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
