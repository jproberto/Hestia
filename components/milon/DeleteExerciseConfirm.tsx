"use client";

import { Button } from "@/components/ui/button";

export interface DeleteExerciseConfirmProps {
  open: boolean;
  exerciseName: string;
  muscle: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmação de exclusão de exercício (Mílon #1).
 * Presentacional via props: informa nome e músculo do alvo antes de apagar.
 * Exclusão simples, sem proteção de histórico (proteção pertence à feature #3).
 */
export default function DeleteExerciseConfirm({
  open,
  exerciseName,
  muscle,
  deleting,
  onConfirm,
  onCancel,
}: DeleteExerciseConfirmProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-display tracking-wider text-rose-700 dark:text-rose-300">
          Excluir exercício
        </h2>
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir o exercício{" "}
          <strong className="text-foreground">{exerciseName}</strong> do músculo{" "}
          <strong className="text-foreground">{muscle}</strong>?
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="bg-rose-500/90 hover:bg-rose-600 text-white font-medium shadow-sm border-none transition-colors"
          >
            {deleting ? "Excluindo..." : "Confirmar Exclusão"}
          </Button>
        </div>
      </div>
    </div>
  );
}
