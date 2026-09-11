"use client";

import { useMemo } from "react";
import type {
  Account,
  AccountCardData,
  TransactionWithDetails,
} from "@/lib/pluto/types";

/**
 * Agrupa transações por conta/cartão para o grid de extratos,
 * incluindo contas presentes só nos lançamentos. Ordena as
 * transações de cada cartão por data e id.
 */
export function useAccountAggregation(
  transactions: TransactionWithDetails[],
  accounts: Account[]
): AccountCardData[] {
  return useMemo(() => {
    const allAccountsMap = new Map<string, AccountCardData>();

    accounts.forEach((acc) => {
      allAccountsMap.set(acc.name.toLowerCase(), {
        account: acc,
        txs: [],
      });
    });

    transactions.forEach((tx) => {
      const accName = tx.account_name || "Sem Conta";
      const key = accName.toLowerCase();
      const existing = allAccountsMap.get(key);
      if (existing) {
        existing.txs.push(tx);
      } else {
        allAccountsMap.set(key, {
          account: { id: tx.account_id, name: accName, type: "conta", created_at: null, created_by: null },
          txs: [tx],
        });
      }
    });

    const accountCardsList = Array.from(allAccountsMap.values());
    accountCardsList.forEach((card) => {
      card.txs.sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        return (a.id || "").localeCompare(b.id || "");
      });
    });

    return accountCardsList;
  }, [transactions, accounts]);
}
