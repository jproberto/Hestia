import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ProgramList from "./ProgramList";
import type { Program, ProgramErrorOrigin } from "@/lib/milon/types";

const meta = {
  title: "Mílon/ProgramList",
  component: ProgramList,
} satisfies Meta<typeof ProgramList>;

export default meta;
type Story = StoryObj<typeof meta>;

const DONOS = ["ana@hestia.lan", "bia@hestia.lan"];

const mixedItems: Program[] = [
  {
    id: "p1",
    title: "Ficha Rascunho",
    owner: DONOS[0],
    status: "rascunho",
    createdAt: "2026-09-29T00:00:00Z",
    created_by: DONOS[0],
  },
  {
    id: "p2",
    title: "Ficha Ativa",
    owner: DONOS[1],
    status: "ativo",
    createdAt: "2026-09-28T00:00:00Z",
    created_by: DONOS[1],
  },
  {
    id: "p3",
    title: "Ficha Antiga",
    owner: DONOS[0],
    status: "inativo",
    createdAt: "2026-09-27T00:00:00Z",
    created_by: DONOS[0],
  },
];

const handlers = {
  onChangeOwner: fn(),
  onChangeStatus: fn(),
  onEdit: fn(),
  onActivateReactivate: fn(),
  onDelete: fn(),
  onRetry: fn(),
};

const base = {
  ownerOptions: [...DONOS],
  selectedOwner: "",
  selectedStatuses: ["rascunho", "ativo", "inativo"] as Program["status"][],
  loading: false,
  error: null,
  errorOrigin: "carga" as ProgramErrorOrigin,
  empty: false,
  noResults: false,
  ...handlers,
};

export const Carregando: Story = {
  args: { ...base, items: [] as Program[], loading: true },
};

export const Erro: Story = {
  args: {
    ...base,
    items: [] as Program[],
    error: "Erro ao carregar programas",
    errorOrigin: "carga" as ProgramErrorOrigin,
  },
};

export const ErroCarga: Story = {
  args: {
    ...base,
    items: [] as Program[],
    error: "Erro ao carregar programas",
    errorOrigin: "carga" as ProgramErrorOrigin,
  },
};

export const ErroOperacao: Story = {
  args: {
    ...base,
    items: [] as Program[],
    error: "Erro ao atualizar programa",
    errorOrigin: "operacao" as ProgramErrorOrigin,
  },
};

export const ErroBloqueio: Story = {
  args: {
    ...base,
    items: [] as Program[],
    error: "Adicione pelo menos um treino com exercícios para ativar",
    errorOrigin: "bloqueio" as ProgramErrorOrigin,
  },
};

export const Vazia: Story = {
  args: { ...base, items: [] as Program[], empty: true },
};

export const SemResultado: Story = {
  args: { ...base, items: [] as Program[], noResults: true },
};

export const ListaMista: Story = {
  args: { ...base, items: mixedItems },
};
