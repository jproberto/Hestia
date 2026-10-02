"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoadUnit, WorkoutSeries } from "@/lib/milon/types";
import {
  MSG_UNIDADE_OBRIGATORIA,
  formatarCargaComSecundaria,
  validarCarga,
  validarInteiroCampo,
} from "@/lib/milon/workout-utils";

export type SerieField = "reps" | "durationSeconds" | "load";

export interface SeriesCardProps {
  series: WorkoutSeries;
  index: number;
  loadUnit: LoadUnit | null;
  readOnly: boolean;
  pendingUnit: boolean;
  onCommit: (field: SerieField, value: number | null) => void;
  onApplyAll: () => void;
  onChooseUnit: (unit: LoadUnit) => void;
}

/**
 * Card de uma série planejada (Mílon #3).
 * Presentacional: campos não-controlados (key + defaultValue, commit lê o
 * valor atual no blur/Enter) com validações locais via workout-utils e
 * mensagem visível sem commitar quando inválido. Vazio ≠ 0 (D7): vazio exibe
 * placeholder "—", 0 é valor legítimo. Secundária convertida menor e em cinza
 * mais claro (D10).
 */
export default function SeriesCard({
  series,
  index,
  loadUnit,
  readOnly,
  pendingUnit,
  onCommit,
  onApplyAll,
  onChooseUnit,
}: SeriesCardProps) {
  const rotulo = `Série ${index + 1}`;
  const baseId = `serie-${series.id}`;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function commitReps(valorBruto: string): void {
    const resultado = validarInteiroCampo(valorBruto, "repetições");
    if (!resultado.ok) {
      setErrorMsg(resultado.mensagem);
      return;
    }
    setErrorMsg(null);
    onCommit("reps", resultado.valor);
  }

  function commitTempo(valorBruto: string): void {
    const resultado = validarInteiroCampo(valorBruto, "tempo");
    if (!resultado.ok) {
      setErrorMsg(resultado.mensagem);
      return;
    }
    setErrorMsg(null);
    onCommit("durationSeconds", resultado.valor);
  }

  function commitCarga(valorBruto: string): void {
    const resultado = validarCarga(valorBruto);
    if (!resultado.ok) {
      setErrorMsg(resultado.mensagem);
      return;
    }
    setErrorMsg(null);
    onCommit("load", resultado.valor);
  }

  if (readOnly) {
    return (
      <div className="rounded-md border px-3 py-2 flex flex-col gap-1">
        <span className="text-sm font-medium">{rotulo}</span>
        <span className="text-xs text-muted-foreground">
          {series.reps ?? "—"} reps · {series.durationSeconds ?? "—"} s ·{" "}
          {series.load ?? "—"}
          {loadUnit !== null && series.load !== null ? ` ${loadUnit}` : null}
        </span>
      </div>
    );
  }

  const secundaria =
    loadUnit !== null && series.load !== null
      ? formatarCargaComSecundaria(series.load, loadUnit)
      : null;
  const unidadeSecundaria: LoadUnit | null =
    loadUnit === "kg" ? "libra" : loadUnit === "libra" ? "kg" : null;
  const cargaInicial = series.load === null ? "" : String(series.load);

  return (
    <div className="rounded-md border px-3 py-2 flex flex-col gap-2">
      <span className="text-sm font-medium">{rotulo}</span>

      {errorMsg ? (
        <p className="text-xs text-rose-700 dark:text-rose-300">{errorMsg}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${baseId}-reps`} className="text-xs font-semibold">
          Repetições
        </Label>
        <Input
          key={`${baseId}-reps-${series.reps}`}
          id={`${baseId}-reps`}
          type="text"
          inputMode="numeric"
          defaultValue={series.reps === null ? "" : String(series.reps)}
          onBlur={(event) => commitReps(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter")
              commitReps(event.currentTarget.value);
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${baseId}-tempo`} className="text-xs font-semibold">
          Tempo (s)
        </Label>
        <Input
          key={`${baseId}-tempo-${series.durationSeconds}`}
          id={`${baseId}-tempo`}
          type="text"
          inputMode="numeric"
          defaultValue={
            series.durationSeconds === null
              ? ""
              : String(series.durationSeconds)
          }
          onBlur={(event) => commitTempo(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter")
              commitTempo(event.currentTarget.value);
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${baseId}-carga`} className="text-xs font-semibold">
          Carga
        </Label>
        <Input
          key={`${baseId}-carga-${series.load}`}
          id={`${baseId}-carga`}
          type="text"
          inputMode="decimal"
          defaultValue={cargaInicial}
          placeholder={cargaInicial === "" ? "—" : undefined}
          onBlur={(event) => commitCarga(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter")
              commitCarga(event.currentTarget.value);
          }}
        />
        {secundaria?.secundaria && unidadeSecundaria ? (
          <span className="text-xs text-muted-foreground">
            {secundaria.secundaria} {unidadeSecundaria}
          </span>
        ) : null}
      </div>

      {pendingUnit ? (
        <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs text-amber-900 dark:text-amber-100">
            {MSG_UNIDADE_OBRIGATORIA}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChooseUnit("kg")}
            >
              kg
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChooseUnit("libra")}
            >
              libra
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={onApplyAll}>
          Aplicar a todas
        </Button>
      </div>
    </div>
  );
}
