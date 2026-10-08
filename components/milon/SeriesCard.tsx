"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoadUnit, WorkoutSeries } from "@/lib/milon/types";
import {
  formatarCargaComSecundaria,
  validarCarga,
  validarInteiroCampo,
} from "@/lib/milon/workout-utils";

export type SerieField = "reps" | "durationSeconds" | "load";

/**
 * Pacote de execução série a série (Mílon #5): feito por id da série do
 * template + alternância por toque curto + abertura do editor por toque
 * longo. Repassado sem interpretação por ExerciseEntryCard/WorkoutEntriesList.
 */
export interface SeriesExecutionProps {
  doneBySeriesId: Record<string, boolean>;
  onToggle: (seriesId: string) => void;
  onOpenEditor: (seriesId: string) => void;
}

export interface SeriesCardProps {
  series: WorkoutSeries;
  index: number;
  loadUnit: LoadUnit | null;
  readOnly: boolean;
  onCommit: (field: SerieField, value: number | null) => void;
  onApplyAll: () => void;
  onChooseUnit: (unit: LoadUnit) => void;
  execution?: SeriesExecutionProps;
}

/**
 * Card de uma série planejada (Mílon #3, CA-26).
 * Layout compacto: campo único reps/tempo com toggle, toggle unidade kg/lb
 * abaixo da carga (pré-selecionado kg), card menor.
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
  onCommit,
  onApplyAll,
  onChooseUnit,
  execution,
}: SeriesCardProps) {
  const rotulo = `Série ${index + 1}`;
  const baseId = `serie-${series.id}`;
  const LONG_PRESS_MS = 500;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressToggle = useRef(false);

  function clearLongPress(): void {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  useEffect(() => clearLongPress, []);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRepsMode, setIsRepsMode] = useState(true);
  // Toggle kg/lb é a fonte de verdade da unidade (D10); quando o exercício
  // já tem unidade persistida, ela prevalece sobre a escolha local.
  const [selectedUnit, setSelectedUnit] = useState<LoadUnit>(loadUnit ?? "kg");
  const effectiveUnit: LoadUnit = loadUnit ?? selectedUnit;

  function commitRepsTempo(valorBruto: string): void {
    const rotulo = isRepsMode ? "repetições" : "tempo";
    const resultado = validarInteiroCampo(valorBruto, rotulo);
    if (!resultado.ok) {
      setErrorMsg(resultado.mensagem);
      return;
    }
    setErrorMsg(null);
    if (isRepsMode) {
      onCommit("reps", resultado.valor);
    } else {
      onCommit("durationSeconds", resultado.valor);
    }
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

  // Modo de execução (Mílon #5, opt-in): exibição bloqueada com marcador.
  // Toque curto alterna na hora; toque longo (500ms) abre o editor sem
  // alternar ao soltar (supressão); Enter/Espaço no marcador e botão
  // explícito garantem acessibilidade; programa inativo segue não
  // interativo (cai no readOnly abaixo).
  if (execution && !readOnly) {
    const feito = execution.doneBySeriesId[series.id] === true;
    const repsTempo =
      series.reps !== null && series.reps !== undefined
        ? `${series.reps} reps`
        : series.durationSeconds !== null && series.durationSeconds !== undefined
          ? `${series.durationSeconds} s`
          : "—";
    const cargaTexto =
      series.load !== null && series.load !== undefined
        ? `${series.load}${loadUnit ? ` ${loadUnit}` : ""}`
        : "—";

    function dispararAlternancia(): void {
      if (suppressToggle.current) {
        suppressToggle.current = false;
        return;
      }
      execution?.onToggle(series.id);
    }

    function iniciarLongPress(): void {
      suppressToggle.current = false;
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        suppressToggle.current = true;
        execution?.onOpenEditor(series.id);
      }, LONG_PRESS_MS);
    }

    return (
      <div
        className="rounded-md border px-3 py-2 flex flex-col gap-1"
        onPointerDown={iniciarLongPress}
        onPointerUp={clearLongPress}
        onPointerMove={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
      >
        <span className="text-sm font-medium">{rotulo}</span>
        <span className="text-xs text-muted-foreground">
          {repsTempo} · {cargaTexto}
        </span>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            aria-label={rotulo}
            checked={feito}
            onChange={() => {}}
            onClick={(event) => {
              event.stopPropagation();
              dispararAlternancia();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
                event.preventDefault();
                event.stopPropagation();
                suppressToggle.current = false;
                execution?.onToggle(series.id);
              }
            }}
            className="min-h-[44px] min-w-[44px] h-[44px] w-[44px] shrink-0 accent-[#B7602B]"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-[44px] min-w-[44px]"
            onClick={(event) => {
              event.stopPropagation();
              clearLongPress();
              execution?.onOpenEditor(series.id);
            }}
            aria-label={`Editar ${rotulo}`}
          >
            Editar
          </Button>
        </div>
      </div>
    );
  }

  if (readOnly) {
    const repsTempo = isRepsMode
      ? `${series.reps ?? "—"} reps`
      : `${series.durationSeconds ?? "—"} s`;
    return (
      <div className="rounded-md border px-3 py-2 flex flex-col gap-1">
        <span className="text-sm font-medium">{rotulo}</span>
        <span className="text-xs text-muted-foreground">
          {repsTempo} · {series.load ?? "—"}
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
  const repsInicial = series.reps === null ? "" : String(series.reps);
  const tempoInicial = series.durationSeconds === null ? "" : String(series.durationSeconds);

  return (
    <div className="rounded-md border px-3 py-2 flex flex-col gap-2">
      <span className="text-sm font-medium">{rotulo}</span>

      {errorMsg ? (
        <p className="text-xs text-rose-700 dark:text-rose-300">{errorMsg}</p>
      ) : null}

      {/* Campo único Reps/Tempo com toggle */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${baseId}-reps-tempo`} className="text-xs font-semibold flex-1">
            {isRepsMode ? "Repetições" : "Tempo (s)"}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setIsRepsMode((prev) => !prev)}
            aria-label={isRepsMode ? "Alternar para tempo" : "Alternar para repetições"}
          >
            {isRepsMode ? "⏱" : "🔁"}
          </Button>
        </div>
        <Input
          key={`${baseId}-reps-tempo-${isRepsMode ? repsInicial : tempoInicial}`}
          id={`${baseId}-reps-tempo`}
          type="text"
          inputMode="numeric"
          defaultValue={isRepsMode ? repsInicial : tempoInicial}
          onBlur={(event) => commitRepsTempo(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter")
              commitRepsTempo(event.currentTarget.value);
          }}
        />
      </div>

      {/* Carga com toggle de unidade kg/lb abaixo */}
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
        
        {/* Toggle de unidade kg/lb abaixo do campo carga */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-muted-foreground">Unidade:</span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={effectiveUnit === "kg" ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => {
                setSelectedUnit("kg");
                onChooseUnit("kg");
              }}
            >
              kg
            </Button>
            <Button
              type="button"
              size="sm"
              variant={effectiveUnit === "libra" ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => {
                setSelectedUnit("libra");
                onChooseUnit("libra");
              }}
            >
              lb
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={onApplyAll}>
          Aplicar a todas
        </Button>
      </div>
    </div>
  );
}
