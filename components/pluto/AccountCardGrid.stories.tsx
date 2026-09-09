import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import AccountCardGrid from "./AccountCardGrid";
import { storyAccounts, storyTransactions } from "./storybook.fixtures";

const meta = {
  title: "Pluto/AccountCardGrid",
  component: AccountCardGrid,
} satisfies Meta<typeof AccountCardGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const handlers = {
  onOpenAccModal: fn(),
  onOpenTxModal: fn(),
  onOpenEditModal: fn(),
  onOpenDeleteModal: fn(),
};

export const Carregando: Story = {
  args: {
    cards: [],
    loading: true,
    selectedMonth: 3,
    ...handlers,
  },
};

export const Vazio: Story = {
  args: {
    cards: [],
    loading: false,
    selectedMonth: 3,
    ...handlers,
  },
};

export const ComContas: Story = {
  args: {
    cards: [
      { account: storyAccounts[0], txs: storyTransactions },
      { account: storyAccounts[1], txs: [] },
    ],
    loading: false,
    selectedMonth: 3,
    ...handlers,
  },
};
