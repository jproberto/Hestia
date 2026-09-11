"use client";

import { useState } from "react";
import { ChecklistItem } from "@/lib/pluto/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ChecklistItemDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteGlobal: boolean) => Promise<void>;
  item: ChecklistItem | null;
  saving: boolean;
  errorMsg: string | null;
}

export default function ChecklistItemDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  saving,
  errorMsg,
}: ChecklistItemDeleteModalProps) {
  const [formScope, setFormScope] = useState<"month" | "global">("month");

  if (!isOpen || !item) return null;

  const handleConfirmDelete = async () => {
    await onConfirm(formScope === "global");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground rounded-lg shadow-lg max-w-md w-full p-6 border">
        <h3 className="text-lg font-display tracking-wider mb-2">Excluir Item do Checklist</h3>
<p className="text-sm text-muted-foreground mb-4">
           {"Tem certeza que deseja excluir \"" + item.description + "\"?"}
         </p>

        {errorMsg && (
          <div className="p-3 mb-4 text-xs bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200 border border-rose-200 rounded-md">
            {errorMsg}
          </div>
        )}

        <div className="mb-6 space-y-2 border-t pt-3">
          <Label className="block mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Escopo da Exclusão
          </Label>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="radio"
              name="delete-scope"
              value="month"
              checked={formScope === "month"}
              onChange={() => setFormScope("month")}
            />
            Apenas neste mês
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="radio"
              name="delete-scope"
              value="global"
              checked={formScope === "global"}
              onChange={() => setFormScope("global")}
            />
            No modelo global (remover dos próximos meses)
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirmDelete} disabled={saving}>
            {saving ? "Excluindo..." : "Confirmar Exclusão"}
          </Button>
        </div>
      </div>
    </div>
  );
}