import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within, expect } from "storybook/test";
import { createRef } from "react";
import TransactionModal from "./TransactionModal";
import { storyAccounts, storyCategories, storyTransactions } from "./storybook.fixtures";

const meta = {
  title: "Pluto/TransactionModal",
  component: TransactionModal,
} satisfies Meta<typeof TransactionModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  accountInput: "Itaú Corrente",
  description: "",
  amount: "",
  type: "despesa" as const,
  isRefund: false,
  date: "2026-03-15",
  categoryInput: "",
  savingTx: false,
  txSuccessMsg: null,
  accounts: storyAccounts,
  categories: storyCategories,
  selectedYear: 2026,
  selectedMonth: 3,
  minDateStr: "2026-03-01",
  maxDateStr: "2026-03-31",
  descInputRef: createRef<HTMLInputElement>(),
  onClose: fn(),
  onSave: fn(),
  onSaveAndAddAnother: fn(),
  onDescriptionChange: fn(),
  onAmountChange: fn(),
  onTypeChange: fn(),
  onIsRefundChange: fn(),
  onDateChange: fn(),
  onAccountInputChange: fn(),
  onCategoryInputChange: fn(),
};

export const Criar: Story = {
  args: {
    ...baseArgs,
    isOpen: true,
    editingTransaction: null,
  },
};

export const Editar: Story = {
  args: {
    ...baseArgs,
    isOpen: true,
    editingTransaction: storyTransactions[0],
    description: "Supermercado",
    amount: "200",
    categoryInput: "Alimentação",
  },
};

export const PreenchimentoViaInteracao: Story = {
  args: {
    ...baseArgs,
    isOpen: true,
    editingTransaction: null,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Descrição/i), "Luz");
    await expect(args.onDescriptionChange).toHaveBeenCalled();
  },
};
