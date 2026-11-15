"use client";

import { useMemo } from "react";
import type {
  Account,
  AccountCardData,
  TransactionWithDetails,
} from "@/lib/pluto/types";

/**
 * Agrupa transações em dois maps — primeiro o das contas, depois o dos
 * cartões — com roteamento de cada lançamento por account_id (fallback
 * por nome só no map de contas, nunca em bloco de cartão), incluindo
 * contas presentes só nos lançamentos. Ordena as transações de cada
 * bloco por data crescente, com desempate por inclusão (created_at).
 */
export function useAccountAggregation(
  transactions: TransactionWithDetails[],
  accounts: Account[]
): AccountCardData[] {
  return useMemo(() => {
    const contasMap = new Map<string, AccountCardData>();
    const cartoesMap = new Map<string, AccountCardData>();
    const blockById = new Map<string, AccountCardData>();

    accounts.forEach((acc) => {
      const block: AccountCardData = { account: acc, txs: [] };
      const map = acc.type === "cartao" ? cartoesMap : contasMap;
      map.set(acc.name.toLowerCase(), block);
      blockById.set(acc.id, block);
    });

    transactions.forEach((tx) => {
      const match = blockById.get(tx.account_id);
      if (match) {
        match.txs.push(tx);
        return;
      }

      const accName = tx.account_name || "Sem Conta";
      const key = accName.toLowerCase();
      const existing = contasMap.get(key);
      if (existing) {
        existing.txs.push(tx);
      } else {
        contasMap.set(key, {
          account: { id: tx.account_id, name: accName, type: "conta", created_at: null, created_by: null },
          txs: [tx],
        });
      }
    });

    const accountCardsList = [...contasMap.values(), ...cartoesMap.values()];
    accountCardsList.forEach((card) => {
      card.txs.sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        return (a.created_at || "").localeCompare(b.created_at || "");
      });
    });

    return accountCardsList;
  }, [transactions, accounts]);
}
