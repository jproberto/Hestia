import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChecklistCardModals } from "@/lib/pluto/hooks/useChecklistCardModals";

const item = { id: "i1", parent_id: null } as never;
const input = { description: "Luz" } as never;

function setup(overrides = {}) {
  const onAddItem = vi.fn().mockResolvedValue(undefined);
  const onEditItem = vi.fn().mockResolvedValue(undefined);
  const onDeleteItem = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useChecklistCardModals({ onAddItem, onEditItem, onDeleteItem, ...overrides }));
  return { result, onAddItem, onEditItem, onDeleteItem };
}

describe("useChecklistCardModals", () => {
  it("abre e salva adição fechando o modal", async () => {
    const { result, onAddItem } = setup();

    act(() => { result.current.handleOpenAddModal(); });
    expect(result.current.isAddModalOpen).toBe(true);

    await act(async () => { await result.current.handleSaveAdd(input, false); });

    expect(onAddItem).toHaveBeenCalledWith(input, false);
    expect(result.current.isAddModalOpen).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(result.current.errorMsg).toBeNull();
  });

  it("expõe erro sem fechar quando adicionar falha", async () => {
    const { result, onAddItem } = setup();
    onAddItem.mockRejectedValueOnce(new Error("DB fora"));

    act(() => { result.current.handleOpenAddModal(); });
    await act(async () => { await result.current.handleSaveAdd(input, false); });

    expect(result.current.errorMsg).toBe("DB fora");
    expect(result.current.isAddModalOpen).toBe(true);
  });

  it("edita item aberto e limpa edição ao salvar", async () => {
    const { result, onEditItem } = setup();

    act(() => { result.current.handleOpenEditModal(item); });
    expect(result.current.editingItem).toEqual(item);

    await act(async () => { await result.current.handleSaveEdit(input, true); });

    expect(onEditItem).toHaveBeenCalledWith("i1", input, true, null);
    expect(result.current.editingItem).toBeNull();
  });

  it("ignora salvar edição sem item aberto", async () => {
    const { result, onEditItem } = setup();

    await act(async () => { await result.current.handleSaveEdit(input, true); });

    expect(onEditItem).not.toHaveBeenCalled();
  });

  it("confirma exclusão e limpa item", async () => {
    const { result, onDeleteItem } = setup();

    act(() => { result.current.handleOpenDeleteModal(item); });
    await act(async () => { await result.current.handleConfirmDelete(true); });

    expect(onDeleteItem).toHaveBeenCalledWith("i1", true, null);
    expect(result.current.deletingItem).toBeNull();
  });
});
