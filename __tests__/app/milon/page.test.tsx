import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import MilonPage from "@/app/milon/page";
import { useExercises } from "@/lib/milon/hooks/useExercises";
import type { Exercise } from "@/lib/milon/types";

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

describe("MilonPage /milon - Biblioteca de exercícios (TASK-009)", () => {
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

    render(<MilonPage />);

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

  it("mostra indicador de carregamento enquanto busca", () => {
    setupHook({ loading: true });

    render(<MilonPage />);

    expect(screen.getByText(/carregando exercícios/i)).toBeInTheDocument();
  });

  it("mostra erro com tentar-de-novo que dispara retry", async () => {
    const state = setupHook({ error: "Falha ao buscar" });

    render(<MilonPage />);

    expect(screen.getByText(/falha ao buscar/i)).toBeInTheDocument();
    await clickConnectedButton(/tentar novamente/i);
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it("biblioteca vazia mostra orientação de criar o primeiro, sem erro", () => {
    setupHook({ exercises: [], visibleExercises: [] });

    render(<MilonPage />);

    expect(screen.getByText(/nenhum exercício cadastrado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it("trocar filtro por músculo delega ao hook", async () => {
    const state = setupHook({
      exercises: [makeExercise()],
      visibleExercises: [makeExercise()],
      muscleOptions: ["Peito", "Perna"],
    });

    render(<MilonPage />);

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

    render(<MilonPage />);

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

    render(<MilonPage />);

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

    render(<MilonPage />);

    await clickConnectedButton(/novo exercício/i);
    expect(screen.getByRole("heading", { name: /novo exercício/i })).toBeInTheDocument();

    fillModalForm("Rosca direta", "Braço");
    await clickConnectedButton(/^salvar$/i);

    await waitFor(() => {
      expect(state.save).toHaveBeenCalledWith(
        { name: "Rosca direta", muscle: "Braço", videoLink: null },
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

    render(<MilonPage />);

    await clickConnectedButton(/novo exercício/i);
    fillModalForm("Rosca direta", "Braço");
    await clickConnectedButton(/salvar e incluir outro/i);

    await waitFor(() => {
      expect(state.saveAndNew).toHaveBeenCalledWith({
        name: "Rosca direta",
        muscle: "Braço",
        videoLink: null,
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

    render(<MilonPage />);

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

  it("excluir pede confirmação com nome e músculo antes de sumir da lista", async () => {
    const item = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "Peito" });
    const state = setupHook({
      exercises: [item],
      filteredExercises: [item],
      visibleExercises: [item],
      muscleOptions: ["Peito"],
      remove: vi.fn(async () => {}),
    });

    render(<MilonPage />);

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

    render(<MilonPage />);

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

    render(<MilonPage />);

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

    render(<MilonPage />);

    const control = await screen.findByLabelText(/ordenar por/i);
    expect(control).toHaveValue("muscle");

    fireEvent.change(control, { target: { value: "name" } });
    expect(setSortOrder).toHaveBeenCalledWith("name");
  });
});
