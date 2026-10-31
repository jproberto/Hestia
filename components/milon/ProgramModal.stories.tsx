import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ProgramModal from "./ProgramModal";
import type { Program } from "@/lib/milon/types";

const meta = {
  title: "Mílon/ProgramModal",
  component: ProgramModal,
} satisfies Meta<typeof ProgramModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const editingProgram: Program = {
  id: "prog-1",
  title: "Programa Empurrão de Peito",
  owner: "a@hestia.com",
  status: "rascunho",
  createdAt: "2026-09-29T00:00:00Z",
  created_by: "a@hestia.com",
};

const base = {
  saving: false,
  errorMsg: null,
  successMsg: null,
  onClose: fn(),
  onSave: fn(async (_title: string) => {}),
};

export const CriacaoComSugestao: Story = {
  args: {
    ...base,
    open: true,
    program: null,
    suggestion: "Treino Monstro da Semana",
  },
};

export const Edicao: Story = {
  args: {
    ...base,
    open: true,
    program: editingProgram,
    suggestion: "Sugestão Ignorada",
  },
};

export const ErroValidacao: Story = {
  args: {
    ...base,
    open: true,
    program: null,
    suggestion: "Treino Monstro da Semana",
    errorMsg: "Não foi possível salvar o programa.",
  },
};

export const Salvando: Story = {
  args: {
    ...base,
    open: true,
    program: null,
    suggestion: "Treino Monstro da Semana",
    saving: true,
  },
};
