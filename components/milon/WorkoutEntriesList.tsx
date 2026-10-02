"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AsyncState } from "@/components/ui/AsyncState";
import type { ErrorOrigin } from "@/lib/shared";
import type { LoadUnit, WorkoutEntryView } from "@/lib/milon/types";
import ExerciseEntryCard from "./ExerciseEntryCard";
import type { SerieField } from "./SeriesCard";

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

/**
 * Lista de exercícios do treino (Mílon #3, D8).
 * Um ExerciseEntryCard por entrada na ordem de position; arrastar e soltar
 * com Pointer Events nativas (zero dependências): o handle inicia o gesto, o
 * movimento reordena de forma otimista no DOM e o soltar entrega orderedIds.
 * Estados via AsyncState centralizado (D27/R31); readOnly desliga tudo.
 */
export default function WorkoutEntriesList({
  entries,
  programId,
  readOnly,
  empty,
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
  const ordenadas = useMemo(
    () => [...entries].sort((a, b) => a.entry.position - b.entry.position),
    [entries],
  );
  const [order, setOrder] = useState<string[]>(() =>
    ordenadas.map((view) => view.entry.id),
  );
  const orderRef = useRef<string[]>(order);
  const draggingRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    if (draggingRef.current !== null) return;
    const ids = ordenadas.map((view) => view.entry.id);
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
  }, [ordenadas]);

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
    for (const card of cards) {
      const id = card.getAttribute("data-entry-id");
      if (!id || id === arrastando) continue;
      const rect = card.getBoundingClientRect();
      const meio = rect.top + rect.height / 2;
      if (clientY < meio) {
        inserirEm = semArrastado.indexOf(id);
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
    if (mudou) setOrder(proxima);
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
  }

  function handlePointerMove(event: React.PointerEvent): void {
    if (draggingRef.current === null) return;
    reorderPara(event.clientY);
  }

  function handlePointerUp(): void {
    const arrastando = draggingRef.current;
    if (arrastando === null) return;
    draggingRef.current = null;
    onReorder([...orderRef.current]);
  }

  return (
    <section aria-label="Exercícios do treino" className="flex flex-col gap-3">
      <AsyncState
        loading={false}
        error={errorMsg}
        errorOrigin={errorOrigin}
        empty={empty}
        onRetry={onRetry}
        loadingText="Carregando exercícios…"
        emptyTitle="Nenhum exercício ainda."
        emptyText="Escolha o primeiro exercício da biblioteca para começar."
      >
        <ul
          ref={containerRef}
          className="flex flex-col gap-2"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {orderedViews.map((view) => (
            <ExerciseEntryCard
              key={view.entry.id}
              entryView={view}
              readOnly={readOnly}
              unitPromptValue={null}
              saving={false}
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
          ))}
        </ul>
      </AsyncState>

      {readOnly ? null : (
        <div className="flex justify-start">
          <Button type="button" variant="outline" onClick={onAdd}>
            Adicionar exercício
          </Button>
        </div>
      )}
    </section>
  );
}
