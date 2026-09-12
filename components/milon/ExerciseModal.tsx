"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Exercise } from "@/lib/milon/types";

export interface ExerciseModalFields {
  name: string;
  muscle: string;
  videoLink: string | null;
}

export type ExerciseModalAction = "salvar" | "salvar-e-outro";

export interface ExerciseModalProps {
  open: boolean;
  editingExercise: Exercise | null;
  muscleOptions: string[];
  saving: boolean;
  error: string | null;
  successNotice: string | null;
  onClose: () => void;
  onSave: (fields: ExerciseModalFields, action: ExerciseModalAction) => Promise<void>;
}

/**
 * Modal único de criar/editar exercício (Mílon #1).
 * Presentacional via props com estado de form interno: valida nome/músculo
 * obrigatórios e link opcional no próprio form. Nunca fecha no erro —
 * onSave (hook) relança após registrar o erro e o modal preserva o digitado.
 */
export default function ExerciseModal({
  open,
  editingExercise,
  muscleOptions,
  saving,
  error,
  successNotice,
  onClose,
  onSave,
}: ExerciseModalProps) {
  const [muscle, setMuscle] = useState(editingExercise?.muscle ?? "");
  const [name, setName] = useState(editingExercise?.name ?? "");
  const [videoLink, setVideoLink] = useState(editingExercise?.videoLink ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const muscleInputRef = useRef<HTMLInputElement | null>(null);

  // Reseta o form ao abrir ou ao trocar o exercício em edição (chave estável
  // por id: rerenders do pai com o mesmo item não apagam o digitado).
  const resetKey = open ? `open:${editingExercise?.id ?? "new"}` : "closed";
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setMuscle(editingExercise?.muscle ?? "");
    setName(editingExercise?.name ?? "");
    setVideoLink(editingExercise?.videoLink ?? "");
    setValidationError(null);
  }

  async function handleSave(
    event: React.FormEvent,
    action: ExerciseModalAction,
  ): Promise<void> {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedMuscle = muscle.trim();
    const trimmedLink = videoLink.trim();
    if (!trimmedName) {
      setValidationError("Informe o nome do exercício.");
      return;
    }
    if (!trimmedMuscle) {
      setValidationError("Informe o músculo do exercício.");
      return;
    }
    setValidationError(null);
    try {
      await onSave(
        { name: trimmedName, muscle: trimmedMuscle, videoLink: trimmedLink || null },
        action,
      );
      if (action === "salvar") {
        onClose();
      } else {
        setName("");
        setVideoLink("");
        muscleInputRef.current?.focus();
      }
    } catch {
      // Falha de persistência: o modal permanece aberto com o digitado
      // preservado; a mensagem vem do pai via `error` (onSave relança
      // após registrá-la, padrão homologado).
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-display tracking-wider">
          {editingExercise ? "Editar exercício" : "Novo exercício"}
        </h2>

        {successNotice ? (
          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {successNotice}
          </div>
        ) : null}

        {validationError || error ? (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
            {validationError ?? error}
          </div>
        ) : null}

        <form onSubmit={(event) => void handleSave(event, "salvar")} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-muscle" className="text-xs font-semibold">
              Músculo
            </Label>
            <Input
              id="exercise-muscle"
              ref={muscleInputRef}
              type="text"
              list="exercise-muscle-options"
              placeholder="Digite ou escolha um músculo"
              value={muscle}
              onChange={(event) => setMuscle(event.target.value)}
            />
            <datalist id="exercise-muscle-options">
              {muscleOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-name" className="text-xs font-semibold">
              Nome
            </Label>
            <Input
              id="exercise-name"
              type="text"
              placeholder="Ex: Supino reto"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-video-link" className="text-xs font-semibold">
              Link de vídeo (opcional)
            </Label>
            <Input
              id="exercise-video-link"
              type="text"
              placeholder="https://..."
              value={videoLink}
              onChange={(event) => setVideoLink(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={(event) => void handleSave(event, "salvar-e-outro")}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar e incluir outro"}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
