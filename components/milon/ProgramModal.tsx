"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validarTitulo } from "@/lib/milon/program-utils";
import type { Program } from "@/lib/milon/types";

export interface ProgramModalProps {
  open: boolean;
  program: Program | null;
  suggestion: string;
  saving: boolean;
  errorMsg: string | null;
  successMsg: string | null;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
}

/**
 * Modal único de criar/editar programa (Mílon #2).
 * Presentacional via props com estado de form interno: na criação o título
 * vem pré-preenchido com `suggestion`; na edição vem de `program`.
 * Valida título não-vazio no submit via `validarTitulo`. Nunca fecha no
 * erro — a mensagem vem do pai via `errorMsg` e o digitado é preservado.
 */
export default function ProgramModal({
  open,
  program,
  suggestion,
  saving,
  errorMsg,
  successMsg,
  onClose,
  onSave,
}: ProgramModalProps) {
  const [title, setTitle] = useState(program?.title ?? suggestion);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reseta o form ao abrir ou ao trocar o programa em edição (chave estável
  // por id; na criação a sugestão compõe a chave para novo sorteio por
  // abertura). Rerenders do pai com o mesmo item (ex.: errorMsg, saving)
  // não apagam o digitado.
  const resetKey = open ? `open:${program?.id ?? `new:${suggestion}`}` : "closed";
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setTitle(program?.title ?? suggestion);
    setValidationError(null);
  }

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const message = validarTitulo(title);
    if (message !== null) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    try {
      await onSave(title);
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
          {program ? "Editar programa" : "Novo programa"}
        </h2>

        {successMsg ? (
          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {successMsg}
          </div>
        ) : null}

        {visibleError ? (
          <div className="p-3 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
            {visibleError}
          </div>
        ) : null}

        <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="program-title" className="text-xs font-semibold">
              Título
            </Label>
            <Input
              id="program-title"
              type="text"
              placeholder="Ex: Treino Monstro da Semana"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
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
