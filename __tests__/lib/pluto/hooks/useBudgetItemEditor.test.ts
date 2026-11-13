import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBudgetItemEditor } from "@/lib/pluto/hooks/useBudgetItemEditor";
import { adjustBudgetItem } from "@/lib/pluto/db/budget";
import type { IDatabaseClient } from "@/lib/shared/database";

vi.mock("@/lib/pluto/db/budget", () => ({
  adjustBudgetItem: vi.fn(),
}));

const db = {} as IDatabaseClient;
const activeAdjustment = { id: "a2", year: 2026, start_month: 3 } as never;
const revision = { id: "r1", year: 2026, start_month: 1 } as never;
const categories = [
  { id: "c1", name: "Alimentação", type: "despesa" },
] as never;

function setup(overrides = {}) {
  const onSaved = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useBudgetItemEditor({
    db,
    year: 2026,
    revision,
    activeAdjustment,
    userEmail: "t@t.com",
    categories,
    isEditable: true,
    onSaved,
    ...overrides,
  }));
  return { result, onSaved };
}

describe("useBudgetItemEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adjustBudgetItem).mockResolvedValue(undefined);
  });

  it("sugere categorias do mesmo tipo contendo o texto", () => {
    const { result } = setup();

    act(() => { result.current.setCategoryName("Alim"); });

    expect(result.current.suggestions).toHaveLength(1);
  });

  // R6 / D13 (spec §8 edge 13): a inclusão das sugestões casa com a regra de
  // normalização (caixa + acentos) — digitando a variante "alimentacao" a
  // categoria "Alimentação" aparece.
  it("sugestões incluem 'Alimentação' quando digitado 'alimentacao' (variante sem acento)", () => {
    const { result } = setup();

    act(() => { result.current.setCategoryName("alimentacao"); });

    expect(result.current.suggestions.map((s) => s.name)).toContain("Alimentação");
  });

  it("sugestões incluem 'Alimentação' quando digitado o prefixo parcial 'alimen'", () => {
    const { result } = setup();

    act(() => { result.current.setCategoryName("alimen"); });

    expect(result.current.suggestions.map((s) => s.name)).toContain("Alimentação");
  });

  it("mantém a exclusão atual: digitado exatamente 'Alimentação' sai da lista", () => {
    const { result } = setup();

    act(() => { result.current.setCategoryName("Alimentação"); });

    expect(result.current.suggestions).toHaveLength(0);
  });

  // R7 / D5/D6: o editor de orçamento ganha handleCategoryBlur copiando a
  // grafia da homônima do OUTRO tipo (categoryType é o tipo atual).
  it("handleCategoryBlur copia a grafia da homônima do outro tipo", () => {
    const { result } = setup({
      categories: [
        { id: "c1", name: "Alimentação", type: "despesa" },
        { id: "c2", name: "Mercado", type: "receita" },
      ] as never,
    });

    act(() => { result.current.setCategoryName("mercado"); }); // tipo atual: despesa

    const blur = (result.current as unknown as { handleCategoryBlur?: () => void })
      .handleCategoryBlur;
    expect(typeof blur).toBe("function");
    act(() => blur!());

    expect(result.current.categoryName).toBe("Mercado");
  });

  it("salva previsão válida, limpa e fecha o form", async () => {
    const { result, onSaved } = setup();

    act(() => {
      result.current.setCategoryName("Alimentação");
      result.current.setAmount("800");
    });

    await act(async () => {
      await result.current.handleSaveItem({ preventDefault: () => {} } as never);
    });

    expect(vi.mocked(adjustBudgetItem)).toHaveBeenCalledWith(db, 2026, 3, "Alimentação", "despesa", 800, "t@t.com");
    expect(result.current.categoryName).toBe("");
    expect(result.current.amount).toBe("");
    expect(result.current.showForm).toBe(false);
    expect(onSaved).toHaveBeenCalled();
  });

  it("não salva sem revisão", async () => {
    const { result } = setup({ revision: null });

    act(() => {
      result.current.setCategoryName("Alimentação");
      result.current.setAmount("800");
    });

    await act(async () => {
      await result.current.handleSaveItem({ preventDefault: () => {} } as never);
    });

    expect(vi.mocked(adjustBudgetItem)).not.toHaveBeenCalled();
  });

  it("clique na célula fora de edição não abre inline", () => {
    const { result } = setup({ isEditable: false });

    act(() => { result.current.handleCellClick("c1", 1000); });

    expect(result.current.editingCategoryId).toBeNull();
  });

  it("clique na célula editável abre inline com valor atual", () => {
    const { result } = setup();

    act(() => { result.current.handleCellClick("c1", 1000); });

    expect(result.current.editingCategoryId).toBe("c1");
    expect(result.current.tempAmount).toBe("1000");
  });

  it("valor inválido no inline cancela sem salvar", async () => {
    const { result } = setup();

    act(() => {
      result.current.handleCellClick("c1", 1000);
      result.current.setTempAmount("abc");
    });

    await act(async () => {
      await result.current.handleSaveInline("c1", "Alimentação", "despesa");
    });

    expect(vi.mocked(adjustBudgetItem)).not.toHaveBeenCalled();
    expect(result.current.editingCategoryId).toBeNull();
  });

  it("valor válido no inline salva e fecha edição", async () => {
    const { result, onSaved } = setup();

    act(() => {
      result.current.handleCellClick("c1", 1000);
      result.current.setTempAmount("1200");
    });

    await act(async () => {
      await result.current.handleSaveInline("c1", "Alimentação", "despesa");
    });

    expect(vi.mocked(adjustBudgetItem)).toHaveBeenCalledWith(db, 2026, 3, "Alimentação", "despesa", 1200, "t@t.com");
    expect(result.current.editingCategoryId).toBeNull();
    expect(onSaved).toHaveBeenCalled();
  });
});
