// Contrato RED — Mílon 07b Rotação do Treino do Dia (TASK-001): regra pura.
// Fonte: `.agents/modules/milon/07b-rotacao-treino-dia/spec.md` §3/§5
// (D1 próximo pelo último selado com volta, D2 ordem própria, D3 parcial =
// completa, D4 sem histórico → primeiro, D5a ficha nova → primeiro do novo
// programa) + `plan.md` §3 (MSG_TREINO_COM_EXECUCOES + pickNextWorkoutAfterLastSealed)
// + `tasks.json` TASK-001.
// Escrito ANTES da implementação (outside-in). Expected: FAIL —
// `pickNextWorkoutAfterLastSealed` e `MSG_TREINO_COM_EXECUCOES` ainda não
// existem em `@/lib/milon/workout-utils` (motivo certo: função/constante
// ausente, nunca sintaxe). Hefesto fará GREEN na TASK-002.
// Convenção tsc: acesso via namespace + cast (import estático nominal
// falharia o tsc); `expect(typeof fn).toBe("function")` trava o motivo.
import { describe, it, expect } from "vitest";
import * as WorkoutUtils07b from "@/lib/milon/workout-utils";

const MSG_ESPERADA =
  "Este treino possui execuções registradas. O histórico é preservado e o treino não pode ser excluído.";

function pickNext(
  orderedIds: string[],
  lastSealedId: string | null,
): string | null {
  const fn = (WorkoutUtils07b as unknown as Record<string, unknown>)[
    "pickNextWorkoutAfterLastSealed"
  ];
  expect(typeof fn).toBe("function");
  return (fn as (ids: string[], last: string | null) => string | null)(
    orderedIds,
    lastSealedId,
  );
}

function constante07b(nome: string): unknown {
  return (WorkoutUtils07b as unknown as Record<string, unknown>)[nome];
}

describe("Milon 07b TASK-001 RED — MSG_TREINO_COM_EXECUCOES (D6, plan §3)", () => {
  it("constante existe com o texto exato do plano", () => {
    expect(constante07b("MSG_TREINO_COM_EXECUCOES")).toBe(MSG_ESPERADA);
  });
});

describe("Milon 07b TASK-001 RED — pickNextWorkoutAfterLastSealed (D1/D2/D3/D4/D5a)", () => {
  it("D1/critério 1: último B em [A,B,C] → C (vizinho seguinte)", () => {
    expect(pickNext(["w-a", "w-b", "w-c"], "w-b")).toBe("w-c");
  });

  it("D1/critério 2: último C sendo o derradeiro → A (volta ao primeiro)", () => {
    expect(pickNext(["w-a", "w-b", "w-c"], "w-c")).toBe("w-a");
  });

  it("D3: parcial selada conta igual — a pura só recebe o id do último selado", () => {
    // O último selado chega como id, sem distinção parcial/completa.
    expect(pickNext(["w-a", "w-b", "w-c"], "w-a")).toBe("w-b");
  });

  it("D4: sem histórico (nulo) → primeiro da ordem atual", () => {
    expect(pickNext(["w-a", "w-b", "w-c"], null)).toBe("w-a");
  });

  it("D5a: ficha nova sem histórico no programa novo → primeiro do novo programa", () => {
    expect(pickNext(["w-n1", "w-n2"], null)).toBe("w-n1");
  });

  it("último que não pertence mais à lista → primeiro (ordem menor após exclusão sem histórico)", () => {
    expect(pickNext(["w-a", "w-c"], "w-b")).toBe("w-a");
  });

  it("lista vazia → nulo (sem treino ativo, sem erro — spec §2)", () => {
    expect(pickNext([], null)).toBeNull();
    expect(pickNext([], "w-a")).toBeNull();
  });

  it("lista unitária: nulo → o único; o único selado → ele mesmo (volta)", () => {
    expect(pickNext(["w-solo"], null)).toBe("w-solo");
    expect(pickNext(["w-solo"], "w-solo")).toBe("w-solo");
  });
});
