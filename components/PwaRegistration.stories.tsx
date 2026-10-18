import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PwaRegistration from "./PwaRegistration";

const meta = {
  title: "Héstia/PwaRegistration",
  component: PwaRegistration,
} satisfies Meta<typeof PwaRegistration>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Componente transversal sem props: registra /sw.js no mount e renderiza null. */
export const Padrao: Story = {};
