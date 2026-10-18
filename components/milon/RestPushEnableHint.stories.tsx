import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import RestPushEnableHint from "./RestPushEnableHint";

const meta = {
  title: "Mílon/RestPushEnableHint",
  component: RestPushEnableHint,
} satisfies Meta<typeof RestPushEnableHint>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  supported: true,
  permission: "default" as const,
  isStandalone: false,
  isIOS: false,
  requesting: false,
  onRequest: fn(),
};

export const Default: Story = {
  args: { ...base },
};

export const IPHONE: Story = {
  args: { ...base, isIOS: true, isStandalone: false },
};

export const Instalado: Story = {
  args: { ...base, isIOS: true, isStandalone: true },
};

export const Solicitando: Story = {
  args: { ...base, requesting: true },
};

export const Concedido: Story = {
  args: { ...base, permission: "granted" },
};

export const Negado: Story = {
  args: { ...base, permission: "denied" },
};

export const SemSuporte: Story = {
  args: { ...base, supported: false, permission: "unsupported" },
};
