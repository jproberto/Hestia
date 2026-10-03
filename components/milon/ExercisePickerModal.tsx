"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Exercise } from "@/lib/milon/types";
import {
  matchesExerciseQuery,
  normalizeExerciseText,
} from "@/lib/milon/utils";
import { EXERCISE_PAGE_SIZE } from "@/lib/milon/utils";

export interface ExercisePickerModalProps {
  open: boolean;
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  searchText: string;
  muscleFilter: string;
  muscleOptions: string[];
  onSearch: (text: string) => void;
  onFilterMuscle: (muscle: string) => void;
  onSelect: (exercise: Exercise) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

/**
 * Seletor da biblioteca para adicionar exercício ao treino (Mílon #3, CA-19).
 * Busca por nome via matchesExerciseQuery (controlada por searchText) e
 * filtro por músculo via normalizeExerciseText (controlado por muscleFilter).
 * Lazy load client-side em lotes de EXERCISE_PAGE_SIZE: renderiza só o início
 * da lista filtrada e acrescenta mais ao rolar (onScroll + IntersectionObserver
 * nativo, sem dependência nova) com fallback explícito "Carregar mais".
 * Painel com altura travada via style inline (nunca excede a viewport):
 * header/rodapé com flexShrink 0 sempre visíveis, só a lista rola.
 * Botões "Cadastrar novo" e "Cancelar" ficam no rodapé fixo, sempre visíveis.
 * Erro (D14/bloqueio ou operação) fica visível sem retry e sem fechar o modal.
 */
export default function ExercisePickerModal({
  open,
  exercises,
  loading,
  error,
  saving,
  searchText,
  muscleFilter,
  muscleOptions,
  onSearch,
  onFilterMuscle,
  onSelect,
  onCreateNew,
  onClose,
}: ExercisePickerModalProps) {
  const visiveis = useMemo(
    () =>
      exercises.filter(
        (exercise) =>
          matchesExerciseQuery(exercise, searchText) &&
          (muscleFilter === "" ||
            normalizeExerciseText(exercise.muscle) ===
              normalizeExerciseText(muscleFilter)),
      ),
    [exercises, searchText, muscleFilter],
  );

  const [visibleCount, setVisibleCount] = useState(EXERCISE_PAGE_SIZE);
  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollTo?.({ top: 0 });
  }, []);

  // Volta ao lote inicial quando o usuário muda a busca ou o filtro.
  const handleSearch = useCallback(
    (text: string) => {
      setVisibleCount(EXERCISE_PAGE_SIZE);
      scrollToTop();
      onSearch(text);
    },
    [onSearch, scrollToTop],
  );

  const handleFilterMuscle = useCallback(
    (muscle: string) => {
      setVisibleCount(EXERCISE_PAGE_SIZE);
      scrollToTop();
      onFilterMuscle(muscle);
    },
    [onFilterMuscle, scrollToTop],
  );

  const exibidos = useMemo(
    () => visiveis.slice(0, visibleCount),
    [visiveis, visibleCount],
  );
  const hasMore = visibleCount < visiveis.length;

  const loadMore = useCallback(() => {
    setVisibleCount((count) =>
      Math.min(visiveis.length, count + EXERCISE_PAGE_SIZE),
    );
  }, [visiveis.length]);

  const handleListScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      if (
        target.scrollTop + target.clientHeight >=
        target.scrollHeight - 96
      ) {
        loadMore();
      }
    },
    [loadMore],
  );

  // Carrega o próximo lote ao chegar perto do fim (reforço do onScroll).
  useEffect(() => {
    if (!open || !hasMore) return;
    const root = listRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root, rootMargin: "96px" },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [open, hasMore, loadMore, exibidos.length]);

  const handleClose = useCallback(() => {
    setVisibleCount(EXERCISE_PAGE_SIZE);
    scrollToTop();
    onClose();
  }, [onClose, scrollToTop]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-lg border bg-card text-card-foreground shadow-lg"
        style={{
          height: "min(560px, calc(100vh - 2rem))",
          maxHeight: "calc(100vh - 2rem)",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header fixo: título + busca + filtro (pb-4 dá o respiro fixo
            entre a combo e a linha — fora da área rolável, não some no scroll) */}
        <div
          className="border-b px-4 pb-4 pt-4"
          style={{ flexShrink: 0 }}
        >
          <h2 className="text-base font-display tracking-wider text-[#B7602B]">
            Escolher exercício
          </h2>

          {error ? (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="mt-2 flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="exercise-picker-search" className="text-xs font-semibold">
                Buscar
              </Label>
              <Input
                id="exercise-picker-search"
                type="search"
                placeholder="Buscar por nome…"
                value={searchText}
                onChange={(event) => {
                  handleSearch(event.target.value);
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="exercise-picker-muscle" className="text-xs font-semibold">
                Músculo
              </Label>
              <select
                id="exercise-picker-muscle"
                aria-label="Filtrar por músculo"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                value={muscleFilter}
                onChange={(event) => {
                  handleFilterMuscle(event.target.value);
                }}
              >
                <option value="">Todos</option>
                {muscleOptions.map((muscle) => (
                  <option key={muscle} value={muscle}>
                    {muscle}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Só a lista rola (altura herdada do painel via flex).
            pt-3 é só respiro interno abaixo da linha; o espaço estável acima
            da linha vive no header (pb-4), pois padding-top dentro do
            scrollport rola junto e some. */}
        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="px-4 pb-3 pt-3"
          style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}
        >
          {loading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Carregando exercícios…
            </p>
          ) : visiveis.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Nenhum exercício encontrado.
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-1.5">
                {exibidos.map((exercise) => (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted"
                      onClick={() => onSelect(exercise)}
                    >
                      <span className="block text-sm font-medium">
                        {exercise.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {exercise.muscle}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {hasMore ? (
                <div className="flex flex-col items-center gap-1 py-3">
                  <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
                  <p className="text-center text-xs text-muted-foreground">
                    Mostrando {exibidos.length} de {visiveis.length}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                  >
                    Carregar mais
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Rodapé fixo: sempre visível */}
        <div
          className="flex items-center justify-between gap-2 border-t px-4 py-3"
          style={{ flexShrink: 0 }}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={onCreateNew}
          >
            Cadastrar novo
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={handleClose}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
