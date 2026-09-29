import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { useState } from "react";
import ProgramsPage from "@/app/milon/programs/page";
import { usePrograms } from "@/lib/milon/hooks/usePrograms";
import type {
  ProgramConfirmAction,
  ProgramConfirmState,
} from "@/lib/milon/hooks/usePrograms";
import type { Program, ProgramStatus } from "@/lib/milon/types";

/**
 * Contrato — tasks.json TASK-010 (acceptanceCriteria) + spec.md §3
 * ("Tela própria de Programas com filtros", "Confirmação em ações de
 * consequência", "Exclusão de rascunho") + plan.md §3 "Página" e §4
 * "Data Flow".
 *
 * Página enxuta em MilonLayout: composição de ProgramList, ProgramModal e
 * ProgramConfirmModal ligados ao hook `usePrograms` (fetch, filtros, estado e
 * operações vivem no hook; a página só compõe e faz o wiring).
 *
 * Cenários (um por acceptanceCriterion / ponto de cobertura da task):
 * 1. Renderização inicial: MilonLayout + título de tela + lista filtrada do
 *    hook + estados de fetch (loading, empty, noResults).
 * 2. Criação: a ação de criar abre ProgramModal com `suggestion` sorteada por
 *    `sortearSugestao()`; confirmar grava via hook.
 * 3. Edição: abre ProgramModal com os dados do item e salva com o id.
 * 4. Ativar/reativar/excluir: abrem ProgramConfirmModal com action/title/owner
 *    corretos por item/status; nada executa antes da confirmação.
 * 5. Filtros: select de dono e checks de status refletem no hook.
 * 6. Erro de carregamento mostra retry que dispara o hook.
 *
 * O hook é mockado com factories de defaults (padrão das páginas do módulo).
 * Dentro da implementação do mock o estado de confirmação é mantido com
 * `useState` real: assim a abertura do ProgramConfirmModal é observável
 * comportamentalmente tanto quando a página consome
 * `confirmAction`/`requestConfirm` do hook (plan.md §3 "Confirmação antes de
 * ativar/reativar/excluir via estado ... no hook") quanto quando a página
 * guarda o alvo da confirmação localmente.
 */

vi.mock("@/lib/milon/hooks/usePrograms", () => ({ usePrograms: vi.fn() }));

// Valor único devolvido pelo sorteio mockado — assertions provêm que o título
// pré-preenchido no ProgramModal vem de `sortearSugestao()`, de onde quer que
// a página (ou o hook) chame a função.
const SUGESTAO_SORTEADA = vi.hoisted(() => "Sugestão Maromba Teste");

// Sorteio mockado no origem; demais utilitários (validarTitulo,
// normalizarTitulo, transições) seguem reais.
vi.mock("@/lib/milon/program-utils", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/milon/program-utils")>();
  return {
    ...original,
    sortearSugestao: vi.fn(() => SUGESTAO_SORTEADA),
  };
});

const mockedUsePrograms = usePrograms as Mock;

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

interface HookState {
  programs: Program[];
  filteredPrograms: Program[];
  ownerFilter: string;
  statusFilters: ProgramStatus[];
  loading: boolean;
  errorMsg: string | null;
  confirmAction: ProgramConfirmState | null;
  setOwnerFilter: Mock;
  toggleStatusFilter: Mock;
  reload: Mock;
  retry: Mock;
  refetch: Mock;
  save: Mock;
  activate: Mock;
  reactivate: Mock;
  remove: Mock;
  requestConfirm: Mock;
  cancelConfirm: Mock;
  confirm: Mock;
}

function defaultHookState(): HookState {
  return {
    programs: [],
    filteredPrograms: [],
    ownerFilter: "",
    statusFilters: [...TODOS_STATUS],
    loading: false,
    errorMsg: null,
    confirmAction: null,
    setOwnerFilter: vi.fn(),
    toggleStatusFilter: vi.fn(),
    reload: vi.fn(async () => {}),
    retry: vi.fn(async () => {}),
    refetch: vi.fn(async () => {}),
    save: vi.fn(async (input: unknown) => makeProgram({ title: String(input) })),
    activate: vi.fn(async () => {}),
    reactivate: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    requestConfirm: vi.fn(),
    cancelConfirm: vi.fn(),
    confirm: vi.fn(async () => {}),
  };
}

function setupHook(overrides: Partial<HookState> = {}): HookState {
  const state: HookState = { ...defaultHookState(), ...overrides };

  // Nome `use*` preserva as regras de hooks do ESLint; `useState` real dentro
  // do mock faz o `confirmAction` circular (página → hook → re-render).
  mockedUsePrograms.mockImplementation(function useProgramsMock() {
    const [confirmAction, setConfirmAction] = useState<ProgramConfirmState | null>(
      state.confirmAction,
    );
    return {
      ...state,
      confirmAction,
      requestConfirm: (action: ProgramConfirmAction, program: Program) => {
        state.requestConfirm(action, program);
        setConfirmAction({ action, program });
      },
      cancelConfirm: () => {
        state.cancelConfirm();
        setConfirmAction(null);
      },
    };
  });

  return state;
}

/**
 * Clica num botão somente quando ele está conectado ao documento.
 * O hook refaz fetch após salvar/excluir e cada commit pode substituir os
 * nós — clicar num nó destacado é no-op silencioso.
 */
async function clickConnectedButton(name: RegExp) {
  await waitFor(() => {
    expect(screen.getByRole("button", { name }).isConnected).toBe(true);
  });
  fireEvent.click(screen.getByRole("button", { name }));
}

/** Container do modal: o heading (h2) é filho direto do card do diálogo. */
function scopeOf(heading: HTMLElement): HTMLElement {
  const container = heading.parentElement;
  if (!container) {
    throw new Error(`Heading "${heading.textContent ?? ""}" sem container pai`);
  }
  return container;
}

/** Título enviado ao hook em `save` (string ou objeto { title }). */
function savedTitleArg(state: HookState): unknown {
  const first = state.save.mock.calls[0]?.[0];
  return typeof first === "string" ? first : (first as { title?: string })?.title;
}

describe("Página /milon/programs — Programas (Mílon #2, TASK-010)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renderização inicial: MilonLayout, título de tela e lista filtrada do hook", async () => {
    const ana = makeProgram({
      id: "prog-1",
      title: "Ficha Verão 2026",
      owner: DONOS[0],
      status: "rascunho",
    });
    const bia = makeProgram({
      id: "prog-2",
      title: "Ficha Maromba Total",
      owner: DONOS[1],
      status: "ativo",
    });
    setupHook({
      programs: [ana, bia],
      filteredPrograms: [ana],
      ownerFilter: DONOS[0],
    });

    render(<ProgramsPage />);

    // MilonLayout (nome do módulo) + título da tela via pageTitle (h1 novo
    // além do h1 do nome do módulo) — "MilonLayout com título font-display".
    expect(screen.getByText("Mílon")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBeGreaterThanOrEqual(2);

    // Seção da lista com título de conteúdo no token font-display.
    const secao = screen.getByRole("heading", { level: 2, name: /programas/i });
    expect(secao.className).toMatch(/font-display/);

    // Lista = filtrados do hook (a lista bruta não vaza para a tela).
    expect(screen.getByText("Ficha Verão 2026")).toBeInTheDocument();
    expect(screen.queryByText("Ficha Maromba Total")).not.toBeInTheDocument();

    // Select de dono: reflete ownerFilter e oferece as opções da família.
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue(DONOS[0]);
    const valores = within(select)
      .getAllByRole("option")
      .map((option) => option.getAttribute("value"));
    expect(valores).toEqual(expect.arrayContaining([DONOS[0], DONOS[1], ""]));
  });

  it("estado de fetch: carregando exibe o indicador da lista", () => {
    setupHook({ loading: true });

    render(<ProgramsPage />);

    expect(screen.getByText(/carregando programas/i)).toBeInTheDocument();
    expect(screen.queryByText("Ficha Verão 2026")).not.toBeInTheDocument();
  });

  it("estado de fetch: sem programas orienta a criar o primeiro, sem erro", () => {
    setupHook({ programs: [], filteredPrograms: [] });

    render(<ProgramsPage />);

    expect(screen.getByText(/primeiro programa/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it("estado de fetch: programas fora dos filtros orienta a ajustar os filtros", () => {
    setupHook({
      programs: [makeProgram()],
      filteredPrograms: [],
      ownerFilter: DONOS[0],
    });

    render(<ProgramsPage />);

    expect(screen.getByText(/ajust/i)).toBeInTheDocument();
    expect(screen.queryByText(/primeiro programa/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it("erro de carregamento mostra retry que dispara o hook", async () => {
    const state = setupHook({ errorMsg: "Falha ao carregar" });

    render(<ProgramsPage />);

    expect(screen.getByText(/falha ao carregar/i)).toBeInTheDocument();
    await clickConnectedButton(/tentar novamente/i);
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it("criar: abre ProgramModal com suggestion de sortearSugestao e grava via hook", async () => {
    const state = setupHook({ programs: [], filteredPrograms: [] });

    render(<ProgramsPage />);

    await clickConnectedButton(/^(novo|criar)(\s+programa)?$/i);

    const modal = await screen.findByRole("heading", { name: "Novo programa" });
    expect(modal).toBeInTheDocument();
    // Pré-preenchimento vem do sorteio (não de literal da página).
    expect(screen.getByLabelText("Título")).toHaveValue(SUGESTAO_SORTEADA);

    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Ficha Monstro 2026" },
    });
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() => {
      expect(state.save).toHaveBeenCalledTimes(1);
    });
    expect(state.save.mock.calls[0][0]).toBe("Ficha Monstro 2026");
    // Salvar fecha o modal (plan.md §4 "fecha o modal").
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Novo programa" })).not.toBeInTheDocument();
    });
  });

  it("editar: abre ProgramModal com os dados do item e salva com o id", async () => {
    const item = makeProgram({ id: "prog-1", title: "Ficha Verão 2026", status: "rascunho" });
    const state = setupHook({ programs: [item], filteredPrograms: [item], ownerFilter: DONOS[0] });

    render(<ProgramsPage />);

    await clickConnectedButton(/^editar$/i);

    await screen.findByRole("heading", { name: "Editar programa" });
    // Valor do item (diferente da sugestão de criação).
    expect(screen.getByLabelText("Título")).toHaveValue("Ficha Verão 2026");

    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Ficha Verão 2026 Editada" },
    });
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() => {
      expect(state.save).toHaveBeenCalledTimes(1);
    });
    expect(savedTitleArg(state)).toBe("Ficha Verão 2026 Editada");
    expect(state.save.mock.calls[0][1]).toBe("prog-1");
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Editar programa" })).not.toBeInTheDocument();
    });
  });

  it("ativar: rascunho abre ProgramConfirmModal com ação/título/dono e só executa na confirmação", async () => {
    const rascunho = makeProgram({
      id: "prog-1",
      title: "Ficha Verão 2026",
      owner: DONOS[0],
      status: "rascunho",
    });
    const state = setupHook({
      programs: [rascunho],
      filteredPrograms: [rascunho],
      ownerFilter: DONOS[0],
    });

    render(<ProgramsPage />);

    await clickConnectedButton(/^ativar$/i);

    const modal = await screen.findByRole("heading", { name: "Ativar programa" });
    const scope = within(scopeOf(modal));
    expect(scope.getByText("Ficha Verão 2026")).toBeInTheDocument();
    expect(scope.getByText(DONOS[0])).toBeInTheDocument();
    expect(scope.getByRole("button", { name: /^ativar$/i })).toBeInTheDocument();

    // Confirmação explícita: nada executa antes de confirmar.
    expect(state.activate).not.toHaveBeenCalled();
    expect(state.confirm).not.toHaveBeenCalled();
    expect(state.remove).not.toHaveBeenCalled();

    fireEvent.click(scope.getByRole("button", { name: /^ativar$/i }));

    await waitFor(() => {
      expect(state.confirm.mock.calls.length + state.activate.mock.calls.length).toBeGreaterThan(0);
    });
    expect(state.remove).not.toHaveBeenCalled();
  });

  it("reativar: inativo é somente leitura e abre ProgramConfirmModal com ação/título/dono", async () => {
    const inativo = makeProgram({
      id: "prog-3",
      title: "Ficha Antiga",
      owner: DONOS[1],
      status: "inativo",
    });
    const state = setupHook({
      programs: [inativo],
      filteredPrograms: [inativo],
      ownerFilter: DONOS[1],
    });

    render(<ProgramsPage />);

    // Inativo: única ação possível é reativar (spec §3 "Edição por status").
    expect(screen.queryByRole("button", { name: /^editar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^excluir$/i })).not.toBeInTheDocument();

    await clickConnectedButton(/^reativar$/i);

    const modal = await screen.findByRole("heading", { name: "Reativar programa" });
    const scope = within(scopeOf(modal));
    expect(scope.getByText("Ficha Antiga")).toBeInTheDocument();
    expect(scope.getByText(DONOS[1])).toBeInTheDocument();
    expect(scope.getByRole("button", { name: /^reativar$/i })).toBeInTheDocument();

    expect(state.reactivate).not.toHaveBeenCalled();
    expect(state.confirm).not.toHaveBeenCalled();
    expect(state.remove).not.toHaveBeenCalled();

    fireEvent.click(scope.getByRole("button", { name: /^reativar$/i }));

    await waitFor(() => {
      expect(state.confirm.mock.calls.length + state.reactivate.mock.calls.length).toBeGreaterThan(0);
    });
    expect(state.remove).not.toHaveBeenCalled();
  });

  it("excluir: só o rascunho tem a ação e abre ProgramConfirmModal com ação/título/dono", async () => {
    const rascunho = makeProgram({
      id: "prog-1",
      title: "Ficha Verão 2026",
      owner: DONOS[0],
      status: "rascunho",
    });
    const ativo = makeProgram({
      id: "prog-2",
      title: "Ficha Maromba Total",
      owner: DONOS[0],
      status: "ativo",
    });
    const inativo = makeProgram({
      id: "prog-3",
      title: "Ficha Antiga",
      owner: DONOS[1],
      status: "inativo",
    });
    const state = setupHook({
      programs: [rascunho, ativo, inativo],
      filteredPrograms: [rascunho, ativo, inativo],
      ownerFilter: "",
    });

    render(<ProgramsPage />);

    // Ativo e inativo nunca são exclusíveis (spec §3 "Exclusão de rascunho").
    expect(screen.getAllByRole("button", { name: /^excluir$/i })).toHaveLength(1);

    await clickConnectedButton(/^excluir$/i);

    const modal = await screen.findByRole("heading", { name: "Excluir programa" });
    const scope = within(scopeOf(modal));
    expect(scope.getByText("Ficha Verão 2026")).toBeInTheDocument();
    expect(scope.getByText(DONOS[0])).toBeInTheDocument();
    expect(scope.getByRole("button", { name: /^excluir$/i })).toBeInTheDocument();

    expect(state.remove).not.toHaveBeenCalled();
    expect(state.confirm).not.toHaveBeenCalled();

    fireEvent.click(scope.getByRole("button", { name: /^excluir$/i }));

    await waitFor(() => {
      expect(state.confirm.mock.calls.length + state.remove.mock.calls.length).toBeGreaterThan(0);
    });
    expect(state.activate).not.toHaveBeenCalled();
    expect(state.reactivate).not.toHaveBeenCalled();
  });

  it("cancelar fecha o modal sem salvar", async () => {
    const state = setupHook({ programs: [], filteredPrograms: [] });

    render(<ProgramsPage />);

    await clickConnectedButton(/^(novo|criar)(\s+programa)?$/i);
    await screen.findByRole("heading", { name: "Novo programa" });
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Rascunho descartável" },
    });

    await clickConnectedButton(/^cancelar$/i);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Novo programa" }),
      ).not.toBeInTheDocument();
    });
    expect(state.save).not.toHaveBeenCalled();
  });

  it("erro de save mantém o modal aberto com a mensagem visível e o digitado preservado", async () => {
    const state = setupHook({ programs: [], filteredPrograms: [] });
    state.save.mockRejectedValue(new Error("título já usado em outro programa"));

    render(<ProgramsPage />);

    await clickConnectedButton(/^(novo|criar)(\s+programa)?$/i);
    const input = await screen.findByLabelText("Título");
    fireEvent.change(input, { target: { value: "Ficha Duplicada" } });
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() => expect(state.save).toHaveBeenCalledTimes(1));

    // Nunca fecha no erro (spec §3 "Confirmação em ações de consequência").
    expect(await screen.findByRole("heading", { name: "Novo programa" })).toBeInTheDocument();
    expect(screen.getByText(/título já usado em outro programa/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("Ficha Duplicada");
  });

  it("erro de save sem formato de Error vira a mensagem padrão no modal", async () => {
    const state = setupHook({ programs: [], filteredPrograms: [] });
    state.save.mockRejectedValue("falha crua do driver");

    render(<ProgramsPage />);

    await clickConnectedButton(/^(novo|criar)(\s+programa)?$/i);
    const input = await screen.findByLabelText("Título");
    fireEvent.change(input, { target: { value: "Ficha Qualquer" } });
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() => expect(state.save).toHaveBeenCalledTimes(1));

    expect(await screen.findByRole("heading", { name: "Novo programa" })).toBeInTheDocument();
    expect(screen.getByText(/erro ao salvar programa/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("Ficha Qualquer");
  });

  it("falha do hook ao pedir a ativação não impede a abertura do modal local", async () => {
    const rascunho = makeProgram({ id: "prog-1", status: "rascunho" });
    const state = setupHook({
      programs: [rascunho],
      filteredPrograms: [rascunho],
      ownerFilter: DONOS[0],
    });
    state.requestConfirm.mockImplementation(() => {
      throw new Error("hook indisponível");
    });

    render(<ProgramsPage />);

    await clickConnectedButton(/^ativar$/i);

    expect(await screen.findByRole("heading", { name: "Ativar programa" })).toBeInTheDocument();
    expect(state.activate).not.toHaveBeenCalled();
    expect(state.confirm).not.toHaveBeenCalled();
  });

  it("falha do hook ao pedir a exclusão não impede a abertura do modal local", async () => {
    const rascunho = makeProgram({ id: "prog-1", status: "rascunho" });
    const state = setupHook({
      programs: [rascunho],
      filteredPrograms: [rascunho],
      ownerFilter: DONOS[0],
    });
    state.requestConfirm.mockImplementation(() => {
      throw new Error("hook indisponível");
    });

    render(<ProgramsPage />);

    await clickConnectedButton(/^excluir$/i);

    expect(await screen.findByRole("heading", { name: "Excluir programa" })).toBeInTheDocument();
    expect(state.remove).not.toHaveBeenCalled();
    expect(state.confirm).not.toHaveBeenCalled();
  });

  it("confirmação originada só no hook confirma pelo ramo sem alvo local", async () => {
    const rascunho = makeProgram({ id: "prog-9", status: "rascunho" });
    const state = setupHook({
      programs: [rascunho],
      filteredPrograms: [rascunho],
      ownerFilter: DONOS[0],
      confirmAction: { action: "ativar", program: rascunho },
    });

    render(<ProgramsPage />);

    const modal = await screen.findByRole("heading", { name: "Ativar programa" });
    const scope = within(scopeOf(modal));
    expect(state.confirm).not.toHaveBeenCalled();

    fireEvent.click(scope.getByRole("button", { name: /^ativar$/i }));

    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.activate).not.toHaveBeenCalled();
    expect(state.remove).not.toHaveBeenCalled();
  });

  it("cancelar a confirmação vinda do hook não executa nada e fecha o modal", async () => {
    const rascunho = makeProgram({ id: "prog-9", status: "rascunho" });
    const state = setupHook({
      programs: [rascunho],
      filteredPrograms: [rascunho],
      ownerFilter: DONOS[0],
      confirmAction: { action: "excluir", program: rascunho },
    });

    render(<ProgramsPage />);

    const modal = await screen.findByRole("heading", { name: "Excluir programa" });
    const scope = within(scopeOf(modal));

    fireEvent.click(scope.getByRole("button", { name: /^cancelar$/i }));

    await waitFor(() => expect(state.cancelConfirm).toHaveBeenCalledTimes(1));
    expect(state.remove).not.toHaveBeenCalled();
    expect(state.confirm).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Excluir programa" }),
      ).not.toBeInTheDocument();
    });
  });

  it("filtros: select de dono e checks de status refletem no hook", async () => {
    const ana = makeProgram({
      id: "prog-1",
      title: "Ficha Verão 2026",
      owner: DONOS[0],
      status: "rascunho",
    });
    const bia = makeProgram({
      id: "prog-2",
      title: "Ficha Maromba Total",
      owner: DONOS[1],
      status: "ativo",
    });
    const state = setupHook({
      programs: [ana, bia],
      filteredPrograms: [ana],
      ownerFilter: DONOS[0],
      statusFilters: ["rascunho", "ativo"],
    });

    render(<ProgramsPage />);

    const select = await screen.findByRole("combobox");
    expect(select).toHaveValue(DONOS[0]);

    fireEvent.change(select, { target: { value: DONOS[1] } });
    expect(state.setOwnerFilter).toHaveBeenCalledWith(DONOS[1]);

    // Checks refletem os statusFilters vindos do hook…
    expect(screen.getByRole("checkbox", { name: /^rascunho$/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^ativo$/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^inativo$/i })).not.toBeChecked();

    // …e a troca delega ao hook.
    fireEvent.click(screen.getByRole("checkbox", { name: /^inativo$/i }));
    expect(state.toggleStatusFilter).toHaveBeenCalledWith("inativo");
  });
});
