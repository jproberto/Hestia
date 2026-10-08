import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import SeriesEditModal from "./SeriesEditModal";
import type { WorkoutSeries } from "@/lib/milon/types";

const meta = {
  title: "Mílon/SeriesEditModal",
  component: SeriesEditModal,
} satisfies Meta<typeof SeriesEditModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";

function serie(overrides: Partial<WorkoutSeries> = {}): WorkoutSeries {
  return {
    id: "ser-1",
    entryId: "ent-1",
    position: 1,
    reps: 10,
    durationSeconds: null,
    load: 50,
    createdAt: CRIADO_EM,
    created_by: DONO,
    ...overrides,
  };
}

const base = {
  loadUnit: "kg" as const,
  saving: false,
  error: null,
  onClose: fn(),
  onSave: fn(async () => {}),
};

export const Aberta: Story = {
  args: { ...base, open: true, series: serie() },
};

export const ComErro: Story = {
  args: {
    ...base,
    open: true,
    series: serie(),
    error: "Falha ao salvar série",
  },
};

export const Salvando: Story = {
  args: { ...base, open: true, series: serie(), saving: true },
};

export const Fechada: Story = {
  args: { ...base, open: false, series: serie() },
};
