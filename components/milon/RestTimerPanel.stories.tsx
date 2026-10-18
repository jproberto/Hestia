import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import RestTimerPanel from "./RestTimerPanel";

const meta = {
  title: "Mílon/RestTimerPanel",
  component: RestTimerPanel,
} satisfies Meta<typeof RestTimerPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  exerciseName: "Supino reto",
  remainingSeconds: 90,
  finished: false,
  onDismiss: fn(),
};

export const Contagem: Story = {
  args: { ...base },
};

export const ContagemCurta: Story = {
  args: { ...base, remainingSeconds: 5 },
};

export const ContagemSemNome: Story = {
  args: { ...base, exerciseName: null },
};

export const Finalizado: Story = {
  args: { ...base, remainingSeconds: 0, finished: true },
};

export const FinalizadoSemNome: Story = {
  args: { ...base, exerciseName: null, remainingSeconds: 0, finished: true },
};

export const Ocioso: Story = {
  args: { ...base, remainingSeconds: null },
};
