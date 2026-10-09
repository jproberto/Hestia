import fs from "node:fs";
import path from "node:path";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import ExercisesPage from "@/app/milon/exercises/page";
import { useExercises } from "@/lib/milon/hooks/useExercises";
import type { Exercise } from "@/lib/milon/types";

/**
 * Contrato — TASK-013 + TASK-017 (spec.md Patch v3 §P3 R1 / §P4 CA-P3-02):
 * a biblioteca de exercícios passa a ser servida em `/milon/exercises` com o
 * MESMO conteúdo, `pageTitle` "Biblioteca de exercícios" e as mesmas
 * funcionalidades homologadas da spec v2 — muda apenas a URL.
 *
 * Espelho de `__tests__/app/milon/page.test.tsx` (ciclo v1): mesmos mocks do
 * `useExercises`, mesmos ~14 cenários — sem comportamento novo. A única
 * diferença é o módulo sob teste (`@/app/milon/exercises/page`).
 */

vi.mock("@/lib/milon/hooks/useExercises", () => ({
  useExercises: vi.fn(),
}));

const mockedUseExercises = useExercises as Mock;

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    name: "Supino reto",
    muscle: "Peito",
    videoLink: null,
    loadUnit: null,
    deletedAt: null,
    createdAt: "2026-09-12T00:00:00Z",
    created_by: "a@hestia.com",
    ...overrides,
  };
}

function defaultHookState(overrides: Record<string, unknown> = {}) {
  return {
    exercises: [],
    filteredExercises: [],
    visibleExercises: [],
    remainingCount: 0,
    muscleOptions: [],
    muscleFilter: "",
    searchText: "",
    visibleCount: 20,
    loading: false,
    error: null as string | null,
    // Canal de origem (Patch v5 / TASK-039): a página repassa ao ExerciseList —
    // decide se o banner tem "Tentar novamente" (só `carga`; `operacao` não).
    errorOrigin: null as "carga" | "operacao" | "bloqueio" | null,
    successNotice: null as string | null,
    setMuscleFilter: vi.fn(),
    setSearchText: vi.fn(),
    showMore: vi.fn(),
    clearFilters: vi.fn(),
    reload: vi.fn(async () => {}),
    retry: vi.fn(async () => {}),
    refetch: vi.fn(async () => {}),
    save: vi.fn(async () => makeExercise()),
    saveAndNew: vi.fn(async () => makeExercise()),
    remove: vi.fn(async () => {}),
    ...overrides,
  };
}

function setupHook(overrides: Record<string, unknown> = {}) {
  const state = defaultHookState(overrides);
  mockedUseExercises.mockReturnValue(state);
  return state;
}

/**
 * Clica num botão somente quando ele está conectado ao documento.
 * O hook refaz fetch após salvar/excluir e cada commit pode
 * substituir os nós — clicar num nó destacado é no-op silencioso.
 */
async function clickConnectedButton(name: RegExp) {
  await waitFor(() => {
    expect(screen.getByRole("button", { name }).isConnected).toBe(true);
  });
  fireEvent.click(screen.getByRole("button", { name }));
}

function fillModalForm(name = "Agachamento", muscle = "Perna", link = "") {
  fireEvent.change(screen.getByLabelText(/^nome$/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/^músculo$/i), { target: { value: muscle } });
  fireEvent.change(screen.getByLabelText(/link.*vídeo/i), { target: { value: link } });
}

describe("ExercisesPage /milon/exercises - Biblioteca de exercícios (CA-P3-02 / TASK-013)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("abre em MilonLayout com lista, filtro, busca e lotes ligados ao hook", async () => {
    const items = [
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" }),
      makeExercise({ id: "ex-2", name: "Agachamento", muscle: "Perna" }),
    ];
    setupHook({
      exercises: items,
      filteredExercises: items,
      visibleExercises: items,
      muscleOptions: ["Peito", "Perna"],
    });

    render(<ExercisesPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /biblioteca de exercícios/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Mílon")).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por músculo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/buscar exercício/i)).toBeInTheDocument();
    expect(screen.getByText("Supino reto")).toBeInTheDocument();
    expect(screen.getByText("Agachamento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /novo exercício/i })).toBeInTheDocument();
  });

  it("pageTitle 'Biblioteca de exercícios' no token font-display com o subtítulo (TASK-013)", () => {
    setupHook();

    render(<ExercisesPage />);

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Biblioteca de exercícios",
    });
    expect(heading.className).toMatch(/font-display/);
    expect(screen.getByText("Cadastre uma vez e reuse nos treinos")).toBeInTheDocument();
  });

  it("mostra indicador de carregamento enquanto busca", () => {
    setupHook({ loading: true });

    render(<ExercisesPage />);

    expect(screen.getByText(/carregando exercícios/i)).toBeInTheDocument();
  });

  it("mostra erro com tentar-de-novo que dispara retry", async () => {
    const state = setupHook({ error: "Falha ao buscar" });

    render(<ExercisesPage />);

    expect(screen.getByText(/falha ao buscar/i)).toBeInTheDocument();
    await clickConnectedButton(/tentar novamente/i);
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it("biblioteca vazia mostra orientação de criar o primeiro, sem erro", () => {
    setupHook({ exercises: [], visibleExercises: [] });

    render(<ExercisesPage />);

    expect(screen.getByText(/nenhum exercício cadastrado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it("trocar filtro por músculo delega ao hook", async () => {
    const state = setupHook({
      exercises: [makeExercise()],
      visibleExercises: [makeExercise()],
      muscleOptions: ["Peito", "Perna"],
    });

    render(<ExercisesPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/filtrar por músculo/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/filtrar por músculo/i), {
      target: { value: "Perna" },
    });
    expect(state.setMuscleFilter).toHaveBeenCalledWith("Perna");
  });

  it("digitar busca delega ao hook", async () => {
    const state = setupHook({
      exercises: [makeExercise()],
      visibleExercises: [makeExercise()],
      muscleOptions: ["Peito"],
    });

    render(<ExercisesPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/buscar exercício/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/buscar exercício/i), {
      target: { value: "sup" },
    });
    expect(state.setSearchText).toHaveBeenCalledWith("sup");
  });

  it("mostrar-mais delega ao hook", async () => {
    const state = setupHook({
      exercises: [makeExercise()],
      visibleExercises: [makeExercise()],
      remainingCount: 5,
      muscleOptions: ["Peito"],
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/mostrar mais \(5 restantes\)/i);
    expect(state.showMore).toHaveBeenCalledTimes(1);
  });

  it("criar via Salvar fecha o modal e grava na lista", async () => {
    const created = makeExercise({ id: "ex-novo", name: "Rosca direta", muscle: "Braço" });
    const state = setupHook({
      exercises: [],
      visibleExercises: [],
      muscleOptions: [],
      save: vi.fn(async () => created),
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/novo exercício/i);
    expect(screen.getByRole("heading", { name: /novo exercício/i })).toBeInTheDocument();

    fillModalForm("Rosca direta", "Braço");
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() => {
      expect(state.save).toHaveBeenCalledWith(
        {
          name: "Rosca direta",
          muscle: "Braço",
          videoLink: null,
          mode: "repeticao",
          loadUnit: "kg",
        },
        null,
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /novo exercício/i })).not.toBeInTheDocument();
    });
  });

  it("criar via Salvar-e-outro mantém o modal aberto com músculo mantido", async () => {
    const created = makeExercise({ id: "ex-novo", name: "Rosca direta", muscle: "Braço" });
    const state = setupHook({
      exercises: [],
      visibleExercises: [],
      muscleOptions: ["Braço"],
      saveAndNew: vi.fn(async () => created),
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/novo exercício/i);
    fillModalForm("Rosca direta", "Braço");
    await clickConnectedButton(/salvar e incluir outro/i);

    await waitFor(() => {
      expect(state.saveAndNew).toHaveBeenCalledWith({
        name: "Rosca direta",
        muscle: "Braço",
        videoLink: null,
        mode: "repeticao",
        loadUnit: "kg",
      });
    });
    expect(screen.getByRole("heading", { name: /novo exercício/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^músculo$/i)).toHaveValue("Braço");
    expect(screen.getByLabelText(/^nome$/i)).toHaveValue("");
  });

  it("editar abre o modal preenchido a partir da lista e salva com o id", async () => {
    const item = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" });
    const updated = makeExercise({ id: "ex-1", name: "Supino inclinado", muscle: "Peito" });
    const state = setupHook({
      exercises: [item],
      filteredExercises: [item],
      visibleExercises: [item],
      muscleOptions: ["Peito"],
      save: vi.fn(async () => updated),
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/editar supino reto/i);

    expect(screen.getByRole("heading", { name: /editar exercício/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^nome$/i)).toHaveValue("Supino reto");
    expect(screen.getByLabelText(/^músculo$/i)).toHaveValue("Peito");

    fireEvent.change(screen.getByLabelText(/^nome$/i), {
      target: { value: "Supino inclinado" },
    });
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() => {
      expect(state.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Supino inclinado", muscle: "Peito" }),
        "ex-1",
      );
    });
  });

  it("salvar não envia deletedAt ao hook (exclusão fora do form) mas envia modo e unidade", async () => {
    const item = makeExercise({
      id: "ex-1",
      name: "Supino reto",
      muscle: "Peito",
      loadUnit: "kg",
      deletedAt: null,
    });
    const save = vi.fn(async (_fields: unknown, _id?: unknown) => makeExercise());
    setupHook({
      exercises: [item],
      filteredExercises: [item],
      visibleExercises: [item],
      muscleOptions: ["Peito"],
      save,
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/editar supino reto/i);
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const [payload, id] = save.mock.calls[0];
    // A página não repassa campos de soft delete para o form de edição; modo
    // e unidade pertencem ao exercício e viajam no payload.
    expect(id).toBe("ex-1");
    expect(payload).toEqual({
      name: "Supino reto",
      muscle: "Peito",
      videoLink: null,
      mode: "repeticao",
      loadUnit: "kg",
    });
    expect(payload).not.toHaveProperty("deletedAt");
  });

  it("excluir pede confirmação com nome e músculo antes de sumir da lista", async () => {
    const item = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" });
    const state = setupHook({
      exercises: [item],
      filteredExercises: [item],
      visibleExercises: [item],
      muscleOptions: ["Peito"],
      remove: vi.fn(async () => {}),
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/excluir supino reto/i);

    expect(screen.getByRole("heading", { name: /excluir exercício/i })).toBeInTheDocument();
    expect(screen.getAllByText("Supino reto").length).toBeGreaterThanOrEqual(1);
    expect(state.remove).not.toHaveBeenCalled();

    await clickConnectedButton(/confirmar exclusão/i);

    await waitFor(() => {
      expect(state.remove).toHaveBeenCalledWith("ex-1");
    });
  });

  it("falha de save (duplicata) exibe erro só no modal e preserva a lista filtrada", async () => {
    const item = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" });
    const state = setupHook({
      exercises: [item],
      filteredExercises: [item],
      visibleExercises: [item],
      muscleOptions: ["Peito"],
      error: null,
      save: vi.fn(async () => {
        throw new Error("Exercício já existe naquele músculo");
      }),
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/novo exercício/i);
    fillModalForm("Supino reto", "Peito");
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() => {
      expect(state.save).toHaveBeenCalled();
    });

    // Erro visível dentro do modal…
    await waitFor(() => {
      expect(screen.getByText(/já existe naquele músculo/i)).toBeInTheDocument();
    });
    // …modal permanece aberto e a lista atrás preserva o item (sem retry de fetch).
    expect(screen.getByRole("heading", { name: /novo exercício/i })).toBeInTheDocument();
    expect(screen.getByText("Supino reto")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it("cancelar a confirmação de exclusão preserva a lista", async () => {
    const item = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" });
    const state = setupHook({
      exercises: [item],
      filteredExercises: [item],
      visibleExercises: [item],
      muscleOptions: ["Peito"],
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/excluir supino reto/i);
    await clickConnectedButton(/^cancelar$/i);

    expect(state.remove).not.toHaveBeenCalled();
    expect(screen.getByText("Supino reto")).toBeInTheDocument();
  });

  it("controle 'Ordenar por' ligado ao hook: exibe ordem atual e troca dispara setSortOrder", async () => {
    const items = [
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" }),
      makeExercise({ id: "ex-2", name: "Agachamento", muscle: "Perna" }),
    ];
    const setSortOrder = vi.fn();
    setupHook({
      exercises: items,
      filteredExercises: items,
      visibleExercises: items,
      muscleOptions: ["Peito", "Perna"],
      sortOrder: "muscle",
      setSortOrder,
    });

    render(<ExercisesPage />);

    const control = await screen.findByLabelText(/ordenar por/i);
    expect(control).toHaveValue("muscle");

    fireEvent.change(control, { target: { value: "name" } });
    expect(setSortOrder).toHaveBeenCalledWith("name");
  });
});

// ---------------------------------------------------------------------------
// Patch v5 (D25, R28, CA-P5-6) — EXCLUSÃO DA BIBLIOTECA FECHA EM FALHA +
// repasse CRU de `errorOrigin` ao ExerciseList (D21/D23).
// Contrato RED da TASK-038. Fonte: spec.md "Patch v5" (D21, D23, D25, R26–R28,
// CA-P5-6, achados S6(a)/S6(b)) + plan.md "Patch v5" §2 alvos
// (app/milon/exercises/page.tsx — `handleDeleteConfirm`, linhas 108–119) e §3
// contratos ("Página da biblioteca") + §4 data flow item 5 + tasks.json
// TASK-038 acceptanceCriteria 3.
//
// CONTRATO CONSUMIDO (ainda INEXISTENTE na produção):
//   - `handleDeleteConfirm` FECHA `DeleteExerciseConfirm` em SUCESSO E FALHA
//     (D25 — extensão da semântica D15/R16 à outra tela de confirmação do
//     Mílon); o comentário "Mantém a confirmação aberta" sai do arquivo;
//   - a página repassa `errorOrigin` CRU do hook ao `ExerciseList` (sem
//     fallback `?? "carga"`), de modo que a falha de exclusão vira banner SEM
//     "Tentar novamente" (origem `operacao`) ACIMA da lista, com o exercício
//     mantido (CA-P5-6 / S6(a) + S6(b)).
//
// STATUS: RED esperado (TASK-039/Hefesto torna verde). Hoje a confirmação
// permanece aberta na falha (falha: "heading ainda no documento") e a página
// não repassa a origem (falha: "o botão 'Tentar novamente' não deveria
// existir") — comportamento esperado, não erro de sintaxe.
// ---------------------------------------------------------------------------

/** Título do modal de confirmação (`components/milon/DeleteExerciseConfirm.tsx`). */
const TITULO_CONFIRM_EXCLUSAO = "Excluir exercício";

/** CA-P5-6: a confirmação não permanece aberta — some o heading E o backdrop. */
async function expectDeleteConfirmClosed(): Promise<void> {
  await waitFor(() => {
    expect(
      screen.queryByRole("heading", { name: TITULO_CONFIRM_EXCLUSAO }),
    ).not.toBeInTheDocument();
  });
  expect(document.querySelector(".fixed.inset-0.z-50")).toBeNull();
}

/** O nó `earlier` aparece antes de `later` na árvore (banner ACIMA). */
function expectAppearsBefore(earlier: HTMLElement, later: HTMLElement): void {
  const position = earlier.compareDocumentPosition(later);
  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

describe("Patch v5 — exclusão fecha em falha e origem repassada (TASK-038 RED)", () => {
  const MENSAGEM_FALHA = "Erro ao excluir exercício";

  it("CA-P5-6/S6(b): falha de exclusão FECHA a confirmação e mostra a mensagem no banner sem 'Tentar novamente'", async () => {
    const item = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" });
    const state = setupHook({
      exercises: [item],
      filteredExercises: [item],
      visibleExercises: [item],
      muscleOptions: ["Peito"],
    });
    // O hook grava `error` + origem `operacao` e RELANÇA (plan §3 "useExercises"
    // e §4 data flow item 5) — a decisão da página é fechar a confirmação.
    state.remove.mockImplementation(async () => {
      state.error = MENSAGEM_FALHA;
      state.errorOrigin = "operacao";
      throw new Error(MENSAGEM_FALHA);
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/excluir supino reto/i);
    expect(
      screen.getByRole("heading", { name: TITULO_CONFIRM_EXCLUSAO }),
    ).toBeInTheDocument();
    expect(state.remove).not.toHaveBeenCalled();

    await clickConnectedButton(/confirmar exclusão/i);
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith("ex-1"));

    // CA-P5-6 / D25: a confirmação NÃO permanece aberta na falha.
    await expectDeleteConfirmClosed();

    // A mensagem está legível no banner da lista…
    expect(screen.getByText(MENSAGEM_FALHA)).toBeInTheDocument();
    // …SEM "Tentar novamente" (exclusivo da origem `carga`)…
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    // …e o exercício permanece na lista (a exclusão falhou).
    expect(screen.getByText("Supino reto")).toBeInTheDocument();
  });

  it("terminal de sucesso: exclusão confirmada fecha a confirmação e zera o erro", async () => {
    const item = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" });
    const state = setupHook({
      exercises: [item],
      filteredExercises: [item],
      visibleExercises: [item],
      muscleOptions: ["Peito"],
    });

    render(<ExercisesPage />);

    await clickConnectedButton(/excluir supino reto/i);
    await clickConnectedButton(/confirmar exclusão/i);
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith("ex-1"));

    await expectDeleteConfirmClosed();
    expect(state.error).toBeNull();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
  });

  it("CA-P5-6: origem 'operacao' crua do hook => banner ACIMA da lista visível, sem retry", async () => {
    const item = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" });
    setupHook({
      exercises: [item],
      filteredExercises: [item],
      visibleExercises: [item],
      muscleOptions: ["Peito"],
      error: MENSAGEM_FALHA,
      errorOrigin: "operacao",
    });

    render(<ExercisesPage />);

    const banner = await screen.findByText(MENSAGEM_FALHA);
    const itemNode = screen.getByText("Supino reto");
    expectAppearsBefore(banner, itemNode);
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por músculo/i)).toBeInTheDocument();
  });

  it("CA-P3-15/CA-P5-5: origem 'carga' crua do hook => banner com 'Tentar novamente' que dispara retry", async () => {
    const state = setupHook({
      error: "Falha ao buscar exercícios",
      errorOrigin: "carga",
    });

    render(<ExercisesPage />);

    expect(screen.getByText("Falha ao buscar exercícios")).toBeInTheDocument();
    await clickConnectedButton(/tentar novamente/i);
    expect(state.retry).toHaveBeenCalledTimes(1);
    expect(state.errorOrigin).toBe("carga");
  });
});

/** Fonte da página da biblioteca (mesmo padrão de leitura de page.test.tsx). */
function exercisesPageSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../../app/milon/exercises/page.tsx"),
    "utf8",
  );
}

describe("TASK-039 — critérios de substituição (buscas por placeholder → 0)", () => {
  it("CA-P5-6/S6(b): 'Mantém a confirmação aberta' em app/milon/exercises/page.tsx => 0 ocorrências", () => {
    expect(exercisesPageSource().split("Mantém a confirmação aberta").length - 1).toBe(0);
  });

  it("D21/D23: a página repassa errorOrigin CRU do hook ao ExerciseList (sem fallback '?? \"carga\"')", () => {
    expect(exercisesPageSource()).toMatch(/errorOrigin\s*=\s*\{errorOrigin\}/);
    expect(exercisesPageSource()).not.toMatch(/\?\?\s*["']carga["']/);
  });
});
