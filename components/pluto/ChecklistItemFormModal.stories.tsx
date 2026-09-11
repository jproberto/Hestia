import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ChecklistItemFormModal from "./ChecklistItemFormModal";
import { storyCategories } from "./storybook.fixtures";

const meta = {
  title: "Pluto/ChecklistItemFormModal",
  component: ChecklistItemFormModal,
} satisfies Meta<typeof ChecklistItemFormModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Adicionar: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    onSubmit: fn(() => Promise.resolve()),
    categories: storyCategories,
    userEmail: "story@hestia.com",
    title: "Adicionar Item ao Checklist",
    submitLabel: "Adicionar",
    saving: false,
    errorMsg: null,
  },
};

export const Editar: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    onSubmit: fn(() => Promise.resolve()),
    categories: storyCategories,
    userEmail: "story@hestia.com",
    initialData: {
      day: 10,
      description: "Internet",
      type: "despesa",
      category_id: "cat-3",
      amount: 120,
      scope: "month",
    },
    title: "Editar Item do Checklist",
    submitLabel: "Salvar Alterações",
    saving: false,
    errorMsg: null,
  },
};
