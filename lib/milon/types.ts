// Types consolidados do módulo Mílon — FONTE ÚNICA (nunca duplicar tipos).
// Ver Mapa de Camadas no AGENTS.md: Row (banco) / domínio / Input (repositório).
import type { ErrorOrigin } from "@/lib/shared";

export interface ExerciseRow {
  id: string;
  name: string;
  muscle: string;
  video_link: string | null;
  load_unit: string | null;
  // Modo do exercício (Mílon #5, aditamento 2026-10-09, D25): coluna textual
  // anulável; opcional para linhas anteriores à migração 0012 (leitura com
  // fallback repetição). Nenhuma coluna nova nas séries (D26).
  mode?: string | null;
  deleted_at: string | null;
  created_at: string;
  created_by: string;
}

export type LoadUnit = 'kg' | 'libra';

// Modo do exercício (Mílon #5, aditamento 2026-10-09): o valor único da série
// deriva dele; card e modal de execução herdam o rótulo via propriedade.
export type ExerciseMode = 'repeticao' | 'tempo';

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  videoLink: string | null;
  loadUnit: LoadUnit | null;
  // Nulo = linha antiga sem modo (fallback de leitura: repetição).
  // Opcional para não quebrar fixtures anteriores à migração 0012.
  mode?: ExerciseMode | null;
  deletedAt: string | null;
  createdAt: string;
  created_by: string;
}

export interface CreateExerciseInput {
  name: string;
  muscle: string;
  videoLink?: string | null;
  mode?: ExerciseMode | null;
  loadUnit?: LoadUnit | null;
}

export interface UpdateExerciseInput {
  name: string;
  muscle: string;
  videoLink: string | null;
  mode?: ExerciseMode | null;
  loadUnit?: LoadUnit | null;
}

export type ProgramStatus = 'rascunho' | 'ativo' | 'inativo';

// Origem da mensagem da lista (Patch v4, D15): decide o retry no banner.
// Casa única em @/lib/shared (Patch v5, D26) — hook grava, ProgramList consome.
export type ProgramErrorOrigin = ErrorOrigin;

export interface ProgramRow {
  id: string;
  title: string;
  owner: string;
  status: ProgramStatus;
  created_at: string;
  created_by: string;
}

export interface Program {
  id: string;
  title: string;
  owner: string;
  status: ProgramStatus;
  createdAt: string;
  created_by: string;
}

export interface CreateProgramInput {
  title: string;
  owner: string;
  status?: ProgramStatus;
}

export interface UpdateProgramInput {
  title?: string;
  status?: ProgramStatus;
}

export interface WorkoutRow {
  id: string;
  program_id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export interface Workout {
  id: string;
  programId: string;
  name: string;
  createdAt: string;
  created_by: string;
}

export interface WorkoutEntryRow {
  id: string;
  workout_id: string;
  program_id: string;
  exercise_id: string;
  position: number;
  rest_seconds: number | null;
  created_at: string;
  created_by: string;
}

export interface WorkoutEntry {
  id: string;
  workoutId: string;
  programId: string;
  exerciseId: string;
  position: number;
  restSeconds: number | null;
  createdAt: string;
  created_by: string;
}

export interface WorkoutSeriesRow {
  id: string;
  entry_id: string;
  position: number;
  reps: number | null;
  duration_seconds: number | null;
  load: number | null;
  created_at: string;
  created_by: string;
}

export interface WorkoutSeries {
  id: string;
  entryId: string;
  position: number;
  reps: number | null;
  durationSeconds: number | null;
  load: number | null;
  createdAt: string;
  created_by: string;
}

export interface WorkoutEntryView {
  entry: WorkoutEntry;
  exercise: Exercise;
  series: WorkoutSeries[];
}

export interface CreateWorkoutInput {
  name: string;
}

export interface UpdateWorkoutInput {
  name: string;
}

// ----------------------------------------------------------------------------
// Execução série a série (Mílon #5, D1/D2/D3): instância do treino + séries
// realizadas. finishedAt nulo = execução aberta. O Treino do Dia exibe o
// template ao vivo com marcadores de feito por série (sem foto; valores reais
// ficam para o encerrar #7).
// ----------------------------------------------------------------------------

export interface WorkoutExecutionRow {
  id: string;
  workout_id: string;
  program_id: string;
  started_at: string;
  finished_at: string | null;
  created_at: string;
  created_by: string;
}

export interface WorkoutExecution {
  id: string;
  workoutId: string;
  programId: string;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
  created_by: string;
}

export interface WorkoutExecutionSeriesRow {
  id: string;
  execution_id: string;
  entry_id: string;
  series_id: string;
  position: number;
  reps: number | null;
  duration_seconds: number | null;
  load: number | null;
  created_at: string;
  created_by: string;
}

export interface WorkoutExecutionSeries {
  id: string;
  executionId: string;
  entryId: string;
  seriesId: string;
  position: number;
  reps: number | null;
  durationSeconds: number | null;
  load: number | null;
  createdAt: string;
  created_by: string;
}

export interface MarkExecutionSeriesInput {
  executionId: string;
  entryId: string;
  seriesId: string;
  position: number;
  reps: number | null;
  durationSeconds: number | null;
  load: number | null;
}

// ----------------------------------------------------------------------------
// Legado do scaffold (removido na TASK-003/004/005 junto aos arquivos example).
// Mantido nesta task para não quebrar `tsc` enquanto o scaffold ainda consome.
// ----------------------------------------------------------------------------

export interface MilonItemRow {
  id: string;
  name: string;
  created_at: string;
}

export interface MilonItem {
  id: string;
  name: string;
  created_at: string;
}

export interface CreateMilonInput {
  name: string;
}
