import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import WorkoutModal from "./WorkoutModal";

const meta = {
  title: "Mílon/WorkoutModal",
  component: WorkoutModal,
} satisfies Meta<typeof WorkoutModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  saving: false,
  errorMsg: null,
  onClose: fn(),
  onSave: fn(async (_name: string) => {}),
};

export const Criar: Story = {
  args: {
    ...base,
    open: true,
    mode: "criar",
    defaultName: "Treino A",
    otherNames: [],
  },
};

export const Renomear: Story = {
  args: {
    ...base,
    open: true,
    mode: "renomear",
    defaultName: "Push",
    otherNames: ["Treino A", "Treino B"],
  },
};

export const ErroGravacao: Story = {
  args: {
    ...base,
    open: true,
    mode: "criar",
    defaultName: "Treino B",
    otherNames: ["Treino A"],
    errorMsg: "Não foi possível salvar o treino.",
  },
};

export const Salvando: Story = {
  args: {
    ...base,
    open: true,
    mode: "criar",
    defaultName: "Treino A",
    otherNames: [],
    saving: true,
  },
};
