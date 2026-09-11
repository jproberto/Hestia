"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AccountModalProps {
  isOpen: boolean;
  newAccName: string;
  newAccType: "conta" | "cartao";
  savingAcc: boolean;
  onNameChange: (value: string) => void;
  onTypeChange: (value: "conta" | "cartao") => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

/**
 * Modal dedicado para nova conta/cartão.
 * Presentacional: todo o estado vive na página (Fase 2).
 */
export default function AccountModal({
  isOpen,
  newAccName,
  newAccType,
  savingAcc,
  onNameChange,
  onTypeChange,
  onClose,
  onSave,
}: AccountModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg flex flex-col gap-4">
        <h2 className="text-lg font-display tracking-wider">Nova Conta / Cartão</h2>

        <form onSubmit={onSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-name" className="text-xs font-semibold">
              Nome da Conta / Cartão
            </Label>
            <Input
              id="acc-name"
              type="text"
              placeholder="Ex: Itaú Corrente, Cartão Nubank"
              value={newAccName}
              onChange={(e) => onNameChange(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-type" className="text-xs font-semibold">
              Tipo
            </Label>
            <select
              id="acc-type"
              value={newAccType}
              onChange={(e) => onTypeChange(e.target.value as "conta" | "cartao")}
              className="rounded border p-2 bg-background text-foreground text-sm font-medium"
            >
              <option value="conta">Conta</option>
              <option value="cartao">Cartão</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={savingAcc}>
              {savingAcc ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
