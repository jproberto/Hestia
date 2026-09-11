import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ChecklistCard from "./ChecklistCard";
import { storyBudgetItems, storyCategories, storyChecklistItems } from "./storybook.fixtures";

const meta = {
  title: "Pluto/ChecklistCard",
  component: ChecklistCard,
} satisfies Meta<typeof ChecklistCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const handlers = {
  onToggleItem: fn(),
  onAddItem: fn(() => Promise.resolve()),
  onEditItem: fn(() => Promise.resolve()),
  onDeleteItem: fn(() => Promise.resolve()),
  onTriggerTransactionModal: fn(),
};

export const Vazio: Story = {
  args: {
    items: [],
    categories: storyCategories,
    budgetItems: storyBudgetItems,
    isMonthOpen: true,
    selectedYear: 2026,
    selectedMonth: 3,
    userEmail: "story@hestia.com",
    ...handlers,
  },
};

export const ComItens: Story = {
  args: {
    items: storyChecklistItems,
    categories: storyCategories,
    budgetItems: storyBudgetItems,
    isMonthOpen: true,
    selectedYear: 2026,
    selectedMonth: 3,
    userEmail: "story@hestia.com",
    ...handlers,
  },
};

export const MesFechado: Story = {
  args: {
    items: storyChecklistItems,
    categories: storyCategories,
    budgetItems: storyBudgetItems,
    isMonthOpen: false,
    selectedYear: 2026,
    selectedMonth: 3,
    userEmail: "story@hestia.com",
    ...handlers,
  },
};
