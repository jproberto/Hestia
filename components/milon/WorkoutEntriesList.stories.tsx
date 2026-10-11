import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import WorkoutEntriesList from "./WorkoutEntriesList";
import type { ErrorOrigin } from "@/lib/shared";
import type {
  Exercise,
  WorkoutEntry,
  WorkoutEntryView,
  WorkoutSeries,
} from "@/lib/milon/types";

const meta = {
  title: "Mílon/WorkoutEntriesList",
  component: WorkoutEntriesList,
} satisfies Meta<typeof WorkoutEntriesList>;

export default meta;
type Story = StoryObj<typeof meta>;

const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";

function exercicio(id: string, name: string, muscle: string): Exercise {
  return {
    id,
    name,
    muscle,
    videoLink: null,
    loadUnit: "kg",
    deletedAt: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
  };
}

function entrada(id: string, exerciseId: string, position: number): WorkoutEntry {
  return {
    id,
    workoutId: "wout-1",
    programId: "prog-1",
    exerciseId,
    position,
    restSeconds: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
  };
}

function serie(id: string, entryId: string, position: number): WorkoutSeries {
  return {
    id,
    entryId,
    position,
    value: null,
    load: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
  };
}

const entradas: WorkoutEntryView[] = [
  {
    entry: entrada("entry-1", "ex-1", 1),
    exercise: exercicio("ex-1", "Supino reto", "Peito"),
    series: [serie("s1", "entry-1", 1), serie("s2", "entry-1", 2)],
  },
  {
    entry: entrada("entry-2", "ex-2", 2),
    exercise: exercicio("ex-2", "Rosca direta", "Braço"),
    series: [serie("s3", "entry-2", 1)],
  },
];

const handlers = {
  onAdd: fn(),
  onRetry: fn(),
  onReorder: fn(),
  onQuantityCommit: fn(),
  onRequestReduce: fn(),
  onRestCommit: fn(),
  onSeriesCommit: fn(),
  onApplyAll: fn(),
  onEditExercise: fn(),
  onRemoveEntry: fn(),
  onConfirmUnit: fn(),
};

const base = {
  programId: "prog-1",
  readOnly: false,
  empty: false,
  errorMsg: null,
  errorOrigin: null as ErrorOrigin | null,
  ...handlers,
};

export const Lista: Story = {
  args: { ...base, entries: entradas },
};

export const Vazia: Story = {
  args: { ...base, entries: [], empty: true },
};

export const ErroCarga: Story = {
  args: {
    ...base,
    entries: [],
    errorMsg: "Falha ao carregar treino",
    errorOrigin: "carga" as ErrorOrigin,
  },
};

export const ErroBloqueio: Story = {
  args: {
    ...base,
    entries: entradas,
    errorMsg:
      "Este exercício já está em um treino deste programa. Escolha outro exercício.",
    errorOrigin: "bloqueio" as ErrorOrigin,
  },
};

export const SomenteLeitura: Story = {
  args: { ...base, entries: entradas, readOnly: true },
};
