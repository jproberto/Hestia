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
  onChooseUnit?: (unit: LoadUnit) => void;
  onSave: (fields: SeriesEditFields) => Promise<void>;
}

function textoInicialValor(series: WorkoutSeries | null, repsMode: boolean): string {
  const valor = repsMode ? series?.reps : series?.durationSeconds;
  if (valor === null || valor === undefined) return "";
  return String(valor);
}

function derivaModoInicial(series: WorkoutSeries | null): boolean {
  if (series?.reps !== null && series?.reps !== undefined) return true;
  if (series?.durationSeconds !== null && series?.durationSeconds !== undefined)
    return false;
  return true;
}

/**
 * Modal de edição da série (Mílon #5, replano paridade).
 * Presentacional por props: campo único repetição/tempo com o mesmo botão
 * de alternância da manutenção, carga com conversão secundária e botões
 * kg/lb ligados ao callback de escolha de unidade, sem qualquer opção de
 * cópia — todo salvamento replica sempre para a origem mais as seguintes
 * (decisão da seção/hook). Nunca fecha no erro: validação local mostra
 * mensagem visível e falha de persistência é exibida via `error` mantendo
 * o digitado. A unidade escolhida é comunicada na hora via `onChooseUnit`
 * e o salvamento entrega somente os campos.
 */
export default function SeriesEditModal({
  open,
  series,
  loadUnit,
  saving,
  error,
  onClose,
  onChooseUnit,
  onSave,
}: SeriesEditModalProps) {
  const [isRepsMode, setIsRepsMode] = useState(() => derivaModoInicial(series));
  const [valorText, setValorText] = useState(() =>
    textoInicialValor(series, derivaModoInicial(series)),
  );
  const [cargaText, setCargaText] = useState(
    series?.load === null || series?.load === undefined
      ? ""
      : String(series.load),
  );
  const [selectedUnit, setSelectedUnit] = useState<LoadUnit>(
    loadUnit ?? "kg",
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reseta o form ao abrir, ao trocar a série em edição ou ao trocar a
  // unidade vigente (mesmo padrão dos demais modais do módulo: rerenders
  // do pai com a mesma série não apagam o digitado).
  const resetKey = open
    ? `open:${series?.id ?? "none"}:${loadUnit ?? "none"}`
    : "closed";
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    const modo = derivaModoInicial(series);
    setIsRepsMode(modo);
    setValorText(textoInicialValor(series, modo));
    setCargaText(
      series?.load === null || series?.load === undefined
        ? ""
        : String(series.load),
    );
    setSelectedUnit(loadUnit ?? "kg");
    setValidationError(null);
  }

  if (!open || !series) return null;

  const effectiveUnit: LoadUnit = selectedUnit;

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
    effectiveUnit === "kg" ? "libra" : "kg";

  function alternarModo(): void {
    setIsRepsMode((prev) => {
      const proximo = !prev;
      setValorText(
        proximo
          ? (series?.reps === null || series?.reps === undefined
              ? ""
              : String(series.reps))
          : (series?.durationSeconds === null ||
                series?.durationSeconds === undefined
              ? ""
              : String(series.durationSeconds)),
      );
      return proximo;
    });
  }

  function escolherUnidade(unit: LoadUnit): void {
    setSelectedUnit(unit);
    onChooseUnit?.(unit);
  }

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
        reps: isRepsMode ? valorResultado.valor : null,
        durationSeconds: isRepsMode ? null : valorResultado.valor,
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
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={alternarModo}
                aria-label={
                  isRepsMode
                    ? "Alternar para tempo"
                    : "Alternar para repetições"
                }
              >
                {isRepsMode ? "⏱" : "🔁"}
              </Button>
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
              Carga
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
              <span className="text-xs text-muted-foreground">Unidade:</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={effectiveUnit === "kg" ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => escolherUnidade("kg")}
                  disabled={saving}
                >
                  kg
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={effectiveUnit === "libra" ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => escolherUnidade("libra")}
                  disabled={saving}
                >
                  lb
                </Button>
              </div>
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
