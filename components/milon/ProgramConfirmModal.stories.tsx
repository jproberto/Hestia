import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ProgramConfirmModal from "./ProgramConfirmModal";

const meta = {
  title: "Mílon/ProgramConfirmModal",
  component: ProgramConfirmModal,
} satisfies Meta<typeof ProgramConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  title: "Ficha Verão 2026",
  owner: "ana@hestia.lan",
  onConfirm: fn(),
  onCancel: fn(),
};

export const Ativar: Story = {
  args: { ...base, open: true, action: "ativar", processing: false },
};

export const Reativar: Story = {
  args: { ...base, open: true, action: "reativar", processing: false },
};

export const Excluir: Story = {
  args: { ...base, open: true, action: "excluir", processing: false },
};

export const Ativando: Story = {
  args: { ...base, open: true, action: "ativar", processing: true },
};

export const Reativando: Story = {
  args: { ...base, open: true, action: "reativar", processing: true },
};

export const Excluindo: Story = {
  args: { ...base, open: true, action: "excluir", processing: true },
};
