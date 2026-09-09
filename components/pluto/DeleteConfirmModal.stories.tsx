import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { storyTransactions } from "./storybook.fixtures";

const meta = {
  title: "Pluto/DeleteConfirmModal",
  component: DeleteConfirmModal,
} satisfies Meta<typeof DeleteConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Aberto: Story = {
  args: {
    isOpen: true,
    transaction: storyTransactions[0],
    deleting: false,
    onClose: fn(),
    onConfirm: fn(),
  },
};

export const Excluindo: Story = {
  args: {
    isOpen: true,
    transaction: storyTransactions[0],
    deleting: true,
    onClose: fn(),
    onConfirm: fn(),
  },
};
