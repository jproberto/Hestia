import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import WorkoutConfirmModal from "./WorkoutConfirmModal";

const meta = {
  title: "Mílon/WorkoutConfirmModal",
  component: WorkoutConfirmModal,
} satisfies Meta<typeof WorkoutConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  exerciseName: "Supino reto",
  seriesCount: 3,
  currentQuantity: 5,
  newQuantity: 2,
  processing: false,
  onConfirm: fn(),
  onCancel: fn(),
};

export const RemoverExercicio: Story = {
  args: { ...base, open: true, variant: "remover-exercicio" },
};

export const RemoverUmaSerie: Story = {
  args: { ...base, open: true, variant: "remover-exercicio", seriesCount: 1 },
};

export const ReduzirSeries: Story = {
  args: { ...base, open: true, variant: "reduzir-series" },
};

export const Processando: Story = {
  args: { ...base, open: true, variant: "remover-exercicio", processing: true },
};

export const Fechado: Story = {
  args: { ...base, open: false, variant: "remover-exercicio" },
};
