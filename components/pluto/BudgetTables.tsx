"use client";

import { formatCurrency } from "@/lib/pluto/types";
import type { BudgetItem } from "@/lib/pluto/types";

export interface BudgetTablesProps {
  revenues: BudgetItem[];
  expenses: BudgetItem[];
  isEditable: boolean;
  editingCategoryId: string | null;
  tempAmount: string;
  savingCategoryId: string | null;
  onTempAmountChange: (amount: string) => void;
  onCellClick: (categoryId: string, currentAmount: number) => void;
  onSaveInline: (categoryId: string, categoryName: string, categoryType: "receita" | "despesa") => void;
  onCancelEdit: () => void;
}

function EditableAmountCell({
  item,
  isEditable,
  editingCategoryId,
  tempAmount,
  savingCategoryId,
  onTempAmountChange,
  onCellClick,
  onSaveInline,
  onCancelEdit,
}: {
  item: BudgetItem;
  isEditable: boolean;
  editingCategoryId: string | null;
  tempAmount: string;
  savingCategoryId: string | null;
  onTempAmountChange: (amount: string) => void;
  onCellClick: (categoryId: string, currentAmount: number) => void;
  onSaveInline: (categoryId: string, categoryName: string, categoryType: "receita" | "despesa") => void;
  onCancelEdit: () => void;
}) {
  if (editingCategoryId === item.category_id) {
    return (
      <input
        type="number"
        step="0.01"
        value={tempAmount}
        onChange={(e) => onTempAmountChange(e.target.value)}
        onBlur={() => onSaveInline(item.category_id, item.category_name, item.category_type)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancelEdit();
          }
        }}
        className="w-24 text-right inline-block h-8 p-1 ml-auto"
        autoFocus
        disabled={savingCategoryId === item.category_id}
      />
    );
  }
  return (
    <span
      onClick={() => onCellClick(item.category_id, item.amount)}
      className={`${
        isEditable
          ? "cursor-pointer border-b border-dashed border-muted-foreground/60 hover:text-foreground hover:border-foreground"
          : "cursor-default"
      } ${savingCategoryId === item.category_id ? "opacity-50" : ""}`}
    >
      {formatCurrency(item.amount)}
    </span>
  );
}

/**
 * Tabelas de receitas e despesas com edição inline de valores.
 * Extraído de BudgetPage sem mudança visual.
 */
export default function BudgetTables({
  revenues,
  expenses,
  isEditable,
  editingCategoryId,
  tempAmount,
  savingCategoryId,
  onTempAmountChange,
  onCellClick,
  onSaveInline,
  onCancelEdit,
}: BudgetTablesProps) {
  const renderTable = (rows: BudgetItem[], emptyLabel: string) => (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-3 text-left">Categoria</th>
            <th className="p-3 text-right">Valor Planejado</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="p-4 text-center text-muted-foreground">{emptyLabel}</td>
            </tr>
          ) : (
            rows.map((b) => (
              <tr key={b.category_id} className="border-b">
                <td className="p-3">{b.category_name}</td>
                <td className="p-3 text-right">
                  <EditableAmountCell
                    item={b}
                    isEditable={isEditable}
                    editingCategoryId={editingCategoryId}
                    tempAmount={tempAmount}
                    savingCategoryId={savingCategoryId}
                    onTempAmountChange={onTempAmountChange}
                    onCellClick={onCellClick}
                    onSaveInline={onSaveInline}
                    onCancelEdit={onCancelEdit}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-['CaesarDressing'] text-[#35472D] tracking-wider">Receitas</h3>
        {renderTable(revenues, "Nenhuma receita planejada.")}
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-['CaesarDressing'] text-[#35472D] tracking-wider">Despesas</h3>
        {renderTable(expenses, "Nenhuma despesa planejada.")}
      </div>
    </div>
  );
}
