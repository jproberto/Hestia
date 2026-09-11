import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChecklistOverflowAlerts from "./ChecklistOverflowAlerts";
import { storyOverflow } from "./storybook.fixtures";

const meta = {
  title: "Pluto/ChecklistOverflowAlerts",
  component: ChecklistOverflowAlerts,
} satisfies Meta<typeof ChecklistOverflowAlerts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComAlertas: Story = {
  args: {
    overflowCategories: [storyOverflow],
  },
};

export const SemAlertas: Story = {
  args: {
    overflowCategories: [],
  },
};
