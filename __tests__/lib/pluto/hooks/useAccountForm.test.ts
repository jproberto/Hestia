import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAccountForm } from "@/lib/pluto/hooks/useAccountForm";
import { getOrCreateAccount } from "@/lib/pluto/db/accounts";
import type { IDatabaseClient } from "@/lib/shared/database";

vi.mock("@/lib/pluto/db/accounts", () => ({
  getAccounts: vi.fn(),
  getOrCreateAccount: vi.fn(),
}));

const EMAIL = "teste@hestia.com";

function renderForm() {
  const fetchData = vi.fn(() => Promise.resolve());
  const setErrorMsg = vi.fn();
  const hook = renderHook(() =>
    useAccountForm({ db: {} as IDatabaseClient, userEmail: EMAIL, fetchData, setErrorMsg })
  );
  return { ...hook, fetchData, setErrorMsg };
}

describe("useAccountForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrCreateAccount).mockResolvedValue("a9");
  });

  it("abre o modal zerado", () => {
    const { result } = renderForm();

    act(() => {
      result.current.handleOpenAccModal();
    });

    expect(result.current.isAccModalOpen).toBe(true);
    expect(result.current.newAccName).toBe("");
    expect(result.current.newAccType).toBe("conta");
  });

  it("recusa salvar com nome vazio", async () => {
    const { result, setErrorMsg } = renderForm();

    act(() => {
      result.current.handleOpenAccModal();
    });

    await act(async () => {
      await result.current.handleSaveAccount({ preventDefault: () => {} } as never);
    });

    expect(setErrorMsg).toHaveBeenCalledWith("Digite o nome da conta ou cartão.");
    expect(getOrCreateAccount).not.toHaveBeenCalled();
  });

  it("salva conta, fecha e recarrega", async () => {
    const { result, fetchData } = renderForm();

    act(() => {
      result.current.handleOpenAccModal();
      result.current.setNewAccName("Reserva");
    });

    await act(async () => {
      await result.current.handleSaveAccount({ preventDefault: () => {} } as never);
    });

    expect(getOrCreateAccount).toHaveBeenCalledWith(expect.anything(), "Reserva", EMAIL, "conta");
    expect(result.current.isAccModalOpen).toBe(false);
    expect(fetchData).toHaveBeenCalled();
  });
});
