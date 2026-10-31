"use client";

import { Button } from "@/components/ui/button";
import { AsyncState } from "@/components/ui/AsyncState";
import { Pencil, Trash2 } from "lucide-react";
import type { ErrorOrigin } from "@/lib/shared";
import type { Exercise } from "@/lib/milon/types";
import type { ExerciseSortOrder } from "@/lib/milon/utils";

export interface ExerciseListProps {
  visibleItems: Exercise[];
  remainingCount: number;
  muscleOptions: string[];
  muscleFilter: string;
  searchText: string;
  sortOrder?: ExerciseSortOrder;
  loading: boolean;
  error: string | null;
  errorOrigin: ErrorOrigin | null;
  isEmpty: boolean;
  onFilterChange: (muscle: string) => void;
  onSearchChange: (text: string) => void;
  onSortChange?: (order: ExerciseSortOrder) => void;
  onShowMore: () => void;
  onRetry: () => void;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}

/**
 * Lista presentacional da biblioteca de exercícios (Mílon #1).
 * Sem fetch: recebe itens visíveis, filtro/busca atuais e estados via props.
 */
export default function ExerciseList({
  visibleItems,
  remainingCount,
  muscleOptions,
  muscleFilter,
  searchText,
  sortOrder = "muscle",
  loading,
  error,
  errorOrigin,
  isEmpty,
  onFilterChange,
  onSearchChange,
  onSortChange,
  onShowMore,
  onRetry,
  onEdit,
  onDelete,
}: ExerciseListProps) {
  return (
    <section className="flex flex-col gap-3" aria-label="Biblioteca de exercícios">
      <h2 className="text-xl font-display text-[#B7602B] tracking-wider">Exercícios</h2>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-display tracking-wider">Filtrar por músculo</span>
          <select
            aria-label="Filtrar por músculo"
            value={muscleFilter}
            onChange={(event) => onFilterChange(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos os músculos</option>
            {muscleOptions.map((muscle) => (
              <option key={muscle} value={muscle}>
                {muscle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-display tracking-wider">Buscar exercício</span>
          <input
            aria-label="Buscar exercício"
            type="search"
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Digite ao menos 3 letras"
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-display tracking-wider">Ordenar por</span>
          <select
            aria-label="Ordenar por"
            value={sortOrder}
            onChange={(event) => onSortChange?.(event.target.value as ExerciseSortOrder)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="muscle">Músculo</option>
            <option value="name">Nome</option>
          </select>
        </label>
      </div>

      <AsyncState
        loading={loading}
        error={error}
        errorOrigin={errorOrigin}
        empty={isEmpty}
        noResults={visibleItems.length === 0}
        onRetry={onRetry}
        loadingText="Carregando exercícios..."
        emptyTitle="Nenhum exercício cadastrado ainda."
        emptyText="Crie o primeiro exercício da biblioteca para começar."
        noResultsTitle="Nada encontrado para essa combinação."
        noResultsText="Ajuste os filtros ou crie o exercício na biblioteca."
      >
        {visibleItems.length > 0 ? (
          <>
            <ul className="flex flex-col gap-1.5">
              {visibleItems.map((exercise) => (
                <li
                  key={exercise.id}
                  className="rounded-lg border bg-card text-card-foreground shadow-sm px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h3 className="font-display text-sm leading-snug text-[#B7602B] tracking-wider truncate">
                      {exercise.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">{exercise.muscle}</span>
                    {exercise.videoLink ? (
                      <a
                        href={exercise.videoLink}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Ver vídeo de ${exercise.name}`}
                        className="text-xs text-[#C2703D] underline underline-offset-2"
                      >
                        Ver vídeo
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit(exercise)}
                      aria-label={`Editar ${exercise.name}`}
                      title="Editar exercício"
                      className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(exercise)}
                      aria-label={`Excluir ${exercise.name}`}
                      title="Excluir exercício"
                      className="p-2 min-h-10 min-w-10 inline-flex items-center justify-center rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {remainingCount > 0 ? (
              <Button onClick={onShowMore} variant="outline" className="w-full sm:w-auto">
                Mostrar mais ({remainingCount} restantes)
              </Button>
            ) : null}
          </>
        ) : null}
      </AsyncState>
    </section>
  );
}
