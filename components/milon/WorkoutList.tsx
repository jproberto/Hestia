"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AsyncState } from "@/components/ui/AsyncState";
import type { ProgramErrorOrigin, Workout } from "@/lib/milon/types";

export interface WorkoutListProps {
  items: Workout[];
  subtitles: Record<string, string>;
  programId: string;
  loading: boolean;
  error: string | null;
  errorOrigin: ProgramErrorOrigin | null;
  empty: boolean;
  readOnly: boolean;
  onRename: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
  onRetry: () => void;
}

/**
 * Lista presentacional de treinos do Programa (Mílon #3).
 * Sem fetch: recebe itens na ordem de criação, subtítulos derivados e
 * estados via props. Estados via AsyncState centralizado (D27/R31).
 */
export default function WorkoutList({
  items,
  subtitles,
  programId,
  loading,
  error,
  errorOrigin,
  empty,
  readOnly,
  onRename,
  onDelete,
  onRetry,
}: WorkoutListProps) {
  return (
    <section className="flex flex-col gap-3" aria-label="Treinos">
      <h2 className="text-xl font-display text-[#B7602B] tracking-wider">Treinos</h2>

      <AsyncState
        loading={loading}
        error={error}
        errorOrigin={errorOrigin}
        empty={empty}
        onRetry={onRetry}
        loadingText="Carregando treinos…"
        emptyTitle="Nenhum treino ainda."
        emptyText="Adicione o primeiro treino para começar."
      >
        {items.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {items.map((workout) => {
              const subtitle = subtitles[workout.id] ?? "";
              return (
                <li
                  key={workout.id}
                  className="rounded-lg border bg-card text-card-foreground shadow-sm px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h3 className="font-display text-sm leading-snug tracking-wider truncate">
                      <Link
                        href={`/milon/programs/${programId}/workouts/${workout.id}`}
                        className="text-[#B7602B] hover:text-[#C2703D] transition-colors no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7602B]"
                      >
                        {workout.name}
                      </Link>
                    </h3>
                    {subtitle !== "" ? (
                      <span className="text-xs text-muted-foreground">{subtitle}</span>
                    ) : null}
                  </div>
                  {readOnly ? null : (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onRename(workout)}
                      >
                        Renomear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(workout)}
                      >
                        Excluir
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </AsyncState>
    </section>
  );
}
