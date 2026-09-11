import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ChecklistItemRow from "./ChecklistItemRow";
import { storyChecklistItems } from "./storybook.fixtures";

const meta = {
  title: "Pluto/ChecklistItemRow",
  component: ChecklistItemRow,
} satisfies Meta<typeof ChecklistItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const handlers = {
  onToggle: fn(),
  onEdit: fn(),
  onDelete: fn(),
  renderUrgencyBadge: () => <span data-testid="urgency-badge">badge</span>,
};

export const Pendente: Story = {
  args: {
    item: storyChecklistItems[0],
    urgency: "ondue",
    isMonthOpen: true,
    rowBg: "",
    ...handlers,
  },
};

export const Concluida: Story = {
  args: {
    item: storyChecklistItems[1],
    urgency: "completed",
    isMonthOpen: true,
    rowBg: "opacity-60 bg-muted/30",
    ...handlers,
  },
};

export const MesFechado: Story = {
  args: {
    item: storyChecklistItems[0],
    urgency: "warning",
    isMonthOpen: false,
    rowBg: "",
    ...handlers,
  },
};
