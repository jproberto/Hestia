"use client";

import { Button } from "@/components/ui/button";

export type WorkoutConfirmVariant = "remover-exercicio" | "reduzir-series";

export interface WorkoutConfirmModalProps {
  open: boolean;
  variant: WorkoutConfirmVariant;
  exerciseName: string;
  seriesCount: number;
  currentQuantity: number;
  newQuantity: number;
  processing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmações do detalhe do treino (Mílon #3, D6).
 * `remover-exercicio`: exercício com ≥1 série — lista o que será perdido.
 * `reduzir-series`: redução com série preenchida — informa de/para.
 * Cancelar não muda nada; processing desabilita os botões.
 */
export default function WorkoutConfirmModal({
  open,
  variant,
  exerciseName,
  seriesCount,
  currentQuantity,
  newQuantity,
  processing,
  onConfirm,
  onCancel,
}: WorkoutConfirmModalProps) {
  if (!open) return null;

  const isRemover = variant === "remover-exercicio";
  const titulo = isRemover ? "Remover exercício?" : "Reduzir séries?";
  const confirmLabel = isRemover ? "Remover" : "Reduzir";
  const serieWord = seriesCount === 1 ? "série" : "séries";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-display tracking-wider">{titulo}</h2>

        {isRemover ? (
          <p className="text-sm text-muted-foreground">
            Remover &ldquo;{exerciseName}&rdquo; e{" "}
            {seriesCount === 1
              ? "sua 1 série"
              : `suas ${seriesCount} séries`}{" "}
            ({seriesCount} {serieWord}) do treino? As repetições, o tempo, a
            carga e o descanso informados serão perdidos.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Reduzir de {currentQuantity} para {newQuantity} séries? As séries
            removidas têm dados preenchidos e serão perdidas.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={() => {
              if (!processing) onCancel();
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={processing}
            onClick={() => {
              if (!processing) onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
