import { describe, it, expect } from "vitest";
import { createChecklistItem } from "@/lib/pluto/repositories/checklist";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { ChecklistItemInput } from "@/lib/pluto/types";

const input: ChecklistItemInput = {
  day: 15,
  description: "Luz",
  type: "despesa",
  category_id: "cat-1",
  amount: 150,
  created_by: "u@t.com",
};

const insertedRow = {
  id: "chk-9",
  parent_id: null,
  month_id: "m-1",
  day: 15,
  description: "Luz",
  type: "despesa",
  category_id: "cat-1",
  amount: 150,
  is_completed: false,
  is_active: true,
  created_at: "2026-03-01T00:00:00Z",
  created_by: "u@t.com",
};

// Stub parcial do IDatabaseClient: só os caminhos usados pelo create
// (insert+select+single em checklist_items; select+eq+maybeSingle em categories).
function stubDb(opts: { inserted?: unknown; categoryName?: string | null }): IDatabaseClient {
  return {
    from: (table: string) => {
      if (table === "checklist_items") {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: opts.inserted ?? null, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: opts.categoryName ? { name: opts.categoryName } : null,
                error: null,
              }),
          }),
        }),
      };
    },
  } as unknown as IDatabaseClient;
}

describe("createChecklistItem (repositório real, task 50)", () => {
  it("retorna category_name resolvido via lookup, não undefined", async () => {
    const item = await createChecklistItem(stubDb({ inserted: insertedRow, categoryName: "Moradia" }), input, false, "m-1");

    expect(item.id).toBe("chk-9");
    expect(item.month_id).toBe("m-1");
    expect(item.category_name).toBe("Moradia");
  });

  it("usa fallback 'Sem categoria' quando a categoria é desconhecida", async () => {
    const item = await createChecklistItem(stubDb({ inserted: insertedRow, categoryName: null }), input, false, "m-1");

    expect(item.category_name).toBe("Sem categoria");
  });

  it("lança erro honesto quando o insert não retorna linha", async () => {
    await expect(createChecklistItem(stubDb({ inserted: null, categoryName: "Moradia" }), input, false, "m-1")).rejects.toThrow();
  });

  it("caminho global instancia no mês com category_name resolvido", async () => {
    const globalRow = { ...insertedRow, month_id: null };
    const monthRow = { ...insertedRow, id: "chk-10", parent_id: "chk-9" };
    let inserts = 0;
    const db = {
      from: (table: string) => {
        if (table === "checklist_items") {
          return {
            insert: () => ({
              select: () => ({
                single: () => {
                  inserts += 1;
                  return Promise.resolve({ data: inserts === 1 ? globalRow : monthRow, error: null });
                },
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { name: "Moradia" }, error: null }),
            }),
          }),
        };
      },
    } as unknown as IDatabaseClient;

    const item = await createChecklistItem(db, input, true, "m-1");

    expect(inserts).toBe(2);
    expect(item.id).toBe("chk-10");
    expect(item.parent_id).toBe("chk-9");
    expect(item.category_name).toBe("Moradia");
  });
});
