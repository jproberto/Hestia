import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ExerciseModal from "./ExerciseModal";
import type { Exercise } from "@/lib/milon/types";

const meta = {
  title: "Mílon/ExerciseModal",
  component: ExerciseModal,
} satisfies Meta<typeof ExerciseModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const editingExercise: Exercise = {
  id: "ex-1",
  name: "Supino reto",
  muscle: "Peito",
  videoLink: "https://video.exemplo/supino",
  loadUnit: null,
  deletedAt: null,
  createdAt: "2026-09-12T00:00:00Z",
  created_by: "a@hestia.com",
};

const base = {
  muscleOptions: ["Braço", "Peito", "Perna"],
  saving: false,
  error: null,
  successNotice: null,
  onClose: fn(),
  onSave: fn(async () => {}),
};

export const Criar: Story = {
  args: { ...base, open: true, editingExercise: null },
};

export const Editar: Story = {
  args: { ...base, open: true, editingExercise },
};
