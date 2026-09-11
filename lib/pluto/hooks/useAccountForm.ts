"use client";

import { useState } from "react";
import type { IDatabaseClient } from "@/lib/shared/database";
import { getOrCreateAccount } from "@/lib/pluto/db/accounts";
import { parseErrorMessage } from "@/lib/utils";

export interface UseAccountFormOptions {
  db: IDatabaseClient;
  userEmail: string;
  fetchData: () => Promise<void>;
  setErrorMsg: (msg: string | null) => void;
}

/**
 * Estado e handlers do modal dedicado "Nova Conta / Cartão".
 * Extraído de useTransactionModals sem mudança de comportamento.
 */
export function useAccountForm({ db, userEmail, fetchData, setErrorMsg }: UseAccountFormOptions) {
  const [isAccModalOpen, setIsAccModalOpen] = useState<boolean>(false);
  const [newAccName, setNewAccName] = useState<string>("");
  const [newAccType, setNewAccType] = useState<"conta" | "cartao">("conta");
  const [savingAcc, setSavingAcc] = useState<boolean>(false);

  const handleOpenAccModal = () => {
    setNewAccName("");
    setNewAccType("conta");
    setErrorMsg(null);
    setIsAccModalOpen(true);
  };

  const handleCloseAccModal = () => {
    setIsAccModalOpen(false);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      setErrorMsg("Digite o nome da conta ou cartão.");
      return;
    }

    setSavingAcc(true);
    setErrorMsg(null);

    try {
      await getOrCreateAccount(db, newAccName.trim(), userEmail, newAccType);
      setIsAccModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao salvar conta:", err);
      setErrorMsg(parseErrorMessage(err));
    } finally {
      setSavingAcc(false);
    }
  };

  return {
    isAccModalOpen,
    newAccName,
    setNewAccName,
    newAccType,
    setNewAccType,
    savingAcc,
    handleOpenAccModal,
    handleCloseAccModal,
    handleSaveAccount,
  };
}
