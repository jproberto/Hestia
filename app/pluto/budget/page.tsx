"use client";

import { Suspense } from "react";
import { PlutoLayout } from "@/components/layout/PlutoLayout";
import BudgetSelectors from "@/components/pluto/BudgetSelectors";
import BudgetEmptyState from "@/components/pluto/BudgetEmptyState";
import BudgetSummaryCards from "@/components/pluto/BudgetSummaryCards";
import BudgetForecastForm from "@/components/pluto/BudgetForecastForm";
import BudgetTables from "@/components/pluto/BudgetTables";
import { useBudgetOverview } from "@/lib/pluto/hooks/useBudgetOverview";
import { useBudgetItemEditor } from "@/lib/pluto/hooks/useBudgetItemEditor";

export const dynamic = "force-dynamic";

function BudgetPageContent() {
  const overview = useBudgetOverview();
  const editor = useBudgetItemEditor({
    db: overview.db,
    year: overview.year,
    revision: overview.revision,
    activeAdjustment: overview.activeAdjustment,
    userEmail: overview.userEmail,
    categories: overview.categories,
    isEditable: overview.isEditable,
    onSaved: () => overview.loadData(true),
  });

  return (
    <PlutoLayout pageTitle="Orçamento Anual" pageSubtitle="Gerencie receitas, despesas e saldos planejados.">
      <div>
        <BudgetSelectors
          adjustments={overview.adjustments}
          selectedAdjustmentId={overview.selectedAdjustmentId}
          onSelectAdjustment={overview.setSelectedAdjustmentId}
          year={overview.year}
          onSelectYear={overview.handleSelectYear}
        />

        {!overview.revision && (
          <BudgetEmptyState year={overview.year} onStart={() => void overview.handleStartBudget()} />
        )}

        {overview.revision && (
          <div className="flex flex-col gap-8">
            <BudgetSummaryCards
              totalRevenues={overview.totalRevenues}
              totalExpenses={overview.totalExpenses}
              netBudget={overview.netBudget}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display text-[#35472D] tracking-wider">Previsões Cadastradas</h2>
                {!overview.isMostRecent && (
                  <span className="rounded bg-[#35472D]/10 px-2 py-0.5 text-xs font-display text-[#35472D] tracking-wider">
                    Histórico (Substituído)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!overview.hasCurrentMonthAdjustment && !overview.isEditable && overview.isMostRecent && (
                  <button className="rounded bg-[#35472D] px-4 py-2 text-white hover:bg-[#2a3a24] transition-colors" onClick={() => void overview.handleCreateAdjustment()}>
                    Criar Novo Ajuste
                  </button>
                )}
                {overview.isEditable && (
                  <button className="rounded border border-[#35472D] px-4 py-2 text-[#35472D] hover:bg-[#35472D]/10 transition-colors" onClick={() => editor.setShowForm(!editor.showForm)}>
                    {editor.showForm ? "Fechar" : "Adicionar Previsão"}
                  </button>
                )}
              </div>
            </div>

            {editor.showForm && overview.isEditable && (
              <BudgetForecastForm
                categoryType={editor.categoryType}
                onTypeChange={editor.setCategoryType}
                categoryName={editor.categoryName}
                onNameChange={editor.setCategoryName}
                suggestions={editor.suggestions}
                onPickSuggestion={editor.setCategoryName}
                amount={editor.amount}
                onAmountChange={editor.setAmount}
                onSubmit={(e) => void editor.handleSaveItem(e)}
              />
            )}

            <BudgetTables
              revenues={overview.revenues}
              expenses={overview.expenses}
              isEditable={overview.isEditable}
              editingCategoryId={editor.editingCategoryId}
              tempAmount={editor.tempAmount}
              savingCategoryId={editor.savingCategoryId}
              onTempAmountChange={editor.setTempAmount}
              onCellClick={editor.handleCellClick}
              onSaveInline={(categoryId, categoryName, categoryType) => void editor.handleSaveInline(categoryId, categoryName, categoryType)}
              onCancelEdit={() => editor.setEditingCategoryId(null)}
            />
          </div>
        )}
      </div>
    </PlutoLayout>
  );
}

export default function BudgetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-6">
          <p className="text-muted-foreground">Carregando orçamento...</p>
        </div>
      }
    >
      <BudgetPageContent />
    </Suspense>
  );
}
