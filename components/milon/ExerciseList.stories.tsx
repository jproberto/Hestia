import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ExerciseList from "./ExerciseList";
import type { ErrorOrigin } from "@/lib/shared";
import type { Exercise } from "@/lib/milon/types";

const meta = {
  title: "Mílon/ExerciseList",
  component: ExerciseList,
} satisfies Meta<typeof ExerciseList>;

export default meta;
type Story = StoryObj<typeof meta>;

const items: Exercise[] = [
  {
    id: "ex-1",
    name: "Agachamento",
    muscle: "Perna",
    videoLink: null,
    createdAt: "2026-09-12T00:00:00Z",
    created_by: "a@hestia.com",
  },
  {
    id: "ex-2",
    name: "Rosca direta",
    muscle: "Braço",
    videoLink: "https://video.exemplo/rosca",
    createdAt: "2026-09-12T00:00:00Z",
    created_by: "a@hestia.com",
  },
  {
    id: "ex-3",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: "https://video.exemplo/supino",
    createdAt: "2026-09-12T00:00:00Z",
    created_by: "b@hestia.com",
  },
];

const handlers = {
  onFilterChange: fn(),
  onSearchChange: fn(),
  onSortChange: fn(),
  onShowMore: fn(),
  onRetry: fn(),
  onEdit: fn(),
  onDelete: fn(),
};

const base = {
  muscleOptions: ["Braço", "Peito", "Perna"],
  muscleFilter: "",
  searchText: "",
  sortOrder: "muscle" as const,
  loading: false,
  error: null,
  errorOrigin: null as ErrorOrigin | null,
  isEmpty: false,
  ...handlers,
};

export const Cheia: Story = {
  args: { ...base, visibleItems: items, remainingCount: 4 },
};

export const OrdenadaPorNome: Story = {
  args: {
    ...base,
    visibleItems: [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    remainingCount: 0,
    sortOrder: "name" as const,
  },
};

export const Vazia: Story = {
  args: { ...base, visibleItems: [], remainingCount: 0, isEmpty: true },
};

export const SemResultado: Story = {
  args: {
    ...base,
    visibleItems: [],
    remainingCount: 0,
    isEmpty: false,
    muscleFilter: "Peito",
    searchText: "zzz",
  },
};

export const ErroCarga: Story = {
  args: {
    ...base,
    visibleItems: [],
    remainingCount: 0,
    error: "Falha ao buscar exercícios",
    errorOrigin: "carga" as ErrorOrigin,
  },
};

export const ErroOperacao: Story = {
  args: {
    ...base,
    visibleItems: items,
    remainingCount: 0,
    error: "Erro ao excluir exercício",
    errorOrigin: "operacao" as ErrorOrigin,
  },
};

export const ErroBloqueio: Story = {
  args: {
    ...base,
    visibleItems: items,
    remainingCount: 0,
    error: "Adicione pelo menos um treino com exercícios para ativar",
    errorOrigin: "bloqueio" as ErrorOrigin,
  },
};
