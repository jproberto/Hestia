import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import WorkoutList from "./WorkoutList";
import { MSG_TREINO_COM_EXERCICIOS } from "@/lib/milon/workout-utils";
import type { ProgramErrorOrigin, Workout } from "@/lib/milon/types";

const meta = {
  title: "Mílon/WorkoutList",
  component: WorkoutList,
} satisfies Meta<typeof WorkoutList>;

export default meta;
type Story = StoryObj<typeof meta>;

const PROGRAM_ID = "prog-001";

const treinos: Workout[] = [
  {
    id: "wout-a",
    programId: PROGRAM_ID,
    name: "Treino A",
    createdAt: "2026-10-01T00:00:00Z",
    created_by: "ana@hestia.lan",
  },
  {
    id: "wout-b",
    programId: PROGRAM_ID,
    name: "Treino B",
    createdAt: "2026-10-01T01:00:00Z",
    created_by: "ana@hestia.lan",
  },
  {
    id: "wout-push",
    programId: PROGRAM_ID,
    name: "Push",
    createdAt: "2026-10-01T02:00:00Z",
    created_by: "ana@hestia.lan",
  },
];

const handlers = {
  onRename: fn(),
  onDelete: fn(),
  onRetry: fn(),
};

const base = {
  programId: PROGRAM_ID,
  subtitles: {} as Record<string, string>,
  loading: false,
  error: null,
  errorOrigin: null as ProgramErrorOrigin | null,
  empty: false,
  readOnly: false,
  ...handlers,
};

export const Lista: Story = {
  args: {
    ...base,
    items: treinos,
    subtitles: { "wout-a": "Peito, Tríceps e Ombros" },
  },
};

export const Carregando: Story = {
  args: { ...base, items: [] as Workout[], loading: true },
};

export const Vazia: Story = {
  args: { ...base, items: [] as Workout[], empty: true },
};

export const ErroCarga: Story = {
  args: {
    ...base,
    items: [] as Workout[],
    error: "Erro ao carregar treinos",
    errorOrigin: "carga" as ProgramErrorOrigin,
  },
};

export const ErroBloqueio: Story = {
  args: {
    ...base,
    items: treinos.slice(0, 1),
    subtitles: {},
    error: MSG_TREINO_COM_EXERCICIOS,
    errorOrigin: "bloqueio" as ProgramErrorOrigin,
  },
};

export const SomenteLeitura: Story = {
  args: {
    ...base,
    items: treinos,
    subtitles: { "wout-a": "Peito, Tríceps e Ombros" },
    readOnly: true,
  },
};
