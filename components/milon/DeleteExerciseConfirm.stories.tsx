import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import DeleteExerciseConfirm from "./DeleteExerciseConfirm";

const meta = {
  title: "Mílon/DeleteExerciseConfirm",
  component: DeleteExerciseConfirm,
} satisfies Meta<typeof DeleteExerciseConfirm>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  exerciseName: "Supino reto",
  muscle: "Peito",
  onConfirm: fn(),
  onCancel: fn(),
};

export const Aberto: Story = {
  args: { ...base, open: true, deleting: false },
};

export const Excluindo: Story = {
  args: { ...base, open: true, deleting: true },
};
