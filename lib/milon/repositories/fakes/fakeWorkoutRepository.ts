// Fake em memória de IWorkoutRepository p/ testes e contracts (fakes-only, decisão 57).
// Aplica as mesmas regras e mensagens do repository real: unicidade de nome
// D11, unicidade de exercício por Programa D14 e guarda D6 de treino.
import type {
  IWorkoutRepository,
  UpdateSeriesFieldsInput,
} from "../interfaces";
import {
  MSG_EXERCICIO_JA_NO_TREINO,
  MSG_TREINO_COM_EXERCICIOS,
  normalizarNomeTreino,
  validarNomeTreino,
  validarNomeUnicoNoPrograma,
} from "../../workout-utils";
import type {
  CreateWorkoutInput,
  EntryMode,
  LoadUnit,
  UpdateWorkoutInput,
  Workout,
  WorkoutEntry,
  WorkoutSeries,
} from "../../types";

export interface WorkoutSeed {
  workouts?: Workout[];
  entries?: WorkoutEntry[];
  series?: WorkoutSeries[];
}

function withEntryDefaults(entry: WorkoutEntry): WorkoutEntry {
  return {
    ...entry,
    // Seeds pré-0012 (sem os campos): nulo tratado como repetição/kg,
    // mesmo fallback do repository real.
    mode: entry.mode ?? "repeticao",
    loadUnit: entry.loadUnit ?? "kg",
  };
}

function sortWorkouts(workouts: Workout[]): Workout[] {
  return [...workouts].sort((a, b) => {
    if (a.createdAt !== b.createdAt)
      return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export class FakeWorkoutRepository implements IWorkoutRepository {
  private workouts = new Map<string, Workout>();
  private entries = new Map<string, WorkoutEntry>();
  private series = new Map<string, WorkoutSeries>();
  private seq = 0;

  constructor(seed: WorkoutSeed = {}) {
    this.seed(seed);
  }

  seed(seed: WorkoutSeed = {}): void {
    this.workouts.clear();
    this.entries.clear();
    this.series.clear();
    for (const w of seed.workouts ?? []) this.workouts.set(w.id, { ...w });
    for (const e of seed.entries ?? []) this.entries.set(e.id, { ...e });
    for (const s of seed.series ?? []) this.series.set(s.id, { ...s });
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-fake-${this.seq}`;
  }

  async listWorkoutsByProgram(programId: string): Promise<Workout[]> {
    return sortWorkouts(
      [...this.workouts.values()].filter((w) => w.programId === programId),
    );
  }

  async findWorkoutById(workoutId: string): Promise<Workout | null> {
    return this.workouts.get(workoutId) ?? null;
  }

  async createWorkout(
    programId: string,
    input: CreateWorkoutInput,
    email: string,
  ): Promise<Workout> {
    const nome = normalizarNomeTreino(input.name);
    const obrigatorio = validarNomeTreino(nome);
    if (obrigatorio) throw new Error(obrigatorio);

    const existentes = await this.listWorkoutsByProgram(programId);
    const colisao = validarNomeUnicoNoPrograma(
      nome,
      existentes.map((w) => w.name),
    );
    if (colisao) throw new Error(colisao);

    const workout: Workout = {
      id: this.nextId("w"),
      programId,
      name: nome,
      createdAt: new Date().toISOString(),
      created_by: email,
    };
    this.workouts.set(workout.id, workout);
    return workout;
  }

  async updateWorkoutName(
    workoutId: string,
    input: UpdateWorkoutInput,
  ): Promise<Workout> {
    const atual = this.workouts.get(workoutId);
    if (!atual) throw new Error("Treino não encontrado.");

    const nome = normalizarNomeTreino(input.name);
    const obrigatorio = validarNomeTreino(nome);
    if (obrigatorio) throw new Error(obrigatorio);

    const existentes = await this.listWorkoutsByProgram(atual.programId);
    const colisao = validarNomeUnicoNoPrograma(
      nome,
      existentes.filter((w) => w.id !== workoutId).map((w) => w.name),
    );
    if (colisao) throw new Error(colisao);

    const updated: Workout = { ...atual, name: nome };
    this.workouts.set(workoutId, updated);
    return updated;
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    const temEntradas = [...this.entries.values()].some(
      (e) => e.workoutId === workoutId,
    );
    if (temEntradas) throw new Error(MSG_TREINO_COM_EXERCICIOS);
    this.workouts.delete(workoutId);
  }

  async hasWorkouts(programId: string): Promise<boolean> {
    return [...this.workouts.values()].some((w) => w.programId === programId);
  }

  async hasWorkoutWithExercise(programId: string): Promise<boolean> {
    return [...this.entries.values()].some((e) => e.programId === programId);
  }

  async listEntriesByWorkout(workoutId: string): Promise<WorkoutEntry[]> {
    return [...this.entries.values()]
      .filter((e) => e.workoutId === workoutId)
      .sort((a, b) => a.position - b.position)
      .map(withEntryDefaults);
  }

  async listEntriesByProgram(programId: string): Promise<WorkoutEntry[]> {
    return [...this.entries.values()]
      .filter((e) => e.programId === programId)
      .map(withEntryDefaults);
  }

  async addEntry(
    workoutId: string,
    programId: string,
    exerciseId: string,
    email: string,
  ): Promise<WorkoutEntry> {
    const doTreino = await this.listEntriesByWorkout(workoutId);
    if (doTreino.some((e) => e.exerciseId === exerciseId)) {
      throw new Error(MSG_EXERCICIO_JA_NO_TREINO);
    }

    const position =
      doTreino.reduce((max, e) => Math.max(max, e.position), 0) + 1;

    const entry: WorkoutEntry = {
      id: this.nextId("e"),
      workoutId,
      programId,
      exerciseId,
      position,
      restSeconds: null,
      // Novas entries nascem com os padrões repetição+kg (D29).
      mode: "repeticao",
      loadUnit: "kg",
      createdAt: new Date().toISOString(),
      created_by: email,
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  async removeEntry(entryId: string): Promise<void> {
    for (const [id, serie] of this.series) {
      if (serie.entryId === entryId) this.series.delete(id);
    }
    this.entries.delete(entryId);
  }

  async reorderEntries(
    workoutId: string,
    orderedEntryIds: string[],
  ): Promise<void> {
    const atuais = await this.listEntriesByWorkout(workoutId);
    const atuaisIds = new Set(atuais.map((e) => e.id));
    const recebidosIds = new Set(orderedEntryIds);
    const conjuntoIgual =
      atuais.length === orderedEntryIds.length &&
      orderedEntryIds.every((id) => atuaisIds.has(id)) &&
      atuais.every((e) => recebidosIds.has(e.id));
    if (!conjuntoIgual) {
      throw new Error(
        "A ordem informada não corresponde aos exercícios do treino.",
      );
    }
    orderedEntryIds.forEach((id, index) => {
      const entry = this.entries.get(id);
      if (entry) this.entries.set(id, { ...entry, position: index + 1 });
    });
  }

  async setEntryRestSeconds(
    entryId: string,
    seconds: number | null,
  ): Promise<void> {
    const entry = this.entries.get(entryId);
    if (!entry) throw new Error("Exercício do treino não encontrado.");
    this.entries.set(entryId, { ...entry, restSeconds: seconds });
  }

  async setEntryMode(entryId: string, mode: EntryMode): Promise<void> {
    const entry = this.entries.get(entryId);
    if (!entry) throw new Error("Exercício do treino não encontrado.");
    this.entries.set(entryId, { ...entry, mode });
  }

  async setEntryLoadUnit(entryId: string, unit: LoadUnit): Promise<void> {
    const entry = this.entries.get(entryId);
    if (!entry) throw new Error("Exercício do treino não encontrado.");
    this.entries.set(entryId, { ...entry, loadUnit: unit });
  }

  async listSeriesByEntry(entryId: string): Promise<WorkoutSeries[]> {
    return [...this.series.values()]
      .filter((s) => s.entryId === entryId)
      .sort((a, b) => a.position - b.position);
  }

  async setSeriesQuantity(
    entryId: string,
    quantity: number,
    email: string,
  ): Promise<WorkoutSeries[]> {
    const atuais = await this.listSeriesByEntry(entryId);

    if (quantity === atuais.length) return atuais;

    if (quantity < atuais.length) {
      const manter = new Set(
        atuais.slice(0, quantity).map((s) => s.id),
      );
      for (const serie of atuais) {
        if (!manter.has(serie.id)) this.series.delete(serie.id);
      }
      return await this.listSeriesByEntry(entryId);
    }

    for (
      let position = atuais.length + 1;
      position <= quantity;
      position += 1
    ) {
      const serie: WorkoutSeries = {
        id: this.nextId("s"),
        entryId,
        position,
        reps: null,
        durationSeconds: null,
        load: null,
        createdAt: new Date().toISOString(),
        created_by: email,
      };
      this.series.set(serie.id, serie);
    }
    return await this.listSeriesByEntry(entryId);
  }

  async updateSeriesFields(
    seriesId: string,
    fields: UpdateSeriesFieldsInput,
  ): Promise<WorkoutSeries> {
    const atual = this.series.get(seriesId);
    if (!atual) throw new Error("Série não encontrada.");
    const updated: WorkoutSeries = {
      ...atual,
      reps: "reps" in fields ? (fields.reps ?? null) : atual.reps,
      durationSeconds:
        "durationSeconds" in fields
          ? (fields.durationSeconds ?? null)
          : atual.durationSeconds,
      load: "load" in fields ? (fields.load ?? null) : atual.load,
    };
    this.series.set(seriesId, updated);
    return updated;
  }

  async applySeriesToAll(
    entryId: string,
    originSeriesId: string,
  ): Promise<WorkoutSeries[]> {
    const series = await this.listSeriesByEntry(entryId);
    const origem = series.find((s) => s.id === originSeriesId);
    if (!origem) throw new Error("Série de origem não encontrada.");
    for (const serie of series) {
      if (serie.id === originSeriesId) continue;
      this.series.set(serie.id, {
        ...serie,
        reps: origem.reps,
        durationSeconds: origem.durationSeconds,
        load: origem.load,
      });
    }
    return await this.listSeriesByEntry(entryId);
  }

  async applySeriesToFollowing(
    entryId: string,
    originSeriesId: string,
  ): Promise<WorkoutSeries[]> {
    const series = await this.listSeriesByEntry(entryId);
    const origem = series.find((s) => s.id === originSeriesId);
    if (!origem) throw new Error("Série de origem não encontrada.");
    for (const serie of series) {
      if (serie.position <= origem.position) continue;
      this.series.set(serie.id, {
        ...serie,
        reps: origem.reps,
        durationSeconds: origem.durationSeconds,
        load: origem.load,
      });
    }
    return await this.listSeriesByEntry(entryId);
  }
}

export function createFakeWorkoutRepository(
  seed: WorkoutSeed = {},
): FakeWorkoutRepository {
  return new FakeWorkoutRepository(seed);
}
