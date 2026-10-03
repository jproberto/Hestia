import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ExerciseEntryCard from "./ExerciseEntryCard";
import type {
  Exercise,
  WorkoutEntry,
  WorkoutEntryView,
  WorkoutSeries,
} from "@/lib/milon/types";

const meta = {
  title: "Mílon/ExerciseEntryCard",
  component: ExerciseEntryCard,
} satisfies Meta<typeof ExerciseEntryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";

const exercicio: Exercise = {
  id: "ex-1",
  name: "Supino reto",
  muscle: "Peito",
  videoLink: null,
  loadUnit: "kg",
  deletedAt: null,
  createdAt: CRIADO_EM,
  created_by: DONO,
};

const entrada: WorkoutEntry = {
  id: "entry-1",
  workoutId: "wout-1",
  programId: "prog-1",
  exerciseId: "ex-1",
  position: 1,
  restSeconds: 90,
  createdAt: CRIADO_EM,
  created_by: DONO,
};

function serie(id: string, position: number): WorkoutSeries {
  return {
    id,
    entryId: "entry-1",
    position,
    reps: 10,
    durationSeconds: null,
    load: 40,
    createdAt: CRIADO_EM,
    created_by: DONO,
  };
}

const comSeries: WorkoutEntryView = {
  entry: entrada,
  exercise: exercicio,
  series: [serie("s1", 1), serie("s2", 2)],
};

const base = {
  readOnly: false,
  unitPromptValue: null,
  saving: false,
  onQuantityCommit: fn(),
  onRequestReduce: fn(),
  onRestCommit: fn(),
  onSeriesCommit: fn(),
  onApplyAll: fn(),
  onEditExercise: fn(),
  onRemoveEntry: fn(),
  onChooseUnit: fn(),
};

export const Padrao: Story = {
  args: { ...base, entryView: comSeries },
};

export const SemSeries: Story = {
  args: {
    ...base,
    entryView: { entry: entrada, exercise: exercicio, series: [] },
  },
};

export const SemUnidade: Story = {
  args: {
    ...base,
    entryView: {
      entry: entrada,
      exercise: { ...exercicio, loadUnit: null },
      series: [
        {
          id: "s1",
          entryId: "entry-1",
          position: 1,
          reps: null,
          durationSeconds: null,
          load: null,
          createdAt: CRIADO_EM,
          created_by: DONO,
        },
      ],
    },
  },
};

export const SomenteLeitura: Story = {
  args: { ...base, entryView: comSeries, readOnly: true },
};
