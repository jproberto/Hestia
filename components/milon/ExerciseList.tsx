"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { Exercise } from "@/lib/milon/types";

export interface ExerciseListProps {
  visibleItems: Exercise[];
  remainingCount: number;
  muscleOptions: string[];
  muscleFilter: string;
  searchText: string;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  onFilterChange: (muscle: string) => void;
  onSearchChange: (text: string) => void;
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
  loading,
  error,
  isEmpty,
  onFilterChange,
  onSearchChange,
  onShowMore,
  onRetry,
  onEdit,
  onDelete,
}: ExerciseListProps) {
  return (
    <section className="flex flex-col gap-4" aria-label="Biblioteca de exercícios">
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
      </div>

      {loading ? (
        <p className="p-8 text-center text-sm font-display text-[#B7602B] tracking-wider">
          Carregando exercícios...
        </p>
      ) : error ? (
        <div className="rounded-lg border bg-card p-8 text-center shadow-sm flex flex-col items-center gap-2">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          <Button onClick={onRetry} size="sm" variant="outline">
            Tentar novamente
          </Button>
        </div>
      ) : isEmpty ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm shadow-sm flex flex-col items-center gap-2">
          <p className="font-display text-[#B7602B] tracking-wider">
            Nenhum exercício cadastrado ainda.
          </p>
          <p className="text-muted-foreground">
            Crie o primeiro exercício da biblioteca para começar.
          </p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm shadow-sm flex flex-col items-center gap-2">
          <p className="font-display text-[#B7602B] tracking-wider">
            Nada encontrado para essa combinação.
          </p>
          <p className="text-muted-foreground">
            Ajuste os filtros ou crie o exercício na biblioteca.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {visibleItems.map((exercise) => (
              <li
                key={exercise.id}
                className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="font-display text-[#B7602B] tracking-wider truncate">
                    {exercise.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">{exercise.muscle}</span>
                  {exercise.videoLink ? (
                    <a
                      href={exercise.videoLink}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ver vídeo de ${exercise.name}`}
                      className="text-xs text-sky-700 underline dark:text-sky-300"
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
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(exercise)}
                    aria-label={`Excluir ${exercise.name}`}
                    title="Excluir exercício"
                    className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors"
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
      )}
    </section>
  );
}
