"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDateBR, MONTH_NAMES } from "@/lib/pluto/types";
import type {
  Account,
  AccountCardData,
  TransactionWithDetails,
} from "@/lib/pluto/types";

export interface AccountCardGridProps {
  cards: AccountCardData[];
  loading: boolean;
  selectedMonth: number;
  onOpenAccModal: () => void;
  onOpenTxModal: (account: Account) => void;
  onOpenEditModal: (tx: TransactionWithDetails) => void;
  onOpenDeleteModal: (tx: TransactionWithDetails) => void;
}

/**
 * Grid de contas e cartões com extratos e ações por lançamento.
 * Extraído da TransactionsPage sem mudança visual (Fase 2).
 */
export default function AccountCardGrid({
  cards,
  loading,
  selectedMonth,
  onOpenAccModal,
  onOpenTxModal,
  onOpenEditModal,
  onOpenDeleteModal,
}: AccountCardGridProps) {
  return (
    <div className="flex flex-col gap-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display text-[#35472D] tracking-wider">Contas e Cartões</h2>
        <Button onClick={onOpenAccModal} variant="outline" size="sm">
          + Nova Conta / Cartão
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm font-display text-[#35472D] tracking-wider">
          Carregando contas e lançamentos...
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm font-display text-[#35472D] tracking-wider shadow-sm flex flex-col items-center gap-2">
          <p>Nenhuma conta ou cartão cadastrado ainda.</p>
          <Button onClick={onOpenAccModal} size="sm" className="font-display tracking-wider">
            + Cadastrar Primeira Conta ou Cartão
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map(({ account, txs }) => {
            const accountTotal = txs.reduce((acc, t) => {
              if (t.type === "receita" || t.is_refund) return acc + Number(t.amount);
              return acc - Number(t.amount);
            }, 0);

            const isCard = account.type === "cartao";

            return (
              <div
                key={account.id || account.name}
                className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col"
              >
                {/* Cabeçalho da Conta (sem botão de transação) */}
                <div className="bg-muted/40 p-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{isCard ? "💳" : "🏦"}</span>
                    <h3 className="font-display text-[#35472D] text-sm tracking-wider">{account.name}</h3>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-display uppercase tracking-wider ${
                      isCard
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-[#35472D]/10 text-[#35472D]"
                    }`}
                    >
                      {isCard ? "Cartão" : "Conta"}
                    </span>
                  </div>
                  <div className="text-xs font-bold">
                    <span
                      className={
                        accountTotal >= 0
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-rose-700 dark:text-rose-300"
                      }
                    >
                      {formatCurrency(accountTotal)}
                    </span>
                  </div>
                </div>

                {/* Tabela de Transações */}
                <div className="overflow-x-auto flex-1">
                  {txs.length === 0 ? (
                    <div className="p-6 text-center text-xs font-display text-[#35472D] tracking-wider">
                      Nenhum lançamento nesta conta no mês de {MONTH_NAMES[selectedMonth - 1]}.
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/20 text-[#35472D] text-xs font-display tracking-wider">
                          <th className="p-2.5">Data</th>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Categoria</th>
                          <th className="p-2.5 text-right">Valor</th>
                          <th className="p-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txs.map((tx) => (
                          <tr key={tx.id} className="border-b hover:bg-muted/20 transition-colors">
                            <td className="p-2.5 font-medium text-xs whitespace-nowrap">
                              {formatDateBR(tx.date)}
                            </td>
                            <td className="p-2.5 text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium">{tx.description}</span>
                                {tx.is_refund && (
                                  <span className="rounded bg-sky-100 text-sky-800 text-[10px] font-semibold px-1.5 py-0.5 dark:bg-sky-950 dark:text-sky-300">
                                    Reembolso
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-xs text-muted-foreground">
                              {tx.category_name}
                            </td>
                            <td
                              className={`p-2.5 text-xs text-right font-semibold whitespace-nowrap ${
                                tx.type === "receita" || tx.is_refund
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              {tx.type === "receita" || tx.is_refund ? "+" : "-"} {formatCurrency(Number(tx.amount))}
                            </td>
                            <td className="p-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => onOpenEditModal(tx)}
                                  aria-label={`Editar lançamento ${tx.description}`}
                                  title="Editar lançamento"
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenDeleteModal(tx)}
                                  aria-label={`Excluir lançamento ${tx.description}`}
                                  title="Excluir lançamento"
                                  className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Rodapé do Extrato com o botão + Nova Transação */}
                <div className="p-2.5 bg-muted/20 border-t flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onOpenTxModal(account)}
                    className="h-8 text-xs font-display w-full sm:w-auto tracking-wider"
                  >
                    + Nova Transação
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
