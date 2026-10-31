"use client";

import { Button } from "@/components/ui/button";

export type ProgramConfirmAction = "ativar" | "reativar" | "excluir";

export interface ProgramConfirmModalProps {
  open: boolean;
  action: ProgramConfirmAction;
  title: string;
  owner: string;
  processing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ROTULOS: Record<ProgramConfirmAction, string> = {
  ativar: "Ativar",
  reativar: "Reativar",
  excluir: "Excluir",
};

const TEXTOS_PROCESSING: Record<ProgramConfirmAction, string> = {
  ativar: "Ativando…",
  reativar: "Reativando…",
  excluir: "Excluindo…",
};

const TITULOS: Record<ProgramConfirmAction, string> = {
  ativar: "Ativar programa",
  reativar: "Reativar programa",
  excluir: "Excluir programa",
};

const VERBOS: Record<ProgramConfirmAction, string> = {
  ativar: "ativar",
  reativar: "reativar",
  excluir: "excluir",
};

/**
 * Confirmação unificada de programa (Mílon #2).
 * Presentacional via props: informa título e dono do alvo antes de confirmar.
 * Espelha o padrão visual de `components/pluto/DeleteConfirmModal.tsx` e
 * `components/milon/DeleteExerciseConfirm.tsx`.
 */
export default function ProgramConfirmModal({
  open,
  action,
  title,
  owner,
  processing,
  onConfirm,
  onCancel,
}: ProgramConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-display tracking-wider text-rose-700 dark:text-rose-300">
          {TITULOS[action]}
        </h2>
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja {VERBOS[action]} o programa{" "}
          <strong className="text-foreground">{title}</strong> de{" "}
          <strong className="text-foreground">{owner}</strong>?
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={processing}
            onClick={() => {
              if (!processing) onConfirm();
            }}
            className="bg-rose-500/90 hover:bg-rose-600 text-white font-medium shadow-sm border-none transition-colors"
          >
            {processing ? TEXTOS_PROCESSING[action] : ROTULOS[action]}
          </Button>
        </div>
      </div>
    </div>
  );
}
