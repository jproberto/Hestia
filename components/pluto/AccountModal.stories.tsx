import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import AccountModal from "./AccountModal";

const meta = {
  title: "Pluto/AccountModal",
  component: AccountModal,
} satisfies Meta<typeof AccountModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Aberto: Story = {
  args: {
    isOpen: true,
    newAccName: "",
    newAccType: "conta",
    savingAcc: false,
    onNameChange: fn(),
    onTypeChange: fn(),
    onClose: fn(),
    onSave: fn(),
  },
};

export const Salvando: Story = {
  args: {
    isOpen: true,
    newAccName: "Nubank",
    newAccType: "cartao",
    savingAcc: true,
    onNameChange: fn(),
    onTypeChange: fn(),
    onClose: fn(),
    onSave: fn(),
  },
};
