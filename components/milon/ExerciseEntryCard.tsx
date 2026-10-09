"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoadUnit, WorkoutEntryView } from "@/lib/milon/types";
import {
  MSG_QUANTIDADE_SERIES_INVALIDA,
  hasSeriePreenchida,
  interpretarQuantidadeSeries,
  validarInteiroCampo,
} from "@/lib/milon/workout-utils";
import SeriesCard, { type SerieField, type SeriesExecutionProps } from "./SeriesCard";

export interface ExerciseEntryCardProps {
  entryView: WorkoutEntryView;
  readOnly: boolean;
  /** @deprecated Ignorado — a unidade é definida pelo toggle kg/lb do SeriesCard. Mantido para compatibilidade. */
  unitPromptValue?: number | null;
  saving: boolean;
  isDragging?: boolean;
  onQuantityCommit: (quantity: number) => void;
  onRequestReduce: (newQuantity: number) => void;
  onRestCommit: (seconds: number | null) => void;
  onSeriesCommit: (
    seriesId: string,
    field: SerieField,
    value: number | null,
  ) => void;
  onApplyAll: (seriesId: string) => void;
  onEditExercise: () => void;
  onRemoveEntry: () => void;
  onChooseUnit: (unit: LoadUnit) => void;
  /** Pacote de execução (Mílon #5, opt-in): repassado sem interpretar. */
  execution?: SeriesExecutionProps;
}

/**
 * Card do exercício no treino (Mílon #3, CA-25; Mílon #5 replano: chrome
 * sempre visível).
 * Quantidade e descanso são campos não-controlados (key + defaultValue, o
 * commit lê o valor atual no blur/Enter): aumento commita direto, redução com
 * série preenchida pede confirmação via onRequestReduce; descanso é campo
 * único (D4). Unidade da carga (D10) via toggle kg/lb do SeriesCard
 * (fonte de verdade, default kg) — sem prompt separado. readOnly
 * (programa inativo) oculta handle, campos e ações; em execução (Mílon #5)
 * o chrome de manutenção (quantidade, descanso, editar/excluir, handle)
 * permanece visível e o pacote de execução governa somente o comportamento
 * dos cards de série (repassado sem interpretar).
 * isDragging: quando true, o card fica invisível (o ghost card é mostrado em seu lugar)
 * e os demais cards animam suavemente para preencher o espaço.
 */
export default function ExerciseEntryCard({
  entryView,
  readOnly,
  saving,
  isDragging = false,
  onQuantityCommit,
  onRequestReduce,
  onRestCommit,
  onSeriesCommit,
  onApplyAll,
  onEditExercise,
  onRemoveEntry,
  onChooseUnit,
  execution,
}: ExerciseEntryCardProps) {
  const { entry, exercise, series } = entryView;

  // Replano Mílon #5 (D14): chrome de manutenção sempre visível em execução —
  // a visibilidade depende somente de programa inativo; o pacote de execução
  // governa apenas o comportamento dos SeriesCards (repassado sem interpretar).
  const maintenanceVisible = !readOnly;

  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [restError, setRestError] = useState<string | null>(null);

  function commitQuantity(valorBruto: string): void {
    const total = series.length;
    const parsed = interpretarQuantidadeSeries(valorBruto);
    if (total === 0) {
      if (!parsed.valido || parsed.quantidade < 1) {
        setQuantityError(MSG_QUANTIDADE_SERIES_INVALIDA);
        return;
      }
      setQuantityError(null);
      onQuantityCommit(parsed.quantidade);
      return;
    }
    if (!parsed.valido) {
      setQuantityError(MSG_QUANTIDADE_SERIES_INVALIDA);
      return;
    }
    const quantidade = parsed.quantidade;
    if (quantidade === total) return;
    setQuantityError(null);
    if (quantidade > total) {
      onQuantityCommit(quantidade);
      return;
    }
    if (hasSeriePreenchida(series)) {
      onRequestReduce(quantidade);
      return;
    }
    onQuantityCommit(quantidade);
  }

  function commitRest(valorBruto: string): void {
    const resultado = validarInteiroCampo(valorBruto, "descanso");
    if (!resultado.ok) {
      setRestError(resultado.mensagem);
      return;
    }
    setRestError(null);
    onRestCommit(resultado.valor);
  }

  function handleSeriesCommit(
    seriesId: string,
    field: SerieField,
    value: number | null,
  ): void {
    // Carga commita direto; unidade via toggle kg/lb do SeriesCard (D10).
    onSeriesCommit(seriesId, field, value);
  }

  return (
    <li
      data-entry-id={entry.id}
      className={`rounded-lg border bg-card text-card-foreground shadow-sm px-3 py-2 flex flex-col gap-2 transition-all duration-300 ease-out ${
        isDragging ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ minHeight: isDragging ? "200px" : undefined }}
    >
      <div className="flex items-center gap-2">
        {maintenanceVisible ? (
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
        <h3 className="font-display text-sm leading-snug tracking-wider truncate flex-1">
          {exercise.name}
        </h3>
        {maintenanceVisible ? (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={onEditExercise}
            >
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={onRemoveEntry}
            >
              Excluir
            </Button>
          </div>
        ) : null}
      </div>

      {maintenanceVisible ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${entry.id}-qtd`} className="text-xs font-semibold">
            Séries
          </Label>
          <Input
            key={`${entry.id}-qtd-${series.length}`}
            id={`${entry.id}-qtd`}
            type="text"
            inputMode="numeric"
            defaultValue={String(series.length)}
            disabled={saving}
            onBlur={(event) => commitQuantity(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter")
                commitQuantity(event.currentTarget.value);
            }}
          />
          {quantityError ? (
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {quantityError}
            </p>
          ) : null}
        </div>
      ) : null}

      {maintenanceVisible ? (
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor={`${entry.id}-descanso`}
            className="text-xs font-semibold"
          >
            Descanso (s)
          </Label>
          <Input
            key={`${entry.id}-descanso-${entry.restSeconds}`}
            id={`${entry.id}-descanso`}
            type="text"
            inputMode="numeric"
            defaultValue={
              entry.restSeconds === null ? "" : String(entry.restSeconds)
            }
            disabled={saving}
            onBlur={(event) => commitRest(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRest(event.currentTarget.value);
            }}
          />
          {restError ? (
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {restError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {series.map((serie, idx) => (
          <SeriesCard
            key={serie.id}
            series={serie}
            index={idx}
            loadUnit={exercise.loadUnit}
            exerciseMode={exercise.mode ?? null}
            readOnly={readOnly}
            onCommit={(field, value) =>
              handleSeriesCommit(serie.id, field, value)
            }
            onApplyAll={() => onApplyAll(serie.id)}
            onChooseUnit={onChooseUnit}
            execution={execution}
          />
        ))}
      </div>
    </li>
  );
}
