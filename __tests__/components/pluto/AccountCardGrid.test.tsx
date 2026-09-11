import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AccountCardGrid from "@/components/pluto/AccountCardGrid";
import type { AccountCardData } from "@/lib/pluto/types";

const cards: AccountCardData[] = [
  {
    account: { id: "a1", name: "Itaú", type: "conta", created_at: null, created_by: null },
    txs: [
      {
        id: "t1",
        description: "Supermercado",
        amount: 200,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "c1",
        account_id: "a1",
        created_at: "2026-03-15T00:00:00Z",
        created_by: "t@t.com",
        category_name: "Alimentação",
        account_name: "Itaú",
      },
    ],
  },
];

describe("AccountCardGrid", () => {
  it("mostra loading quando carregando", () => {
    render(
      <AccountCardGrid
        cards={[]}
        loading={true}
        selectedMonth={3}
        onOpenAccModal={vi.fn()}
        onOpenTxModal={vi.fn()}
        onOpenEditModal={vi.fn()}
        onOpenDeleteModal={vi.fn()}
      />
    );

    expect(screen.getByText(/Carregando contas/i)).toBeInTheDocument();
  });

  it("mostra estado vazio com CTA quando não há contas", () => {
    const onOpenAccModal = vi.fn();
    render(
      <AccountCardGrid
        cards={[]}
        loading={false}
        selectedMonth={3}
        onOpenAccModal={onOpenAccModal}
        onOpenTxModal={vi.fn()}
        onOpenEditModal={vi.fn()}
        onOpenDeleteModal={vi.fn()}
      />
    );

    expect(screen.getByText(/Nenhuma conta ou cartão/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cadastrar Primeira Conta/i }));
    expect(onOpenAccModal).toHaveBeenCalled();
  });

  it("renderiza cartões com transações e dispara ações", () => {
    const onOpenTxModal = vi.fn();
    const onOpenEditModal = vi.fn();
    const onOpenDeleteModal = vi.fn();
    render(
      <AccountCardGrid
        cards={cards}
        loading={false}
        selectedMonth={3}
        onOpenAccModal={vi.fn()}
        onOpenTxModal={onOpenTxModal}
        onOpenEditModal={onOpenEditModal}
        onOpenDeleteModal={onOpenDeleteModal}
      />
    );

    expect(screen.getByText("Itaú")).toBeInTheDocument();
    expect(screen.getByText("Supermercado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /\+ Nova Transação/i }));
    expect(onOpenTxModal).toHaveBeenCalledWith(cards[0].account);

    fireEvent.click(screen.getByRole("button", { name: /Editar lançamento Supermercado/i }));
    expect(onOpenEditModal).toHaveBeenCalledWith(cards[0].txs[0]);

    fireEvent.click(screen.getByRole("button", { name: /Excluir lançamento Supermercado/i }));
    expect(onOpenDeleteModal).toHaveBeenCalledWith(cards[0].txs[0]);
  });
});
