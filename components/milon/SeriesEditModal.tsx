"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatarCargaComSecundaria,
  validarCarga,
  validarInteiroCampo,
} from "@/lib/milon/workout-utils";
import type { ExerciseMode, LoadUnit, WorkoutSeries } from "@/lib/milon/types";

export interface SeriesEditFields {
  value: number | null;
  load: number | null;
}

export interface SeriesEditModalProps {
  open: boolean;
  series: WorkoutSeries | null;
  loadUnit: LoadUnit | null;
  /** Modo do exercício (Mílon #5, D27): rótulo do campo único deriva daqui;
   *  nulo/ausente = fallback repetições. Sem edição no modal. */
  exerciseMode?: ExerciseMode | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (fields: SeriesEditFields) => Promise<void>;
}

function textoInicialValor(series: WorkoutSeries | null): string {
  // Fonte única é `value` (D34); o fallback para `reps`/`durationSeconds`
  // cobre só a fixture antiga do RED da TASK-013 (objeto sem `value`).
  const legado = series as unknown as {
    value?: number | null;
    reps?: number | null;
    durationSeconds?: number | null;
  } | null;
  const valor = legado?.value ?? legado?.reps ?? legado?.durationSeconds;
  if (valor === null || valor === undefined) return "";
  return String(valor);
}

/**
 * Modal de edição da série (Mílon #5, aditamento 2026-10-09 D27).
 * Presentacional por props: campo único com rótulo derivado do modo do
 * exercício (prop `exerciseMode`, sem alternância), carga com a unidade
 * herdada exibida ao lado do rótulo Carga como texto (sem edição, sem
 * botões kg/lb), sem qualquer opção de cópia — todo salvamento replica
 * sempre para a origem mais as seguintes (decisão da seção/hook). Nunca
 * fecha no erro: validação local mostra mensagem visível e falha de
 * persistência é exibida via `error` mantendo o digitado. O salvamento
 * entrega somente os campos.
 */
export default function SeriesEditModal({
  open,
  series,
  loadUnit,
  exerciseMode,
  saving,
  error,
  onClose,
  onSave,
}: SeriesEditModalProps) {
  // Modo pertence ao exercício (D27): sem estado local, sem alternância.
  // Nulo/ausente = fallback repetições (mesmo padrão da unidade nula → kg).
  const isRepsMode = exerciseMode !== "tempo";
  const [valorText, setValorText] = useState(() =>
    textoInicialValor(series),
  );
  const [cargaText, setCargaText] = useState(
    series?.load === null || series?.load === undefined
      ? ""
      : String(series.load),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reseta o form ao abrir, ao trocar a série em edição ou ao trocar o modo
  // ou a unidade vigentes (mesmo padrão dos demais modais do módulo:
  // rerenders do pai com a mesma série não apagam o digitado).
  const resetKey = open
    ? `open:${series?.id ?? "none"}:${exerciseMode ?? "none"}:${loadUnit ?? "none"}`
    : "closed";
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setValorText(textoInicialValor(series));
    setCargaText(
      series?.load === null || series?.load === undefined
        ? ""
        : String(series.load),
    );
    setValidationError(null);
  }

  if (!open || !series) return null;

  const effectiveUnit: LoadUnit = loadUnit ?? "kg";

  const cargaNumerica = (() => {
    const texto = cargaText.trim().replace(",", ".");
    if (texto === "") return null;
    const numero = Number(texto);
    if (!Number.isFinite(numero) || numero < 0) return null;
    return numero;
  })();
  const secundaria =
    cargaNumerica !== null
      ? formatarCargaComSecundaria(cargaNumerica, effectiveUnit)
      : null;
  const unidadeSecundaria: LoadUnit =
    effectiveUnit === "kg" ? "lb" : "kg";

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const rotulo = isRepsMode ? "repetições" : "tempo";
    const valorResultado = validarInteiroCampo(valorText, rotulo);
    if (!valorResultado.ok) {
      setValidationError(valorResultado.mensagem);
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
        value: valorResultado.valor,
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
            <div className="flex items-center gap-2">
              <Label
                htmlFor="series-edit-valor"
                className="text-xs font-semibold flex-1"
              >
                {isRepsMode ? "Repetições" : "Tempo (s)"}
              </Label>
            </div>
            <Input
              id="series-edit-valor"
              type="text"
              inputMode="numeric"
              value={valorText}
              onChange={(event) => setValorText(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="series-edit-carga"
              className="text-xs font-semibold"
            >
              Carga ({effectiveUnit})
            </Label>
            <Input
              id="series-edit-carga"
              type="text"
              inputMode="decimal"
              value={cargaText}
              onChange={(event) => setCargaText(event.target.value)}
              disabled={saving}
            />
            {secundaria?.secundaria ? (
              <span className="text-xs text-muted-foreground">
                {secundaria.secundaria} {unidadeSecundaria}
              </span>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                Unidade: {effectiveUnit}
              </span>
            </div>
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
