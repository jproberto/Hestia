import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useExercises } from "@/lib/milon/hooks/useExercises";
import * as hooksIndex from "@/lib/milon/hooks";
import {
  listExercisesStandalone,
  createExerciseStandalone,
  updateExerciseStandalone,
  deleteExerciseStandalone,
} from "@/lib/milon/db/exercises";
import type { Exercise } from "@/lib/milon/types";

vi.mock("@/lib/milon/db/exercises", () => ({
  listExercisesStandalone: vi.fn(),
  createExerciseStandalone: vi.fn(),
  updateExerciseStandalone: vi.fn(),
  deleteExerciseStandalone: vi.fn(),
}));

const EMAIL = "teste@hestia.com";

function makeExercise(overrides: Partial<Exercise> & { id: string }): Exercise {
  return {
    name: "Supino reto",
    muscle: "peito",
    videoLink: null,
    createdAt: "2026-09-12T00:00:00.000Z",
    created_by: EMAIL,
    ...overrides,
  };
}

function mockList(items: Exercise[]) {
  vi.mocked(listExercisesStandalone).mockResolvedValue(items);
}

describe("useExercises (TASK-005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("abre com biblioteca vazia: lista vazia sem erro", async () => {
    mockList([]);
    const { result } = renderHook(() => useExercises());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.exercises).toEqual([]);
    expect(result.current.visibleExercises).toEqual([]);
    expect(result.current.remainingCount).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.muscleOptions).toEqual([]);
  });

  it("falha de busca entrega erro com nova tentativa que recarrega", async () => {
    vi.mocked(listExercisesStandalone).mockRejectedValueOnce(new Error("falha de rede"));
    const { result } = renderHook(() => useExercises());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("falha de rede");
    expect(result.current.exercises).toEqual([]);

    const recovered = [makeExercise({ id: "ex-1" })];
    vi.mocked(listExercisesStandalone).mockResolvedValueOnce(recovered);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.exercises).toHaveLength(1);
    expect(listExercisesStandalone).toHaveBeenCalledTimes(2);
  });

  it("expõe retry como alias de reload", async () => {
    vi.mocked(listExercisesStandalone).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("boom");

    mockList([makeExercise({ id: "ex-1" })]);
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.exercises).toHaveLength(1);
  });

  it("filtro por músculo mostra só o músculo escolhido e limpar volta a tudo", async () => {
    mockList([
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
      makeExercise({ id: "ex-2", name: "Agachamento", muscle: "perna" }),
    ]);
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.visibleExercises).toHaveLength(2);

    act(() => {
      result.current.setMuscleFilter("peito");
    });
    expect(result.current.visibleExercises).toHaveLength(1);
    expect(result.current.visibleExercises[0].id).toBe("ex-1");

    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.muscleFilter).toBe("");
    expect(result.current.searchText).toBe("");
    expect(result.current.visibleExercises).toHaveLength(2);
  });

  it("busca com menos de três caracteres é ignorada", async () => {
    mockList([
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
      makeExercise({ id: "ex-2", name: "Agachamento", muscle: "perna" }),
    ]);
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearchText("su");
    });
    expect(result.current.visibleExercises).toHaveLength(2);

    act(() => {
      result.current.setSearchText("");
    });
    expect(result.current.visibleExercises).toHaveLength(2);
  });

  it("busca a partir do terceiro caractere filtra por contenção normalizada", async () => {
    mockList([
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
      makeExercise({ id: "ex-2", name: "Supino inclinado", muscle: "peito" }),
      makeExercise({ id: "ex-3", name: "Agachamento", muscle: "perna" }),
    ]);
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearchText("supi");
    });
    expect(result.current.visibleExercises.map((e) => e.id).sort()).toEqual(["ex-1", "ex-2"]);
  });

  it("filtro músculo + busca combinam por E lógico", async () => {
    mockList([
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
      makeExercise({ id: "ex-2", name: "Supino reto", muscle: "perna" }),
      makeExercise({ id: "ex-3", name: "Agachamento", muscle: "perna" }),
    ]);
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setMuscleFilter("perna");
    });
    act(() => {
      result.current.setSearchText("supino");
    });

    expect(result.current.visibleExercises.map((e) => e.id)).toEqual(["ex-2"]);
  });

  it("deriva muscleOptions da lista", async () => {
    mockList([
      makeExercise({ id: "ex-1", name: "B", muscle: "perna" }),
      makeExercise({ id: "ex-2", name: "A", muscle: "peito" }),
      makeExercise({ id: "ex-3", name: "C", muscle: "peito" }),
    ]);
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.muscleOptions).toEqual(["peito", "perna"]);
  });

  it("ordena a lista por músculo e depois por nome", async () => {
    mockList([
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
      makeExercise({ id: "ex-2", name: "Agachamento", muscle: "perna" }),
      makeExercise({ id: "ex-3", name: "Crucifixo", muscle: "peito" }),
    ]);
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.exercises.map((e) => e.id)).toEqual(["ex-3", "ex-1", "ex-2"]);
  });

  it("lote inicial até vinte com restantes, mostrar-mais acumula", async () => {
    const items = Array.from({ length: 25 }, (_, i) =>
      makeExercise({ id: `ex-${i + 1}`, name: `Exercicio ${String(i + 1).padStart(2, "0")}`, muscle: "peito" }),
    );
    mockList(items);
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.visibleExercises).toHaveLength(20);
    expect(result.current.remainingCount).toBe(5);

    act(() => {
      result.current.showMore();
    });
    expect(result.current.visibleExercises).toHaveLength(25);
    expect(result.current.remainingCount).toBe(0);
  });

  it("troca de filtro ou busca reinicia no primeiro lote", async () => {
    const items = Array.from({ length: 25 }, (_, i) =>
      makeExercise({
        id: `ex-${i + 1}`,
        name: i < 22 ? `Supino ${i + 1}` : `Agacho ${i + 1}`,
        muscle: i < 22 ? "peito" : "perna",
      }),
    );
    mockList(items);
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.showMore();
    });
    expect(result.current.visibleExercises).toHaveLength(25);

    act(() => {
      result.current.setMuscleFilter("peito");
    });
    expect(result.current.visibleCount).toBe(20);
    expect(result.current.visibleExercises).toHaveLength(20);

    act(() => {
      result.current.clearFilters();
    });
    act(() => {
      result.current.showMore();
    });
    expect(result.current.visibleExercises).toHaveLength(25);

    act(() => {
      result.current.setSearchText("supino");
    });
    expect(result.current.visibleCount).toBe(20);
    expect(result.current.visibleExercises).toHaveLength(20);
  });

  it("save cria e recarrega a lista com aviso de sucesso", async () => {
    const created = makeExercise({ id: "ex-novo", name: "Rosca direta", muscle: "braco" });
    vi.mocked(listExercisesStandalone).mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    vi.mocked(createExerciseStandalone).mockResolvedValueOnce(created);

    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let saved: Exercise | undefined;
    await act(async () => {
      saved = await result.current.save({ name: "Rosca direta", muscle: "braco", videoLink: null });
    });

    expect(saved?.id).toBe("ex-novo");
    expect(createExerciseStandalone).toHaveBeenCalledWith(
      { name: "Rosca direta", muscle: "braco", videoLink: null },
      EMAIL,
    );
    expect(result.current.exercises).toHaveLength(1);
    expect(result.current.successNotice).not.toBeNull();
  });

  it("save com id atualiza e recarrega", async () => {
    const current = makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" });
    const updated = makeExercise({ id: "ex-1", name: "Supino inclinado", muscle: "peito" });
    vi.mocked(listExercisesStandalone).mockResolvedValueOnce([current]).mockResolvedValueOnce([updated]);
    vi.mocked(updateExerciseStandalone).mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save(
        { name: "Supino inclinado", muscle: "peito", videoLink: null },
        "ex-1",
      );
    });

    expect(updateExerciseStandalone).toHaveBeenCalledWith("ex-1", {
      name: "Supino inclinado",
      muscle: "peito",
      videoLink: null,
    });
    expect(result.current.exercises[0].name).toBe("Supino inclinado");
  });

  it("saveAndNew grava e recarrega mantendo aviso breve", async () => {
    const created = makeExercise({ id: "ex-novo", name: "Rosca direta", muscle: "braco" });
    vi.mocked(listExercisesStandalone).mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    vi.mocked(createExerciseStandalone).mockResolvedValueOnce(created);

    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveAndNew({ name: "Rosca direta", muscle: "braco", videoLink: null });
    });

    expect(createExerciseStandalone).toHaveBeenCalled();
    expect(result.current.exercises).toHaveLength(1);
    expect(result.current.successNotice).not.toBeNull();
  });

  it("remove exclui e recarrega", async () => {
    const remaining = makeExercise({ id: "ex-2", name: "Agachamento", muscle: "perna" });
    vi.mocked(listExercisesStandalone)
      .mockResolvedValueOnce([
        makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
        remaining,
      ])
      .mockResolvedValueOnce([remaining]);
    vi.mocked(deleteExerciseStandalone).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.exercises).toHaveLength(2);

    await act(async () => {
      await result.current.remove("ex-1");
    });

    expect(deleteExerciseStandalone).toHaveBeenCalledWith("ex-1");
    expect(result.current.exercises.map((e) => e.id)).toEqual(["ex-2"]);
    expect(result.current.successNotice).not.toBeNull();
  });

  it("falha ao salvar relança sem contaminar o erro da lista (modal exibe via throw)", async () => {
    mockList([]);
    vi.mocked(createExerciseStandalone).mockRejectedValueOnce(new Error("duplicado"));
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(
        result.current.save({ name: "X", muscle: "peito", videoLink: null }),
      ).rejects.toThrow("duplicado");
    });
    expect(result.current.error).toBeNull();
  });

  it("save com falha (duplicata) preserva lista/filtros e não contamina o erro da lista", async () => {
    const items = [
      makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
      makeExercise({ id: "ex-2", name: "Agachamento", muscle: "perna" }),
    ];
    mockList(items);
    vi.mocked(createExerciseStandalone).mockRejectedValueOnce(
      new Error("Exercício já existe naquele músculo"),
    );
    const { result } = renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setMuscleFilter("peito");
    });
    expect(result.current.visibleExercises.map((e) => e.id)).toEqual(["ex-1"]);

    await act(async () => {
      await expect(
        result.current.save({ name: "Supino reto", muscle: "peito", videoLink: null }),
      ).rejects.toThrow("Exercício já existe naquele músculo");
    });

    // Regressão cenário 11: falha de save vai só para o modal (via throw);
    // o erro de nível da lista permanece nulo e itens/filtros são preservados.
    expect(result.current.error).toBeNull();
    expect(result.current.exercises).toHaveLength(2);
    expect(result.current.muscleFilter).toBe("peito");
    expect(result.current.visibleExercises.map((e) => e.id)).toEqual(["ex-1"]);
  });

  it("hooks/index exporta useExercises como caminho oficial", () => {
    expect(typeof hooksIndex.useExercises).toBe("function");
  });

  describe("Ordenar por (adendo UX v2)", () => {
    it("padrão inicial é Músculo: lista ordenada por músculo e depois por nome", async () => {
      mockList([
        makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
        makeExercise({ id: "ex-2", name: "Agachamento", muscle: "perna" }),
        makeExercise({ id: "ex-3", name: "Crucifixo", muscle: "peito" }),
      ]);
      const { result } = renderHook(() => useExercises());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.sortOrder).toBe("muscle");
      expect(result.current.exercises.map((e) => e.id)).toEqual(["ex-3", "ex-1", "ex-2"]);
    });

    it("troca para Nome ordena só por nome; voltar para Músculo restaura músculo→nome", async () => {
      mockList([
        makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
        makeExercise({ id: "ex-2", name: "Agachamento", muscle: "perna" }),
        makeExercise({ id: "ex-3", name: "Crucifixo", muscle: "peito" }),
      ]);
      const { result } = renderHook(() => useExercises());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setSortOrder("name");
      });
      expect(result.current.sortOrder).toBe("name");
      expect(result.current.visibleExercises.map((e) => e.id)).toEqual([
        "ex-2",
        "ex-3",
        "ex-1",
      ]);

      act(() => {
        result.current.setSortOrder("muscle");
      });
      expect(result.current.sortOrder).toBe("muscle");
      expect(result.current.visibleExercises.map((e) => e.id)).toEqual([
        "ex-3",
        "ex-1",
        "ex-2",
      ]);
    });

    it("troca de ordenação reinicia no primeiro lote, como filtro e busca", async () => {
      const items = Array.from({ length: 25 }, (_, i) =>
        makeExercise({
          id: `ex-${i + 1}`,
          name: `Exercicio ${String(i + 1).padStart(2, "0")}`,
          muscle: "peito",
        }),
      );
      mockList(items);
      const { result } = renderHook(() => useExercises());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.showMore();
      });
      expect(result.current.visibleExercises).toHaveLength(25);

      act(() => {
        result.current.setSortOrder("name");
      });
      expect(result.current.sortOrder).toBe("name");
      expect(result.current.visibleCount).toBe(20);
      expect(result.current.visibleExercises).toHaveLength(20);
    });

    it("ordenação por Nome vale em lista filtrada, buscada e combinada", async () => {
      mockList([
        makeExercise({ id: "ex-1", name: "Supino reto", muscle: "peito" }),
        makeExercise({ id: "ex-2", name: "Agachamento", muscle: "perna" }),
        makeExercise({ id: "ex-3", name: "Supino inclinado", muscle: "perna" }),
      ]);
      const { result } = renderHook(() => useExercises());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setSortOrder("name");
      });

      // Filtrada por músculo permanece ordenada por nome.
      act(() => {
        result.current.setMuscleFilter("perna");
      });
      expect(result.current.visibleExercises.map((e) => e.id)).toEqual(["ex-2", "ex-3"]);

      // Buscada por texto permanece ordenada por nome.
      act(() => {
        result.current.clearFilters();
      });
      act(() => {
        result.current.setSearchText("supino");
      });
      expect(result.current.visibleExercises.map((e) => e.id)).toEqual(["ex-3", "ex-1"]);

      // Combinada (músculo + texto) permanece ordenada por nome.
      act(() => {
        result.current.setMuscleFilter("perna");
      });
      expect(result.current.visibleExercises.map((e) => e.id)).toEqual(["ex-3"]);
    });
  });
});
