"use client";

import { ChecklistItem } from "@/lib/pluto/repositories/checklist";
import { ItemUrgency } from "@/lib/shared";
import { formatCurrency } from "@/lib/shared";

interface ChecklistItemRowProps {
  item: ChecklistItem;
  urgency: ItemUrgency;
  onToggle: (item: ChecklistItem) => void;
  onEdit: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem) => void;
  isMonthOpen: boolean;
  rowBg: string;
  renderUrgencyBadge: (item: ChecklistItem, urgency: ItemUrgency) => React.ReactElement;
}

export default function ChecklistItemRow({
  item,
  urgency,
  onToggle,
  onEdit,
  onDelete,
  isMonthOpen,
  rowBg,
  renderUrgencyBadge,
}: ChecklistItemRowProps) {
  return (
    <div key={item.id} className={`py-3 px-2 flex items-center justify-between gap-3 transition-colors ${rowBg}`}>
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={item.is_completed}
          disabled={!isMonthOpen}
          onChange={() => onToggle(item)}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium ${
                item.is_completed ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {item.description}
            </span>
            {renderUrgencyBadge(item, urgency)}
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <span>{item.category_name ?? "Sem categoria"}</span>
            <span>•</span>
            <span
              className={
                item.type === "receita"
                  ? "text-emerald-700 dark:text-emerald-400 font-medium"
                  : "text-muted-foreground"
              }
            >
              {item.type === "receita" ? "Receita" : "Despesa"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-sm font-semibold ${
            item.is_completed
              ? "line-through text-muted-foreground"
              : item.type === "receita"
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-foreground"
          }`}
        >
          {formatCurrency(item.amount ?? 0)}
        </span>

        {isMonthOpen && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(item)}
              title="Editar item"
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              title="Excluir item"
              className="p-1 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}