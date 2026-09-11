import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import BudgetComparisonSection from "./BudgetComparisonSection";
import { storyReceitaRows, storyDespesaRows } from "./storybook.fixtures";

const meta = {
  title: "Pluto/BudgetComparisonSection",
  component: BudgetComparisonSection,
} satisfies Meta<typeof BudgetComparisonSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ComDados: Story = {
  args: {
    receitaRows: storyReceitaRows,
    despesaRows: storyDespesaRows,
    totalReceitaPrevisto: 5000,
    totalReceitaReal: 4800,
    totalDespesaPrevisto: 1000,
    totalDespesaReal: 350,
  },
};

export const Vazio: Story = {
  args: {
    receitaRows: [],
    despesaRows: [],
    totalReceitaPrevisto: 0,
    totalReceitaReal: 0,
    totalDespesaPrevisto: 0,
    totalDespesaReal: 0,
  },
};
