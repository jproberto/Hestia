import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ExercisePickerModal from "./ExercisePickerModal";
import { MSG_EXERCICIO_JA_NO_PROGRAMA } from "@/lib/milon/workout-utils";
import type { Exercise } from "@/lib/milon/types";

const meta = {
  title: "Mílon/ExercisePickerModal",
  component: ExercisePickerModal,
} satisfies Meta<typeof ExercisePickerModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";

const exercicios: Exercise[] = [
  {
    id: "ex-1",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: null,
    loadUnit: "kg",
    deletedAt: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
  },
  {
    id: "ex-2",
    name: "Rosca direta",
    muscle: "Braço",
    videoLink: null,
    loadUnit: null,
    deletedAt: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
  },
  {
    id: "ex-3",
    name: "Agachamento livre",
    muscle: "Pernas",
    videoLink: null,
    loadUnit: "kg",
    deletedAt: null,
    createdAt: CRIADO_EM,
    created_by: DONO,
  },
];

const base = {
  exercises: exercicios,
  loading: false,
  error: null,
  saving: false,
  searchText: "",
  muscleFilter: "",
  muscleOptions: ["Peito", "Braço", "Pernas", "Costas"],
  onSearch: fn(),
  onFilterMuscle: fn(),
  onSelect: fn(),
  onCreateNew: fn(),
  onClose: fn(),
};

export const Lista: Story = {
  args: { ...base, open: true },
};

export const Buscando: Story = {
  args: { ...base, open: true, searchText: "sup" },
};

export const Filtrando: Story = {
  args: { ...base, open: true, muscleFilter: "Peito" },
};

export const ErroDuplicado: Story = {
  args: { ...base, open: true, error: MSG_EXERCICIO_JA_NO_PROGRAMA },
};

export const Carregando: Story = {
  args: { ...base, open: true, loading: true },
};
