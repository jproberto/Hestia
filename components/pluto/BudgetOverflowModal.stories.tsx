import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import BudgetOverflowModal from "./BudgetOverflowModal";
import { storyOverflow } from "./storybook.fixtures";

const meta = {
  title: "Pluto/BudgetOverflowModal",
  component: BudgetOverflowModal,
} satisfies Meta<typeof BudgetOverflowModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Estouro: Story = {
  args: {
    isOpen: true,
    overflowData: storyOverflow,
    month: 10,
    userEmail: "story@hestia.com",
    onConfirm: fn(),
    onCancel: fn(),
  },
};
