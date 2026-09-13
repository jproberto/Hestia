// Regras puras do módulo Mílon (sem I/O, testadas direto).
// Ver Mapa de Camadas no AGENTS.md + plan.md §3 (contrato TASK-002).

export const EXERCISE_PAGE_SIZE = 20;

export const EXERCISE_SEARCH_MIN_LENGTH = 3;

// Ordem de exibição da consulta (adendo UX v2, spec §3/§5):
// "muscle" mantém o comportamento atual (músculo→nome); "name" ordena só por nome.
export type ExerciseSortOrder = "muscle" | "name";

interface ExerciseNameLike {
  name: string;
}

interface ExerciseIdentityLike {
  name: string;
  muscle: string;
}

export function normalizeExerciseText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isSameExercise(
  a: ExerciseIdentityLike,
  b: ExerciseIdentityLike,
): boolean {
  return (
    normalizeExerciseText(a.name) === normalizeExerciseText(b.name) &&
    normalizeExerciseText(a.muscle) === normalizeExerciseText(b.muscle)
  );
}

export function matchesExerciseQuery(
  exercise: ExerciseNameLike | string,
  query: string,
): boolean {
  const name = typeof exercise === "string" ? exercise : exercise.name;
  const normalizedQuery = normalizeExerciseText(query);
  if (normalizedQuery.length < EXERCISE_SEARCH_MIN_LENGTH) {
    return true;
  }
  return normalizeExerciseText(name).includes(normalizedQuery);
}

// Alias pedido no delegate (mesmo contrato de matchesExerciseQuery).
export const matchesExerciseSearch = matchesExerciseQuery;

export function compareExercisesByMuscleThenName(
  a: ExerciseIdentityLike,
  b: ExerciseIdentityLike,
): number {
  const muscleA = normalizeExerciseText(a.muscle);
  const muscleB = normalizeExerciseText(b.muscle);
  if (muscleA < muscleB) return -1;
  if (muscleA > muscleB) return 1;
  const nameA = normalizeExerciseText(a.name);
  const nameB = normalizeExerciseText(b.name);
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return 0;
}

// Alias pedido no delegate (mesmo contrato do comparador músculo→nome).
export const compareExercises = compareExercisesByMuscleThenName;

export function compareExercisesByName(
  a: ExerciseIdentityLike,
  b: ExerciseIdentityLike,
): number {
  const nameA = normalizeExerciseText(a.name);
  const nameB = normalizeExerciseText(b.name);
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return 0;
}
