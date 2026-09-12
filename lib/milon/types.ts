// Types consolidados do módulo Mílon — FONTE ÚNICA (nunca duplicar tipos).
// Ver Mapa de Camadas no AGENTS.md: Row (banco) / domínio / Input (repositório).

export interface ExerciseRow {
  id: string;
  name: string;
  muscle: string;
  video_link: string | null;
  created_at: string;
  created_by: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  videoLink: string | null;
  createdAt: string;
  created_by: string;
}

export interface CreateExerciseInput {
  name: string;
  muscle: string;
  videoLink?: string | null;
}

export interface UpdateExerciseInput {
  name: string;
  muscle: string;
  videoLink: string | null;
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
