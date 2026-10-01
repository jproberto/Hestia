import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AsyncState } from "./AsyncState";
import type { ErrorOrigin } from "@/lib/shared";

const meta = {
  title: "UI/AsyncState",
  component: AsyncState,
} satisfies Meta<typeof AsyncState>;

export default meta;
type Story = StoryObj<typeof meta>;

const TEXTOS = {
  loadingText: "Carregando programas...",
  emptyTitle: "Nenhum programa ainda.",
  emptyText: "Crie o primeiro programa para começar.",
  noResultsTitle: "Nada encontrado para essa combinação.",
  noResultsText: "Ajuste os filtros para ver mais programas.",
};

const base = {
  loading: false,
  error: null as string | null,
  empty: false,
  noResults: false,
  onRetry: fn(),
  ...TEXTOS,
};

const EXEMPLO_ITENS = (
  <ul>
    <li>Ficha A — Ana</li>
    <li>Ficha B — Bia</li>
  </ul>
);

export const Carregando: Story = {
  args: { ...base, loading: true },
};

export const ErroCarga: Story = {
  args: {
    ...base,
    error: "Erro ao carregar programas",
    errorOrigin: "carga" as ErrorOrigin,
  },
};

export const ErroOrigemAusente: Story = {
  args: { ...base, error: "Erro ao carregar programas" },
};

export const ErroOrigemNula: Story = {
  args: {
    ...base,
    error: "Erro ao carregar programas",
    errorOrigin: null,
  },
};

export const ErroOperacao: Story = {
  args: {
    ...base,
    error: "Erro ao atualizar programa",
    errorOrigin: "operacao" as ErrorOrigin,
  },
};

export const ErroBloqueio: Story = {
  args: {
    ...base,
    error: "Adicione pelo menos um treino com exercícios para ativar",
    errorOrigin: "bloqueio" as ErrorOrigin,
  },
};

export const Vazio: Story = {
  args: { ...base, empty: true },
};

export const SemResultados: Story = {
  args: { ...base, noResults: true },
};

export const ListaSobErro: Story = {
  args: {
    ...base,
    error: "Adicione pelo menos um treino com exercícios para ativar",
    errorOrigin: "bloqueio" as ErrorOrigin,
    children: EXEMPLO_ITENS,
  },
};
