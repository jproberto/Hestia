import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AccountModal from "@/components/pluto/AccountModal";

describe("AccountModal", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(
      <AccountModal
        isOpen={false}
        newAccName=""
        newAccType="conta"
        savingAcc={false}
        onNameChange={vi.fn()}
        onTypeChange={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("propaga mudanças e submit/close", () => {
    const onNameChange = vi.fn();
    const onTypeChange = vi.fn();
    const onClose = vi.fn();
    const onSave = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = render(
      <AccountModal
        isOpen={true}
        newAccName=""
        newAccType="conta"
        savingAcc={false}
        onNameChange={onNameChange}
        onTypeChange={onTypeChange}
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nome da Conta/i), { target: { value: "Nubank" } });
    expect(onNameChange).toHaveBeenCalledWith("Nubank");

    fireEvent.change(screen.getByLabelText(/Tipo/i), { target: { value: "cartao" } });
    expect(onTypeChange).toHaveBeenCalledWith("cartao");

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(onSave).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
