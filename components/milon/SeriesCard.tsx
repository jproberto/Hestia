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
  // Modo reps/tempo: deriva do dado vigente para a face exibir o rótulo
  // correto sem clique prévio (paridade execução ↔ manutenção); o toggle
  // local alterna em seguida nos dois ramos.
  const [isRepsMode, setIsRepsMode] = useState(
    () =>
      series.reps !== null && series.reps !== undefined
        ? true
        : series.durationSeconds !== null && series.durationSeconds !== undefined
          ? false
          : true,
  );
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

  // Modo de execução (Mílon #5, opt-in): o próprio card é o marcador, com
  // leitura somente dos valores vigentes (rótulos + valores + unidade como
  // texto). Toggles de repetição/tempo e kg/lb vivem SOMENTE no modal
  // (SeriesEditModal) — correção 2026-10-08. Toque curto alterna na hora;
  // toque longo (500ms) abre o editor sem alternar ao soltar (supressão do
  // click seguinte); Enter/Espaço no card focado equivalem ao toque curto;
  // programa inativo segue não interativo (cai no readOnly abaixo). Sem
  // checkbox, sem botão de marcar e sem "Aplicar a todas" (D17). Sem inputs.
  if (execution && !readOnly) {
    const feito = execution.doneBySeriesId[series.id] === true;
    const secundariaExec =
      loadUnit !== null && series.load !== null
        ? formatarCargaComSecundaria(series.load, loadUnit)
        : null;
    const unidadeSecundariaExec: LoadUnit | null =
      loadUnit === "kg" ? "libra" : loadUnit === "libra" ? "kg" : null;
    // Modo vigente deriva do dado (sem toggle no card): reps presente → reps.
    const execIsRepsMode =
      series.reps !== null && series.reps !== undefined
        ? true
        : series.durationSeconds !== null && series.durationSeconds !== undefined
          ? false
          : true;
    const valorRepsTempo =
      execIsRepsMode
        ? (series.reps ?? "—")
        : (series.durationSeconds ?? "—");

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
        role="button"
        tabIndex={0}
        aria-label={rotulo}
        aria-pressed={feito}
        className={
          feito
            ? "rounded-md border px-3 py-2 flex flex-col gap-2 min-h-[44px] w-full text-left bg-[#B7602B] text-white"
            : "rounded-md border px-3 py-2 flex flex-col gap-2 min-h-[44px] w-full text-left"
        }
        style={feito ? { backgroundColor: "#B7602B" } : undefined}
        onClick={dispararAlternancia}
        onPointerDown={iniciarLongPress}
        onPointerUp={clearLongPress}
        onPointerMove={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            suppressToggle.current = false;
            execution?.onToggle(series.id);
          }
        }}
      >
        <span className="text-sm font-medium">{rotulo}</span>

        {/* Somente leitura vigente: rótulo + valor + unidade como texto */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">
            {execIsRepsMode ? "Repetições" : "Tempo (s)"}
          </span>
          <span className="text-sm">{valorRepsTempo}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Carga</span>
          <span className="text-sm">
            <span>{series.load ?? "—"}</span>
            {loadUnit !== null && series.load !== null ? (
              <span> {loadUnit}</span>
            ) : null}
          </span>
          {secundariaExec?.secundaria && unidadeSecundariaExec ? (
            <span
              className={
                feito
                  ? "text-xs text-stone-200"
                  : "text-xs text-muted-foreground"
              }
            >
              {secundariaExec.secundaria} {unidadeSecundariaExec}
            </span>
          ) : null}
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
