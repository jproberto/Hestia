import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { useState } from "react";
import ProgramsPage from "@/app/milon/programs/page";
import { usePrograms } from "@/lib/milon/hooks/usePrograms";
import type {
  ProgramConfirmAction,
  ProgramConfirmState,
} from "@/lib/milon/hooks/usePrograms";
import type { Program, ProgramErrorOrigin, ProgramStatus } from "@/lib/milon/types";

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
 *
 * ---------------------------------------------------------------------------
 * Patch v4 — contratos RED da TASK-024 (spec.md Q4 CA-P3-13…19; plan.md
 * "Aditivo - Patch v4" §3 "Página de lista" + §4 data flow 2/3/5/6 + §5
 * "O modal fecha em qualquer terminal da confirmação"):
 * - CA-P3-13 / CA-P3-16: bloqueio da guarda → `handleConfirm` fecha a
 *   confirmação (sem backdrop `z-50` cobrindo a página), mensagem no banner do
 *   corpo e **sem** "Tentar novamente" (exclusivo da origem `carga`);
 * - CA-P3-14: falha de operação (repositório rejeita) em ativar/reativar/
 *   excluir → mesmo terminal: modal fecha, banner sem retry;
 * - CA-P3-15: falha de carga → banner **com** "Tentar novamente" que dispara
 *   o retry da lista (a página repassa `errorOrigin` do hook ao `ProgramList`);
 * - CA-P3-18: criação salva → `router.push('/milon/programs/<id>')` com o
 *   `Program` devolvido por `save()`;
 * - CA-P3-19: edição salva → **nenhuma** navegação (permanece na lista).
 *
 * `next/navigation` é mockado no padrão das páginas do repo (`useRouter.push`
 * espionado). Em produção o `useRouter` só entra na página na TASK-025 — por
 * isso CA-P3-18 é RED e CA-P3-19 nasce como trava de regressão.
 */

vi.mock("@/lib/milon/hooks/usePrograms", () => ({ usePrograms: vi.fn() }));

// Espião único de navegação: `push` compartilhado entre os renders do mock.
const mockPush = vi.hoisted(() => vi.fn());
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({
  push: mockPush,
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
})));
const mockUsePathname = vi.hoisted(() => vi.fn(() => "/milon/programs"));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useRouter: mockUseRouter,
  useSearchParams: vi.fn(() => ({ get: vi.fn() })),
}));

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
  // Canal de origem (Patch v4 / TASK-023): a página repassa ao ProgramList —
  // decide se o banner tem "Tentar novamente" (só `carga`).
  errorOrigin: ProgramErrorOrigin | null;
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
    errorOrigin: null,
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

/** Títulos do ProgramConfirmModal (`components/milon/ProgramConfirmModal.tsx`). */
const TITULO_CONFIRM: Record<ProgramConfirmAction, string> = {
  ativar: "Ativar programa",
  reativar: "Reativar programa",
  excluir: "Excluir programa",
};

/**
 * Aciona a ação pela linha da lista e confirma dentro do ProgramConfirmModal
 * (escopo do heading, mesmo caminho de uma pessoa usando a tela).
 */
async function runConfirm(action: ProgramConfirmAction): Promise<void> {
  await clickConnectedButton(new RegExp(`^${action}$`, "i"));
  const heading = await screen.findByRole("heading", { name: TITULO_CONFIRM[action] });
  fireEvent.click(
    within(scopeOf(heading)).getByRole("button", { name: new RegExp(`^${action}$`, "i") }),
  );
}

/**
 * CA-P3-16: a confirmação não permanece aberta — some o heading **e** o
 * backdrop fixo `z-50` (que deixaria a mensagem atrás do overlay; cenário 5
 * da homologação).
 */
async function expectConfirmClosed(action: ProgramConfirmAction): Promise<void> {
  await waitFor(() => {
    expect(
      screen.queryByRole("heading", { name: TITULO_CONFIRM[action] }),
    ).not.toBeInTheDocument();
  });
  expect(document.querySelector(".fixed.inset-0.z-50")).toBeNull();
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

  /**
   * Patch v4 — terminais de `handleConfirm` e navegação pós-salvar
   * (spec.md Q4 CA-P3-13…19; plan.md §3 "Página de lista", §4 itens 2/3/5/6
   * e §5 "O modal fecha em qualquer terminal da confirmação").
   *
   * Cada operação que falha **emula o contrato do hook** (plan.md §3 "Hook
   * usePrograms"): grava `errorMsg` + `errorOrigin` no state devolvido pelo
   * mock e relança — o re-render de fim de `handleConfirm`
   * (`setProcessing(false)`) revela a mensagem no banner do corpo. O que se
   * testa aqui é a decisão da **página**: fechar (ou não) a confirmação e
   * navegar (ou não) após salvar.
   */
  describe("Patch v4 — terminais da confirmação e navegação pós-salvar (TASK-024)", () => {
    const MENSAGEM_BLOQUEIO = "Adicione pelo menos um treino com exercícios para ativar";
    const MENSAGEM_FALHA_ATIVAR = "Erro ao atualizar programa";
    const MENSAGEM_FALHA_EXCLUIR = "Erro ao excluir programa";

    it("CA-P3-13 + CA-P3-16: bloqueio da guarda na ativação fecha a confirmação e mostra banner sem retry", async () => {
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
      // Guarda de ativação: o hook grava origem `bloqueio` e relança
      // (lib/milon/hooks/usePrograms.ts — runActivation).
      state.activate.mockImplementation(async () => {
        state.errorMsg = MENSAGEM_BLOQUEIO;
        state.errorOrigin = "bloqueio";
        throw new Error(MENSAGEM_BLOQUEIO);
      });

      render(<ProgramsPage />);
      await runConfirm("ativar");
      await waitFor(() => expect(state.activate).toHaveBeenCalledTimes(1));

      // CA-P3-16: nenhuma confirmação permanece aberta (sem backdrop z-50)…
      await expectConfirmClosed("ativar");
      // …a mensagem do bloqueio está legível no corpo da página…
      expect(screen.getByText(MENSAGEM_BLOQUEIO)).toBeInTheDocument();
      // …e o banner não tem "Tentar novamente" (exclusivo da origem `carga`).
      expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
      // CA-P3-13: o status do Programa não muda (a página não mexe na lista).
      expect(state.programs).toHaveLength(1);
      expect(state.programs[0]).toMatchObject({ id: "prog-1", status: "rascunho" });
    });

    it("CA-P3-14: falha de operação ao ativar fecha a confirmação e mostra banner sem retry", async () => {
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
      // Falha de repositório (ex.: rede) — origem `operacao`.
      state.activate.mockImplementation(async () => {
        state.errorMsg = MENSAGEM_FALHA_ATIVAR;
        state.errorOrigin = "operacao";
        throw new Error(MENSAGEM_FALHA_ATIVAR);
      });

      render(<ProgramsPage />);
      await runConfirm("ativar");
      await waitFor(() => expect(state.activate).toHaveBeenCalledTimes(1));

      await expectConfirmClosed("ativar");
      expect(screen.getByText(MENSAGEM_FALHA_ATIVAR)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
      // Lista mantém o status anterior.
      expect(state.programs[0]).toMatchObject({ id: "prog-1", status: "rascunho" });
    });

    it("CA-P3-14: falha de operação ao reativar fecha a confirmação e mostra banner sem retry", async () => {
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
      state.reactivate.mockImplementation(async () => {
        state.errorMsg = MENSAGEM_FALHA_ATIVAR;
        state.errorOrigin = "operacao";
        throw new Error(MENSAGEM_FALHA_ATIVAR);
      });

      render(<ProgramsPage />);
      await runConfirm("reativar");
      await waitFor(() => expect(state.reactivate).toHaveBeenCalledTimes(1));

      await expectConfirmClosed("reativar");
      expect(screen.getByText(MENSAGEM_FALHA_ATIVAR)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
      expect(state.programs[0]).toMatchObject({ id: "prog-3", status: "inativo" });
    });

    it("CA-P3-14: falha de operação ao excluir fecha a confirmação e mostra banner sem retry", async () => {
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
      state.remove.mockImplementation(async () => {
        state.errorMsg = MENSAGEM_FALHA_EXCLUIR;
        state.errorOrigin = "operacao";
        throw new Error(MENSAGEM_FALHA_EXCLUIR);
      });

      render(<ProgramsPage />);
      await runConfirm("excluir");
      await waitFor(() => expect(state.remove).toHaveBeenCalledTimes(1));

      await expectConfirmClosed("excluir");
      expect(screen.getByText(MENSAGEM_FALHA_EXCLUIR)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
      // Nada foi excluído: a lista do hook preserva o item.
      expect(state.programs).toHaveLength(1);
      expect(state.programs[0]).toMatchObject({ id: "prog-1", status: "rascunho" });
    });

    it("terminal de sucesso: exclusão de rascunho confirmada fecha a confirmação", async () => {
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
      await runConfirm("excluir");
      await waitFor(() => expect(state.remove).toHaveBeenCalledTimes(1));

      await expectConfirmClosed("excluir");
      expect(state.errorMsg).toBeNull();
      expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
    });

    it("CA-P3-15: erro de carga exibe 'Tentar novamente' e o acionamento recarrega a lista", async () => {
      const state = setupHook({
        errorMsg: "Erro ao carregar programas",
        errorOrigin: "carga",
      });

      render(<ProgramsPage />);

      expect(screen.getByText(/erro ao carregar programas/i)).toBeInTheDocument();
      await clickConnectedButton(/tentar novamente/i);
      expect(state.retry).toHaveBeenCalledTimes(1);
      // Retry exclusivo desta origem — operação/bloqueio não o têm (testes acima).
      expect(state.errorOrigin).toBe("carga");
    });

    it("CA-P3-18: salvar um programa novo navega para /milon/programs/<id> do programa criado", async () => {
      const state = setupHook({ programs: [], filteredPrograms: [] });
      // `save()` devolve o Program criado (plan.md §3 — contrato inalterado).
      state.save.mockResolvedValue(
        makeProgram({ id: "prog-criado-42", title: "Ficha Monstro 2026" }),
      );

      render(<ProgramsPage />);

      await clickConnectedButton(/^(novo|criar)(\s+programa)?$/i);
      const input = await screen.findByLabelText("Título");
      fireEvent.change(input, { target: { value: "Ficha Monstro 2026" } });
      await clickConnectedButton(/^salvar$/i);

      await waitFor(() => expect(state.save).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
      expect(mockPush).toHaveBeenCalledWith("/milon/programs/prog-criado-42");
      // A criação também sai do modal — a pessoa termina no detalhe.
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Novo programa" })).not.toBeInTheDocument();
      });
    });

    it("CA-P3-19: salvar a edição permanece na lista — nenhuma navegação e modal fecha", async () => {
      const item = makeProgram({
        id: "prog-1",
        title: "Ficha Verão 2026",
        status: "rascunho",
      });
      const state = setupHook({
        programs: [item],
        filteredPrograms: [item],
        ownerFilter: DONOS[0],
      });

      render(<ProgramsPage />);

      await clickConnectedButton(/^editar$/i);
      const input = await screen.findByLabelText("Título");
      fireEvent.change(input, { target: { value: "Ficha Verão 2026 Editada" } });
      await clickConnectedButton(/^salvar$/i);

      await waitFor(() => expect(state.save).toHaveBeenCalledTimes(1));
      expect(savedTitleArg(state)).toBe("Ficha Verão 2026 Editada");
      expect(state.save.mock.calls[0][1]).toBe("prog-1");
      // Permanece em /milon/programs: nenhuma navegação…
      expect(mockPush).not.toHaveBeenCalled();
      // …e o modal de edição fecha.
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Editar programa" })).not.toBeInTheDocument();
      });
    });
  });
});
