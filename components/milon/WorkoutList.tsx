"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  /** Ordem própria (Mílon 07b, D2/D7): recebe os identificadores na ordem do
   * arrasto ao soltar. Ausente, a lista comporta-se exatamente como hoje. */
  onReorder?: (orderedIds: string[]) => void;
}

interface GhostState {
  workoutId: string | null;
  clientX: number;
  clientY: number;
  cardRect: DOMRect | null;
}

interface PlaceholderState {
  index: number | null;
  workoutId: string | null;
}

/**
 * Lista presentacional de treinos do Programa (Mílon #3).
 * Sem fetch: recebe itens na ordem vigente, subtítulos derivados e
 * estados via props. Estados via AsyncState centralizado (D27/R31).
 * Reordenação (Mílon 07b, D2/D7) pelo protocolo Pointer Events de
 * WorkoutEntriesList: a alça inicia o gesto, o movimento reordena de forma
 * otimista no DOM e o soltar entrega orderedIds. Fantasma com opacidade
 * reduzida durante o arrasto e indicador da posição de soltura. Alças
 * ocultas quando readOnly (programa inativo) ou sem onReorder.
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
  onReorder,
}: WorkoutListProps) {
  const reorderEnabled = onReorder !== undefined && !readOnly;

  const [order, setOrder] = useState<string[]>(() =>
    items.map((workout) => workout.id),
  );
  const orderRef = useRef<string[]>(order);
  const draggingRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLUListElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [ghost, setGhost] = useState<GhostState>({
    workoutId: null,
    clientX: 0,
    clientY: 0,
    cardRect: null,
  });
  const [placeholder, setPlaceholder] = useState<PlaceholderState>({
    index: null,
    workoutId: null,
  });

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    if (draggingRef.current !== null) return;
    const ids = items.map((workout) => workout.id);
    setOrder((anterior) => {
      const mesmos =
        anterior.length === ids.length &&
        anterior.every((id, idx) => id === ids[idx]);
      if (mesmos) return anterior;
      const conhecidas = new Set(ids);
      const mantidas = anterior.filter((id) => conhecidas.has(id));
      const novas = ids.filter((id) => !anterior.includes(id));
      return [...mantidas, ...novas];
    });
  }, [items]);

  const workoutById = useMemo(
    () => new Map(items.map((workout) => [workout.id, workout])),
    [items],
  );
  const orderedWorkouts = useMemo(
    () =>
      order
        .map((id) => workoutById.get(id))
        .filter((workout): workout is Workout => workout !== undefined),
    [order, workoutById],
  );

  function reorderPara(clientY: number): void {
    const arrastando = draggingRef.current;
    if (arrastando === null) return;
    const container = containerRef.current;
    if (!container) return;
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-workout-id]"),
    );
    const semArrastado = orderRef.current.filter((id) => id !== arrastando);
    let inserirEm = semArrastado.length;
    let placeholderIndex = semArrastado.length;
    let placeholderWorkoutId: string | null = null;
    for (const card of cards) {
      const id = card.getAttribute("data-workout-id");
      if (!id || id === arrastando) continue;
      const rect = card.getBoundingClientRect();
      const meio = rect.top + rect.height / 2;
      if (clientY < meio) {
        inserirEm = semArrastado.indexOf(id);
        placeholderIndex = semArrastado.indexOf(id);
        placeholderWorkoutId = id;
        break;
      }
    }
    if (inserirEm < 0) inserirEm = semArrastado.length;
    const proxima = [...semArrastado];
    proxima.splice(inserirEm, 0, arrastando);
    const atual = orderRef.current;
    const mudou =
      proxima.length !== atual.length ||
      proxima.some((id, idx) => id !== atual[idx]);
    if (mudou) {
      setOrder(proxima);
      setPlaceholder({ index: placeholderIndex, workoutId: placeholderWorkoutId });
    }
  }

  function handlePointerDown(event: React.PointerEvent): void {
    if (readOnly || onReorder === undefined) return;
    const alvo = event.target as Element | null;
    const handle = alvo?.closest?.("[data-drag-handle]") ?? null;
    if (!handle) return;
    const card = handle.closest("[data-workout-id]");
    const workoutId = card?.getAttribute("data-workout-id");
    if (!workoutId) return;
    draggingRef.current = workoutId;
    const cardRect = card?.getBoundingClientRect() ?? null;
    setGhost({
      workoutId,
      clientX: event.clientX,
      clientY: event.clientY,
      cardRect,
    });
  }

  function handlePointerMove(event: React.PointerEvent): void {
    if (draggingRef.current === null) return;
    setGhost((prev) => ({
      ...prev,
      clientX: event.clientX,
      clientY: event.clientY,
    }));
    reorderPara(event.clientY);
  }

  function handlePointerUp(): void {
    const arrastando = draggingRef.current;
    if (arrastando === null) return;
    draggingRef.current = null;
    setGhost({ workoutId: null, clientX: 0, clientY: 0, cardRect: null });
    setPlaceholder({ index: null, workoutId: null });
    onReorder?.([...orderRef.current]);
  }

  const ghostCard =
    ghost.workoutId && ghost.cardRect ? (
      <div
        ref={ghostRef}
        className="fixed pointer-events-none z-50 transition-opacity duration-150 opacity-50"
        style={{
          left: ghost.cardRect.left,
          top: ghost.cardRect.top,
          width: ghost.cardRect.width,
          height: ghost.cardRect.height,
          transform: `translate(${ghost.clientX - ghost.cardRect.left}px, ${ghost.clientY - ghost.cardRect.top}px)`,
        }}
        aria-hidden="true"
      >
        <div
          className="rounded-lg border bg-card text-card-foreground shadow-lg px-3 py-2 flex items-center gap-2"
          style={{ width: "100%", height: "100%" }}
        >
          <span aria-hidden="true">⠿</span>
          <span className="font-display text-sm leading-snug tracking-wider truncate flex-1">
            {workoutById.get(ghost.workoutId)?.name ?? ""}
          </span>
        </div>
      </div>
    ) : null;

  return (
    <section className="flex flex-col gap-3 relative" aria-label="Treinos">
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
          <ul
            ref={containerRef}
            className="flex flex-col gap-1.5"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {orderedWorkouts.map((workout, index) => {
              const isPlaceholderBefore =
                placeholder.index === index &&
                placeholder.workoutId !== workout.id;
              const isPlaceholderAfter =
                placeholder.index === index + 1 &&
                placeholder.workoutId !== workout.id;
              const subtitle = subtitles[workout.id] ?? "";
              return (
                <React.Fragment key={workout.id}>
                  {isPlaceholderBefore ? (
                    <li
                      className="h-12 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 animate-pulse"
                      aria-hidden="true"
                      data-placeholder="true"
                    />
                  ) : null}
                  <li
                    data-workout-id={workout.id}
                    className={`rounded-lg border bg-card text-card-foreground shadow-sm px-3 py-2 flex items-center justify-between gap-2 transition-all duration-300 ease-out ${
                      ghost.workoutId === workout.id
                        ? "opacity-0 pointer-events-none"
                        : "opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {reorderEnabled ? (
                        <button
                          type="button"
                          aria-label="Arrastar para reordenar"
                          title="Arrastar para reordenar"
                          data-drag-handle
                          className="shrink-0 rounded p-2 text-muted-foreground hover:bg-muted touch-none select-none"
                        >
                          <span aria-hidden="true">⠿</span>
                        </button>
                      ) : null}
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
                  {isPlaceholderAfter && index === orderedWorkouts.length - 1 ? (
                    <li
                      className="h-12 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 animate-pulse"
                      aria-hidden="true"
                      data-placeholder="true"
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </ul>
        ) : null}
      </AsyncState>

      {ghostCard}
    </section>
  );
}
