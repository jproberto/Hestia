// Contratos de repositório do módulo Mílon (DIP: consumidos via interfaces).
import type {
  EntryMode,
  Exercise,
  CreateExerciseInput,
  LoadUnit,
  UpdateExerciseInput,
  MilonItem,
  CreateMilonInput,
  Program,
  CreateProgramInput,
  UpdateProgramInput,
  Workout,
  WorkoutEntry,
  WorkoutSeries,
  WorkoutExecution,
  WorkoutExecutionSeries,
  MarkExecutionSeriesInput,
  CreateWorkoutInput,
  UpdateWorkoutInput,
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

export interface IProgramRepository {
  listAll(): Promise<Program[]>;
  findById(id: string): Promise<Program | null>;
  create(input: CreateProgramInput): Promise<Program>;
  update(id: string, input: UpdateProgramInput): Promise<Program>;
  delete(id: string): Promise<void>;
  findActiveByOwner(owner: string): Promise<Program | null>;
}

export interface UpdateSeriesFieldsInput {
  value?: number | null;
  load?: number | null;
}

export interface IWorkoutRepository {
  listWorkoutsByProgram(programId: string): Promise<Workout[]>;
  findWorkoutById(workoutId: string): Promise<Workout | null>;
  createWorkout(
    programId: string,
    input: CreateWorkoutInput,
    email: string,
  ): Promise<Workout>;
  updateWorkoutName(
    workoutId: string,
    input: UpdateWorkoutInput,
  ): Promise<Workout>;
  deleteWorkout(workoutId: string): Promise<void>;
  hasWorkouts(programId: string): Promise<boolean>;
  hasWorkoutWithExercise(programId: string): Promise<boolean>;
  listEntriesByWorkout(workoutId: string): Promise<WorkoutEntry[]>;
  listEntriesByProgram(programId: string): Promise<WorkoutEntry[]>;
  addEntry(
    workoutId: string,
    programId: string,
    exerciseId: string,
    email: string,
  ): Promise<WorkoutEntry>;
  removeEntry(entryId: string): Promise<void>;
  reorderEntries(workoutId: string, orderedEntryIds: string[]): Promise<void>;
  setEntryRestSeconds(entryId: string, seconds: number | null): Promise<void>;
  // Ajustes de modo/unidade da entry (Mílon #5, aditamento 2026-10-09 "0012
  // CORRETA", D29): persistem o modo e a unidade do exercício NO TREINO.
  setEntryMode(entryId: string, mode: EntryMode): Promise<void>;
  setEntryLoadUnit(entryId: string, unit: LoadUnit): Promise<void>;
  listSeriesByEntry(entryId: string): Promise<WorkoutSeries[]>;
  setSeriesQuantity(
    entryId: string,
    quantity: number,
    email: string,
  ): Promise<WorkoutSeries[]>;
  updateSeriesFields(
    seriesId: string,
    fields: UpdateSeriesFieldsInput,
  ): Promise<WorkoutSeries>;
  applySeriesToAll(
    entryId: string,
    originSeriesId: string,
  ): Promise<WorkoutSeries[]>;
  applySeriesToFollowing(
    entryId: string,
    originSeriesId: string,
  ): Promise<WorkoutSeries[]>;
}

// Execução série a série (Mílon #5): feito vive nas realizadas, nunca no template.
// MarkExecutionSeriesInput vive na fonte única (../types) e é reusado aqui.
export { type MarkExecutionSeriesInput } from "../types";

export interface IWorkoutExecutionRepository {
  findOpenExecutionByWorkout(workoutId: string): Promise<WorkoutExecution | null>;
  startExecution(
    workoutId: string,
    programId: string,
    email: string,
  ): Promise<WorkoutExecution>;
  clearExecution(executionId: string): Promise<void>;
  listDoneByExecution(executionId: string): Promise<WorkoutExecutionSeries[]>;
  markSeriesDone(
    input: MarkExecutionSeriesInput,
    email: string,
  ): Promise<WorkoutExecutionSeries>;
  unmarkSeries(executionId: string, seriesId: string): Promise<void>;
}
