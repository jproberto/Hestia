"use client";

import type { Category } from "@/lib/pluto/types";

export interface BudgetForecastFormProps {
  categoryType: "receita" | "despesa";
  onTypeChange: (type: "receita" | "despesa") => void;
  categoryName: string;
  onNameChange: (name: string) => void;
  suggestions: Category[];
  onPickSuggestion: (name: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Form de nova previsão (tipo + categoria com sugestões + valor).
 * Extraído de BudgetPage sem mudança visual.
 */
export default function BudgetForecastForm({
  categoryType,
  onTypeChange,
  categoryName,
  onNameChange,
  suggestions,
  onPickSuggestion,
  amount,
  onAmountChange,
  onSubmit,
}: BudgetForecastFormProps) {
  return (
    <form className="flex flex-col gap-4 rounded-lg border p-4 bg-card relative" onSubmit={onSubmit}>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold">Tipo</label>
          <select
            value={categoryType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              onTypeChange(e.target.value as "receita" | "despesa");
              onNameChange("");
            }}
            className="rounded border p-2 bg-card text-card-foreground text-sm"
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs font-semibold">Categoria</label>
          <input
            type="text"
            value={categoryName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ex: Alimentação"
            required
            autoComplete="off"
            className="rounded border p-2 bg-background text-foreground text-sm"
          />
          {categoryName && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded border bg-popover shadow-md">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPickSuggestion(s.name)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold">Valor Previsto (Mensal)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="Ex: 800.00"
            required
            className="rounded border p-2 bg-background text-foreground text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button type="submit" className="rounded bg-[#35472D] px-4 py-2 text-white hover:bg-[#2a3a24] transition-colors">
          Salvar Previsão
        </button>
      </div>
    </form>
  );
}
