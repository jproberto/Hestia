import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ChecklistItemDeleteModal from "./ChecklistItemDeleteModal";
import { storyChecklistItems } from "./storybook.fixtures";

const meta = {
  title: "Pluto/ChecklistItemDeleteModal",
  component: ChecklistItemDeleteModal,
} satisfies Meta<typeof ChecklistItemDeleteModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Aberto: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
    onConfirm: fn(() => Promise.resolve()),
    item: storyChecklistItems[0],
    saving: false,
    errorMsg: null,
  },
};
