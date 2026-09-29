import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ProgramList from "@/components/milon/ProgramList";
import type { Program, ProgramStatus } from "@/lib/milon/types";

/**
 * Contrato (plan.md §3 "ProgramList (props)" + tasks.json TASK-007):
 * - props: items (filtrados), ownerOptions (2 emails), selectedOwner,
 *   selectedStatuses, loading, error, empty, noResults, onChangeOwner,
 *   onChangeStatus, onEdit, onActivateReactivate, onDelete (+ onRetry para o
 *   estado "error com retry" exigido por TASK-007/spec §3 "erro com tentar de
 *   novo", espelhando ExerciseList.onRetry).
 * - Título de seção usa o token `font-display` (TASK-007 criteria 1).
 * - Item mostra título, dono e badge de status (spec §3 "Tela própria").
 * - Ações por status (TASK-007 description): rascunho → editar/ativar/excluir;
 *   ativo → editar; inativo → somente reativar (leitura). Excluir só em rascunho
 *   (spec §3 "Exclusão de rascunho").
 * - Estados: loading, error com retry, empty (criar o primeiro), noResults
 *   (ajustar os filtros) — spec §3 "Lista vazia ... criar o primeiro Programa ou
 *   ajustar os filtros".
 *
 * Tipo de props declarado localmente: o contrato do plano não exige export de
 * tipo do componente — o teste só depende do default export.
 */
interface ProgramListProps {
  items: Program[];
  ownerOptions: string[];
  selectedOwner: string;
  selectedStatuses: ProgramStatus[];
  loading: boolean;
  error: string | null;
  empty: boolean;
  noResults: boolean;
  onChangeOwner: (owner: string) => void;
  onChangeStatus: (status: ProgramStatus) => void;
  onEdit: (program: Program) => void;
  onActivateReactivate: (program: Program) => void;
  onDelete: (program: Program) => void;
  onRetry: () => void;
}

const DONOS = ["ana@hestia.lan", "bia@hestia.lan"];
const TODOS_STATUS: ProgramStatus[] = ["rascunho", "ativo", "inativo"];

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "prog-1",
    title: "Ficha Verão 2026",
    owner: DONOS[0],
    status: "rascunho",
    createdAt: "2026-09-29T00:00:00Z",
    created_by: DONOS[0],
    ...overrides,
  };
}

function defaultProps(overrides: Partial<ProgramListProps> = {}): ProgramListProps {
  return {
    items: [makeProgram()],
    ownerOptions: [...DONOS],
    selectedOwner: DONOS[0],
    selectedStatuses: [...TODOS_STATUS],
    loading: false,
    error: null,
    empty: false,
    noResults: false,
    onChangeOwner: vi.fn(),
    onChangeStatus: vi.fn(),
    onEdit: vi.fn(),
    onActivateReactivate: vi.fn(),
    onDelete: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
}

// Item da lista precisa viver dentro de um elemento de lista (li — padrão de
// ExerciseList — ou div com role="listitem") para escopar título/dono/status.
function itemOf(title: string): HTMLElement {
  const node = screen.getByText(title).closest("li, [role='listitem']");
  if (!node) {
    throw new Error(
      `Item "${title}" não está dentro de um elemento de lista (li ou role=listitem)`,
    );
  }
  return node as HTMLElement;
}

describe("ProgramList", () => {
  describe("renderização de itens (criterio 1)", () => {
    it("título da seção usa o token font-display", () => {
      render(<ProgramList {...defaultProps()} />);

      const heading = screen.getByRole("heading", { name: /programas/i });
      expect(heading.className).toMatch(/font-display/);
    });

    it("lista itens com título, dono e badge de status", () => {
      const rascunho = makeProgram({
        id: "p1",
        title: "Ficha Verão 2026",
        owner: DONOS[0],
        status: "rascunho",
      });
      const ativo = makeProgram({
        id: "p2",
        title: "Ficha Maromba Total",
        owner: DONOS[1],
        status: "ativo",
      });
      render(<ProgramList {...defaultProps({ items: [rascunho, ativo] })} />);

      expect(screen.getByText("Ficha Verão 2026")).toBeInTheDocument();
      expect(screen.getByText("Ficha Maromba Total")).toBeInTheDocument();

      const itemRascunho = itemOf("Ficha Verão 2026");
      expect(within(itemRascunho).getByText(/ana@hestia\.lan/)).toBeInTheDocument();
      expect(within(itemRascunho).getByText(/rascunho/i)).toBeInTheDocument();

      const itemAtivo = itemOf("Ficha Maromba Total");
      expect(within(itemAtivo).getByText(/bia@hestia\.lan/)).toBeInTheDocument();
      expect(within(itemAtivo).getByText(/ativo/i)).toBeInTheDocument();
    });
  });

  describe("filtros: select de dono e checks de status (criterio 2)", () => {
    it("select de dono mostra as ownerOptions, a opção de limpar e reflete selectedOwner", () => {
      render(<ProgramList {...defaultProps()} />);

      const select = screen.getByRole("combobox");
      expect(select).toHaveValue(DONOS[0]);

      const values = within(select)
        .getAllByRole("option")
        .map((option) => option.getAttribute("value"));
      expect(values).toEqual(expect.arrayContaining(DONOS));
      // "limpar o filtro de dono volta a ver a família inteira" (spec §3) —
      // a única via de clear é a própria prop onChangeOwner.
      expect(values).toContain("");
    });

    it("trocar o select de dono dispara onChangeOwner (incluindo limpar → família inteira)", () => {
      const onChangeOwner = vi.fn();
      render(<ProgramList {...defaultProps({ onChangeOwner })} />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: DONOS[1] } });
      expect(onChangeOwner).toHaveBeenCalledWith(DONOS[1]);

      fireEvent.change(select, { target: { value: "" } });
      expect(onChangeOwner).toHaveBeenCalledWith("");
    });

    it("renderiza os três checks de status marcados e dispara onChangeStatus ao marcar/desmarcar", () => {
      const onChangeStatus = vi.fn();
      render(<ProgramList {...defaultProps({ onChangeStatus })} />);

      expect(screen.getAllByRole("checkbox")).toHaveLength(3);
      expect(screen.getByRole("checkbox", { name: /rascunho/i })).toBeChecked();
      // /(^|\s)ativo/ evita casar com "Inativo" (substring de "inativo").
      expect(screen.getByRole("checkbox", { name: /(^|\s)ativo/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /inativo/i })).toBeChecked();

      fireEvent.click(screen.getByRole("checkbox", { name: /inativo/i }));
      expect(onChangeStatus).toHaveBeenCalledWith("inativo");
      expect(screen.getByRole("checkbox", { name: /rascunho/i })).toBeChecked();
    });

    it("selectedStatuses parcial reflete quais checks aparecem desmarcados", () => {
      render(
        <ProgramList
          {...defaultProps({ selectedStatuses: ["rascunho", "ativo"] })}
        />,
      );

      expect(screen.getByRole("checkbox", { name: /rascunho/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /(^|\s)ativo/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /inativo/i })).not.toBeChecked();
    });
  });

  describe("ações por status (criterio 3)", () => {
    it("rascunho oferece editar, ativar e excluir — cada um dispara seu callback com o item", () => {
      const item = makeProgram({ status: "rascunho" });
      const onEdit = vi.fn();
      const onActivateReactivate = vi.fn();
      const onDelete = vi.fn();
      render(
        <ProgramList
          {...defaultProps({
            items: [item],
            onEdit,
            onActivateReactivate,
            onDelete,
          })}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /editar/i }));
      expect(onEdit).toHaveBeenCalledWith(item);

      // \b evita casar com "Reativar" ("ativar" é substring de "reativar").
      fireEvent.click(screen.getByRole("button", { name: /\bativar\b/i }));
      expect(onActivateReactivate).toHaveBeenCalledWith(item);

      fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
      expect(onDelete).toHaveBeenCalledWith(item);

      expect(screen.queryByRole("button", { name: /reativar/i })).not.toBeInTheDocument();
    });

    it("ativo oferece somente editar (sem excluir, ativar ou reativar)", () => {
      const item = makeProgram({ status: "ativo" });
      const onEdit = vi.fn();
      const onActivateReactivate = vi.fn();
      const onDelete = vi.fn();
      render(
        <ProgramList
          {...defaultProps({
            items: [item],
            onEdit,
            onActivateReactivate,
            onDelete,
          })}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /editar/i }));
      expect(onEdit).toHaveBeenCalledWith(item);

      // "Programa ativo e Programa inativo nunca são exclusíveis" (spec §3).
      expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /\bativar\b/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /reativar/i })).not.toBeInTheDocument();
      expect(onDelete).not.toHaveBeenCalled();
      expect(onActivateReactivate).not.toHaveBeenCalled();
    });

    it("inativo é somente leitura: única ação é reativar (sem editar nem excluir)", () => {
      const item = makeProgram({ status: "inativo" });
      const onEdit = vi.fn();
      const onActivateReactivate = vi.fn();
      const onDelete = vi.fn();
      render(
        <ProgramList
          {...defaultProps({
            items: [item],
            onEdit,
            onActivateReactivate,
            onDelete,
          })}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /reativar/i }));
      expect(onActivateReactivate).toHaveBeenCalledWith(item);

      // "Inativo é somente leitura ... a única ação possível é reativá-lo" (spec §3).
      expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
      expect(onEdit).not.toHaveBeenCalled();
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("lista mista mostra exatamente as ações permitidas por cada status", () => {
      const rascunho = makeProgram({ id: "p1", title: "Ficha Rascunho", status: "rascunho" });
      const ativo = makeProgram({ id: "p2", title: "Ficha Ativa", status: "ativo" });
      const inativo = makeProgram({ id: "p3", title: "Ficha Antiga", status: "inativo" });
      render(
        <ProgramList {...defaultProps({ items: [rascunho, ativo, inativo] })} />,
      );

      expect(screen.getAllByRole("button", { name: /editar/i })).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: /\bativar\b/i })).toHaveLength(1);
      expect(screen.getAllByRole("button", { name: /reativar/i })).toHaveLength(1);
      expect(screen.getAllByRole("button", { name: /excluir/i })).toHaveLength(1);
    });
  });

  describe("estados loading/error/empty/noResults (criterio 4)", () => {
    it("loading mostra o indicador de carregamento", () => {
      render(<ProgramList {...defaultProps({ loading: true, items: [] })} />);

      expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    });

    it("error mostra a mensagem e o tentar-novamente dispara onRetry", () => {
      const onRetry = vi.fn();
      render(
        <ProgramList
          {...defaultProps({ error: "Erro ao carregar programas", items: [], onRetry })}
        />,
      );

      expect(screen.getByText(/erro ao carregar programas/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("empty orienta a criar o primeiro programa, sem erro nem orientação de filtros", () => {
      render(<ProgramList {...defaultProps({ items: [], empty: true })} />);

      expect(screen.getByText(/primeiro programa/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/ajust/i)).not.toBeInTheDocument();
    });

    it("noResults orienta a ajustar os filtros, distinto da mensagem de vazio", () => {
      render(<ProgramList {...defaultProps({ items: [], noResults: true })} />);

      expect(screen.getByText(/ajust/i)).toBeInTheDocument();
      expect(screen.queryByText(/primeiro programa/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
    });
  });
});
