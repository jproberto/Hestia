import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import SeriesCard from "./SeriesCard";
import type { WorkoutSeries } from "@/lib/milon/types";

const meta = {
  title: "Mílon/SeriesCard",
  component: SeriesCard,
} satisfies Meta<typeof SeriesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";

function serie(overrides: Partial<WorkoutSeries> = {}): WorkoutSeries {
  return {
    id: "s1",
    entryId: "entry-1",
    position: 1,
    reps: 10,
    durationSeconds: null,
    load: 40,
    createdAt: CRIADO_EM,
    created_by: DONO,
    ...overrides,
  };
}

const base = {
  loadUnit: "kg" as const,
  readOnly: false,
  onCommit: fn(),
  onApplyAll: fn(),
  onChooseUnit: fn(),
};

export const Padrao: Story = {
  args: { ...base, series: serie(), index: 0 },
};

export const Vazia: Story = {
  args: {
    ...base,
    series: serie({ id: "s2", reps: null, durationSeconds: null, load: null }),
    index: 1,
  },
};

export const CargaZero: Story = {
  args: { ...base, series: serie({ load: 0 }), index: 0 },
};

export const SomenteLeitura: Story = {
  args: { ...base, series: serie(), index: 0, readOnly: true },
};
