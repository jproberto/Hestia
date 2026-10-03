"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncState } from "@/components/ui/AsyncState";
import type { ErrorOrigin } from "@/lib/shared";
import type { LoadUnit, WorkoutEntryView } from "@/lib/milon/types";
import ExerciseEntryCard from "./ExerciseEntryCard";
import type { SerieField } from "./SeriesCard";
import {
  matchesExerciseQuery,
  normalizeExerciseText,
} from "@/lib/milon/utils";
import { EXERCISE_PAGE_SIZE } from "@/lib/milon/utils";

export interface WorkoutEntriesListProps {
  entries: WorkoutEntryView[];
  programId: string;
  readOnly: boolean;
  empty: boolean;
  errorMsg: string | null;
  errorOrigin: ErrorOrigin | null;
  onAdd: () => void;
  onRetry: () => void;
  onReorder: (orderedIds: string[]) => void;
  onQuantityCommit: (entryId: string, quantity: number) => void;
  onRequestReduce: (entryId: string, newQuantity: number) => void;
  onRestCommit: (entryId: string, seconds: number | null) => void;
  onSeriesCommit: (
    entryId: string,
    seriesId: string,
    field: SerieField,
    value: number | null,
  ) => void;
  onApplyAll: (entryId: string, seriesId: string) => void;
  onEditExercise: (entryId: string) => void;
  onRemoveEntry: (entryId: string) => void;
  onConfirmUnit: (entryId: string, unit: LoadUnit) => void;
}

interface GhostState {
  entryId: string | null;
  clientX: number;
  clientY: number;
  cardRect: DOMRect | null;
}

interface PlaceholderState {
  index: number | null;
  entryId: string | null;
}

/**
 * Lista de exercícios do treino (Mílon #3, D8, CA-19, CA-25).
 * Um ExerciseEntryCard por entrada na ordem de position; arrastar e soltar
 * com Pointer Events nativas (zero dependências): o handle inicia o gesto, o
 * movimento reordena de forma otimista no DOM e o soltar entrega orderedIds.
 * Ghost card com opacidade reduzida durante arraste, placeholder visual indicando
 * posição de drop, animação suave de reordenação dos demais cards.
 * Busca por nome e filtro por músculo com paginação client-side (EXERCISE_PAGE_SIZE).
 * Botão "Adicionar exercício" fixo no topo (sticky) para acesso rápido.
 * Estados via AsyncState centralizado (D27/R31); readOnly desliga tudo.
 */
export default function WorkoutEntriesList({
  entries,
  programId,
  readOnly,
  errorMsg,
  errorOrigin,
  onAdd,
  onRetry,
  onReorder,
  onQuantityCommit,
  onRequestReduce,
  onRestCommit,
  onSeriesCommit,
  onApplyAll,
  onEditExercise,
  onRemoveEntry,
  onConfirmUnit,
}: WorkoutEntriesListProps) {
  void programId;
  const [searchText, setSearchText] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ordenadas = useMemo(
    () => [...entries].sort((a, b) => a.entry.position - b.entry.position),
    [entries],
  );

  // Extract unique muscles from entries for filter options
  const muscleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          ordenadas
            .map((view) => view.exercise.muscle)
            .filter((m): m is string => m !== undefined && m !== ""),
        ),
      ).sort((a, b) => normalizeExerciseText(a).localeCompare(normalizeExerciseText(b))),
    [ordenadas],
  );

  // Filter entries by search and muscle
  const filteredEntries = useMemo(
    () =>
      ordenadas.filter(
        (view) =>
          matchesExerciseQuery(view.exercise, searchText) &&
          (muscleFilter === "" ||
            normalizeExerciseText(view.exercise.muscle) ===
              normalizeExerciseText(muscleFilter)),
      ),
    [ordenadas, searchText, muscleFilter],
  );

  const [order, setOrder] = useState<string[]>(() =>
    filteredEntries.map((view) => view.entry.id),
  );
  const orderRef = useRef<string[]>(order);
  const draggingRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLUListElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [ghost, setGhost] = useState<GhostState>({
    entryId: null,
    clientX: 0,
    clientY: 0,
    cardRect: null,
  });
  const [placeholder, setPlaceholder] = useState<PlaceholderState>({
    index: null,
    entryId: null,
  });

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    if (draggingRef.current !== null) return;
    const ids = filteredEntries.map((view) => view.entry.id);
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
  }, [filteredEntries]);

  const viewsById = useMemo(
    () => new Map(entries.map((view) => [view.entry.id, view])),
    [entries],
  );
  const orderedViews = useMemo(
    () =>
      order
        .map((id) => viewsById.get(id))
        .filter((view): view is WorkoutEntryView => view !== undefined),
    [order, viewsById],
  );

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / EXERCISE_PAGE_SIZE) || 1;
  const page = useMemo(() => {
    if (currentPage > totalPages) return totalPages;
    return currentPage;
  }, [currentPage, totalPages]);

  const paginatedViews = useMemo(
    () =>
      orderedViews.slice((page - 1) * EXERCISE_PAGE_SIZE, page * EXERCISE_PAGE_SIZE),
    [orderedViews, page],
  );

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchText, muscleFilter]);

  function reorderPara(clientY: number): void {
    const arrastando = draggingRef.current;
    if (arrastando === null) return;
    const container = containerRef.current;
    if (!container) return;
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-entry-id]"),
    );
    const semArrastado = orderRef.current.filter((id) => id !== arrastando);
    let inserirEm = semArrastado.length;
    let placeholderIndex = semArrastado.length;
    let placeholderEntryId: string | null = null;
    for (const card of cards) {
      const id = card.getAttribute("data-entry-id");
      if (!id || id === arrastando) continue;
      const rect = card.getBoundingClientRect();
      const meio = rect.top + rect.height / 2;
      if (clientY < meio) {
        inserirEm = semArrastado.indexOf(id);
        placeholderIndex = semArrastado.indexOf(id);
        placeholderEntryId = id;
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
      setPlaceholder({ index: placeholderIndex, entryId: placeholderEntryId });
    }
  }

  function handlePointerDown(event: React.PointerEvent): void {
    if (readOnly) return;
    const alvo = event.target as Element | null;
    const handle = alvo?.closest?.("[data-drag-handle]") ?? null;
    if (!handle) return;
    const card = handle.closest("[data-entry-id]");
    const entryId = card?.getAttribute("data-entry-id");
    if (!entryId) return;
    draggingRef.current = entryId;
    const cardRect = card?.getBoundingClientRect() ?? null;
    setGhost({
      entryId,
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
    setGhost({ entryId: null, clientX: 0, clientY: 0, cardRect: null });
    setPlaceholder({ index: null, entryId: null });
    onReorder([...orderRef.current]);
  }

  const isEmpty = filteredEntries.length === 0;

  // Render ghost card
  const ghostCard = ghost.entryId && ghost.cardRect ? (
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
      <div className="rounded-lg border bg-card text-card-foreground shadow-lg px-3 py-2 flex flex-col gap-2" style={{ width: "100%", height: "100%" }}>
        <div className="flex items-center gap-2">
          <span aria-hidden="true">⠿</span>
          <h3 className="font-display text-sm leading-snug tracking-wider truncate flex-1">
            {viewsById.get(ghost.entryId)?.exercise.name ?? ""}
          </h3>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <section aria-label="Exercícios do treino" className="flex flex-col gap-3 relative">
      {/* Header sticky com busca, filtro e botão Adicionar exercício */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 p-2 rounded-lg border-b pb-2 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-display tracking-wider text-[#B7602B] flex-1">
            Exercícios do treino
          </h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workout-entries-search" className="text-xs font-semibold">
            Buscar
          </Label>
          <Input
            id="workout-entries-search"
            type="search"
            placeholder="Buscar por nome…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            disabled={readOnly}
          />
        </div>

        {muscleOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workout-entries-muscle" className="text-xs font-semibold">
              Músculo
            </Label>
            <select
              id="workout-entries-muscle"
              aria-label="Filtrar por músculo"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              value={muscleFilter}
              onChange={(event) => setMuscleFilter(event.target.value)}
              disabled={readOnly}
            >
              <option value="">Todos</option>
              {muscleOptions.map((muscle) => (
                <option key={muscle} value={muscle}>
                  {muscle}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <AsyncState
        loading={false}
        error={errorMsg}
        errorOrigin={errorOrigin}
        empty={isEmpty}
        onRetry={onRetry}
        loadingText="Carregando exercícios…"
        emptyTitle="Nenhum exercício ainda."
        emptyText="Escolha o primeiro exercício da biblioteca para começar."
      >
        <div className="flex flex-col gap-2 min-h-0 relative">
          <ul
            ref={containerRef}
            className="flex flex-col gap-2"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {paginatedViews.map((view, index) => {
              const isPlaceholderBefore = placeholder.index === index && placeholder.entryId !== view.entry.id;
              const isPlaceholderAfter = placeholder.index === index + 1 && placeholder.entryId !== view.entry.id;
              return (
                <React.Fragment key={view.entry.id}>
                  {isPlaceholderBefore && (
                    <li
                      className="h-20 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 animate-pulse"
                      aria-hidden="true"
                      data-placeholder="true"
                    />
                  )}
                  <ExerciseEntryCard
                    key={view.entry.id}
                    entryView={view}
                    readOnly={readOnly}
                    unitPromptValue={null}
                    saving={false}
                    isDragging={ghost.entryId === view.entry.id}
                    onQuantityCommit={(quantity) =>
                      onQuantityCommit(view.entry.id, quantity)
                    }
                    onRequestReduce={(newQuantity) =>
                      onRequestReduce(view.entry.id, newQuantity)
                    }
                    onRestCommit={(seconds) => onRestCommit(view.entry.id, seconds)}
                    onSeriesCommit={(seriesId, field, value) =>
                      onSeriesCommit(view.entry.id, seriesId, field, value)
                    }
                    onApplyAll={(seriesId) => onApplyAll(view.entry.id, seriesId)}
                    onEditExercise={() => onEditExercise(view.entry.id)}
                    onRemoveEntry={() => onRemoveEntry(view.entry.id)}
                    onChooseUnit={(unit) => onConfirmUnit(view.entry.id, unit)}
                  />
                  {isPlaceholderAfter && index === paginatedViews.length - 1 && (
                    <li
                      className="h-20 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 animate-pulse"
                      aria-hidden="true"
                      data-placeholder="true"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </ul>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      </AsyncState>

      {ghostCard}

      {readOnly ? null : (
        <div className="flex justify-start pt-2 border-t sticky bottom-0 bg-card/95 backdrop-blur-sm z-10">
          <Button type="button" variant="outline" onClick={onAdd}>
            Adicionar exercício
          </Button>
        </div>
      )}
    </section>
  );
}
