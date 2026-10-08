"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validarCarga,
  validarInteiroCampo,
} from "@/lib/milon/workout-utils";
import type { LoadUnit, WorkoutSeries } from "@/lib/milon/types";

export interface SeriesEditFields {
  reps: number | null;
  durationSeconds: number | null;
  load: number | null;
}

export interface SeriesEditModalProps {
  open: boolean;
  series: WorkoutSeries | null;
  loadUnit: LoadUnit | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (fields: SeriesEditFields) => Promise<void>;
}

/**
 * Modal de edição da série (Mílon #5).
 * Presentacional por props: edita somente o planejado (repetições, tempo,
 * carga), sem qualquer opção de cópia — todo salvamento replica sempre para
 * a origem mais as seguintes (decisão da seção/hook, D4). Nunca fecha no
 * erro: validação local mostra mensagem visível e falha de persistência é
 * exibida via `error` mantendo o digitado.
 */
export default function SeriesEditModal({
  open,
  series,
  loadUnit,
  saving,
  error,
  onClose,
  onSave,
}: SeriesEditModalProps) {
  const cargaRotulo = loadUnit
    ? `Carga (${loadUnit === "libra" ? "lb" : loadUnit})`
    : "Carga";
  const [repsText, setRepsText] = useState(
    series?.reps === null || series?.reps === undefined
      ? ""
      : String(series.reps),
  );
  const [tempoText, setTempoText] = useState(
    series?.durationSeconds === null || series?.durationSeconds === undefined
      ? ""
      : String(series.durationSeconds),
  );
  const [cargaText, setCargaText] = useState(
    series?.load === null || series?.load === undefined
      ? ""
      : String(series.load),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reseta o form ao abrir ou ao trocar a série em edição (mesmo padrão dos
  // demais modais do módulo: rerenders do pai com a mesma série não apagam
  // o digitado).
  const resetKey = open ? `open:${series?.id ?? "none"}` : "closed";
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setRepsText(
      series?.reps === null || series?.reps === undefined
        ? ""
        : String(series.reps),
    );
    setTempoText(
      series?.durationSeconds === null || series?.durationSeconds === undefined
        ? ""
        : String(series.durationSeconds),
    );
    setCargaText(
      series?.load === null || series?.load === undefined
        ? ""
        : String(series.load),
    );
    setValidationError(null);
  }

  if (!open || !series) return null;

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const repsResultado = validarInteiroCampo(repsText, "repetições");
    if (!repsResultado.ok) {
      setValidationError(repsResultado.mensagem);
      return;
    }
    const tempoResultado = validarInteiroCampo(tempoText, "tempo");
    if (!tempoResultado.ok) {
      setValidationError(tempoResultado.mensagem);
      return;
    }
    const cargaResultado = validarCarga(cargaText);
    if (!cargaResultado.ok) {
      setValidationError(cargaResultado.mensagem);
      return;
    }
    setValidationError(null);
    try {
      await onSave({
        reps: repsResultado.valor,
        durationSeconds: tempoResultado.valor,
        load: cargaResultado.valor,
      });
      // O fechamento é decisão do pai (seção) após persistir; aqui o modal
      // só permanece aberto em qualquer falha.
    } catch {
      // Falha de persistência: permanece aberto com o digitado preservado;
      // a mensagem chega via prop `error` (o pai registra e relança).
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-display tracking-wider">Editar série</h2>

        {validationError || error ? (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
            {validationError ?? error}
          </div>
        ) : null}

        <form
          onSubmit={(event) => void handleSave(event)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="series-edit-reps" className="text-xs font-semibold">
              Repetições
            </Label>
            <Input
              id="series-edit-reps"
              type="text"
              inputMode="numeric"
              value={repsText}
              onChange={(event) => setRepsText(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="series-edit-tempo" className="text-xs font-semibold">
              Tempo (s)
            </Label>
            <Input
              id="series-edit-tempo"
              type="text"
              inputMode="numeric"
              value={tempoText}
              onChange={(event) => setTempoText(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="series-edit-carga" className="text-xs font-semibold">
              {cargaRotulo}
            </Label>
            <Input
              id="series-edit-carga"
              type="text"
              inputMode="decimal"
              value={cargaText}
              onChange={(event) => setCargaText(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} aria-label="Salvar">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
