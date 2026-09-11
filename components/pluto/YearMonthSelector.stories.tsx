import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import YearMonthSelector from "./YearMonthSelector";
import { storyMonthlyPeriods } from "./storybook.fixtures";

const meta = {
  title: "Pluto/YearMonthSelector",
  component: YearMonthSelector,
} satisfies Meta<typeof YearMonthSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComDados: Story = {
  args: {
    availableYears: [2026, 2027],
    openMonths: storyMonthlyPeriods,
    selectedYear: 2026,
    selectedMonth: 3,
    onYearChange: fn(),
    onMonthChange: fn(),
  },
};

export const Vazio: Story = {
  args: {
    availableYears: [],
    openMonths: [],
    selectedYear: 2026,
    selectedMonth: 3,
    onYearChange: fn(),
    onMonthChange: fn(),
  },
};
