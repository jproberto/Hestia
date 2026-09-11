"use client";

import Link from "next/link";
import { PlutoLayout } from "@/components/layout/PlutoLayout";
import ChecklistCard from "@/components/pluto/ChecklistCard";
import BudgetComparisonSection from "@/components/pluto/BudgetComparisonSection";
import AccountCardGrid from "@/components/pluto/AccountCardGrid";
import TransactionModal from "@/components/pluto/TransactionModal";
import AccountModal from "@/components/pluto/AccountModal";
import DeleteConfirmModal from "@/components/pluto/DeleteConfirmModal";
import YearMonthSelector from "@/components/pluto/YearMonthSelector";
import BudgetOverflowModal from "@/components/pluto/BudgetOverflowModal";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/pluto/types";
import { usePlutoData } from "@/lib/pluto/hooks/usePlutoData";
import { useBudgetComparison } from "@/lib/pluto/hooks/useBudgetComparison";
import { useAccountAggregation } from "@/lib/pluto/hooks/useAccountAggregation";
import { useChecklistOperations } from "@/lib/pluto/hooks/useChecklistOperations";
import { useTransactionModals } from "@/lib/pluto/hooks/useTransactionModals";

export default function TransactionsPage() {
  const {
    db, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, userEmail,
    availableYears, openMonths, transactions, budgetItems, accounts, categories,
    checklistItems, globalChecklistItems, setChecklistItems, loading, errorMsg,
    setErrorMsg, fetchData, minDateStr, maxDateStr,
  } = usePlutoData();

  const {
    receitaRows, despesaRows, totalReceitaPrevisto, totalReceitaReal,
    totalDespesaPrevisto, totalDespesaReal, saldoMes,
  } = useBudgetComparison(transactions, budgetItems);

  const accountCardsList = useAccountAggregation(transactions, accounts);

  const modals = useTransactionModals({
    db,
    userEmail,
    categories,
    minDateStr,
    fetchData,
    setErrorMsg,
  });

  const {
    isOverflowModalOpen, overflowData, handleToggleChecklistItem, handleAddChecklistItem,
    handleEditChecklistItem, handleDeleteChecklistItem, handleOverflowConfirm, handleOverflowCancel,
  } = useChecklistOperations({
    db,
    selectedYear,
    selectedMonth,
    openMonths,
    userEmail,
    categories,
    budgetItems,
    checklistItems,
    globalChecklistItems,
    setChecklistItems,
    setErrorMsg,
    fetchData,
  });

  const content = (
    <>
      <YearMonthSelector
        availableYears={availableYears}
        openMonths={openMonths}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
      />

      <ChecklistCard
        items={checklistItems}
        categories={categories}
        budgetItems={budgetItems}
        isMonthOpen={openMonths.some((p) => p.month === selectedMonth && p.status === "aberto")}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        userEmail={userEmail}
        onToggleItem={handleToggleChecklistItem}
        onAddItem={handleAddChecklistItem}
        onEditItem={handleEditChecklistItem}
        onDeleteItem={handleDeleteChecklistItem}
        onTriggerTransactionModal={modals.handleTriggerTransactionModalFromChecklist}
      />

      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200">
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {availableYears.length > 0 && (
        <div
          className={`mt-4 flex items-center justify-between p-3 rounded-lg border ${
            saldoMes >= 0 ? "border-success-border bg-success-soft" : "border-danger-border bg-danger-soft"
          }`}
        >
          <span className="text-sm font-bold text-muted-foreground">💰 Saldo do Mês</span>
          <span className={`text-lg font-bold ${saldoMes >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(saldoMes)}
          </span>
        </div>
      )}

      {!loading && availableYears.length === 0 && (
        <div className="rounded-lg border p-8 text-center bg-card text-card-foreground flex flex-col items-center gap-3">
          <p className="text-muted-foreground">
            Nenhum mês está <strong className="text-emerald-600 dark:text-emerald-400">Aberto</strong> para lançamentos.
          </p>
          <Link href="/pluto/months">
            <Button variant="outline">Ir para Gestão de Meses e Períodos 📅</Button>
          </Link>
        </div>
      )}

      {availableYears.length > 0 && openMonths.length > 0 && (
        <>
          <BudgetComparisonSection
            receitaRows={receitaRows}
            despesaRows={despesaRows}
            totalReceitaPrevisto={totalReceitaPrevisto}
            totalReceitaReal={totalReceitaReal}
            totalDespesaPrevisto={totalDespesaPrevisto}
            totalDespesaReal={totalDespesaReal}
          />

          <AccountCardGrid
            cards={accountCardsList}
            loading={loading}
            selectedMonth={selectedMonth}
            onOpenAccModal={modals.handleOpenAccModal}
            onOpenTxModal={modals.handleOpenTxModal}
            onOpenEditModal={modals.handleOpenEditModal}
            onOpenDeleteModal={modals.handleOpenDeleteModal}
          />
        </>
      )}

      <AccountModal
        isOpen={modals.isAccModalOpen}
        newAccName={modals.newAccName}
        newAccType={modals.newAccType}
        savingAcc={modals.savingAcc}
        onNameChange={modals.setNewAccName}
        onTypeChange={modals.setNewAccType}
        onClose={modals.handleCloseAccModal}
        onSave={modals.handleSaveAccount}
      />

      <TransactionModal
        isOpen={modals.isTxModalOpen}
        editingTransaction={modals.editingTransaction}
        accountInput={modals.accountInput}
        description={modals.description}
        amount={modals.amount}
        type={modals.type}
        isRefund={modals.isRefund}
        date={modals.date}
        categoryInput={modals.categoryInput}
        savingTx={modals.savingTx}
        txSuccessMsg={modals.txSuccessMsg}
        accounts={accounts}
        categories={categories}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        minDateStr={minDateStr}
        maxDateStr={maxDateStr}
        descInputRef={modals.descInputRef}
        onClose={modals.handleCloseTxModal}
        onSave={modals.handleSaveTransaction}
        onSaveAndAddAnother={modals.handleSaveTransactionAndAddAnother}
        onDescriptionChange={modals.setDescription}
        onAmountChange={modals.setAmount}
        onTypeChange={modals.setType}
        onIsRefundChange={modals.setIsRefund}
        onDateChange={modals.setDate}
        onAccountInputChange={modals.setAccountInput}
        onCategoryInputChange={modals.setCategoryInput}
      />

      <DeleteConfirmModal
        isOpen={modals.isDeleteModalOpen}
        transaction={modals.deletingTransaction}
        deleting={modals.deletingTx}
        onClose={modals.handleCloseDeleteModal}
        onConfirm={modals.handleConfirmDelete}
      />

      {isOverflowModalOpen && overflowData && (
        <BudgetOverflowModal
          isOpen={isOverflowModalOpen}
          overflowData={overflowData}
          month={selectedMonth}
          userEmail={userEmail}
          onConfirm={handleOverflowConfirm}
          onCancel={handleOverflowCancel}
        />
      )}
    </>
  );

  return (
    <PlutoLayout pageTitle="Lançamentos" pageSubtitle="Registre e gerencie suas transações financeiras.">
      {content}
    </PlutoLayout>
  );
}
