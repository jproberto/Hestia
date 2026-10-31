"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normalizarNomeTreino,
  validarNomeTreino,
  validarNomeUnicoNoPrograma,
} from "@/lib/milon/workout-utils";

export interface WorkoutModalProps {
  open: boolean;
  mode: "criar" | "renomear";
  defaultName: string;
  otherNames: string[];
  saving: boolean;
  errorMsg: string | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

/**
 * Modal único de criar/renomear treino (Mílon #3).
 * Presentacional via props com estado de form interno: na criação o nome
 * vem pré-preenchido com a sugestão da página; na renomeação com o nome
 * atual. Valida no submit via workout-utils. Nunca fecha no erro — a
 * mensagem de gravação vem do pai via `errorMsg` e o digitado é preservado.
 */
export default function WorkoutModal({
  open,
  mode,
  defaultName,
  otherNames,
  saving,
  errorMsg,
  onClose,
  onSave,
}: WorkoutModalProps) {
  const [name, setName] = useState(defaultName);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reseta o form ao abrir ou ao trocar o treino/modo (chave estável por
  // modo + nome base). Rerenders do pai com o mesmo item (ex.: errorMsg,
  // saving) não apagam o digitado.
  const resetKey = open ? `open:${mode}:${defaultName}` : "closed";
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setName(defaultName);
    setValidationError(null);
  }

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const normalizado = normalizarNomeTreino(name);
    const obrigatorio = validarNomeTreino(normalizado);
    if (obrigatorio !== null) {
      setValidationError(obrigatorio);
      return;
    }
    const unico = validarNomeUnicoNoPrograma(normalizado, otherNames);
    if (unico !== null) {
      setValidationError(unico);
      return;
    }
    setValidationError(null);
    try {
      await onSave(normalizado);
    } catch {
      // Falha de persistência: o modal permanece aberto com o digitado
      // preservado; a mensagem vem do pai via `errorMsg`.
    }
  }

  if (!open) return null;

  const visibleError = validationError ?? errorMsg;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-display tracking-wider">
          {mode === "renomear" ? "Renomear treino" : "Novo treino"}
        </h2>

        {visibleError ? (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
            {visibleError}
          </div>
        ) : null}

        <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workout-name" className="text-xs font-semibold">
              Nome
            </Label>
            <Input
              id="workout-name"
              type="text"
              placeholder="Ex: Treino A"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
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
