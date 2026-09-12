import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MilonExample } from "./MilonExample";

const meta: Meta<typeof MilonExample> = {
  title: "Mílon/Example",
  component: MilonExample,
};

export default meta;
type Story = StoryObj<typeof MilonExample>;

export const Default: Story = {
  args: { name: "Exemplo Mílon" },
};
