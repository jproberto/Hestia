import { describe, it, expect } from "vitest";
import {
  EXERCISE_PAGE_SIZE,
  EXERCISE_SEARCH_MIN_LENGTH,
  normalizeExerciseText,
  isSameExercise,
  matchesExerciseQuery,
  compareExercisesByMuscleThenName,
} from "@/lib/milon/utils";

describe("Milon utils — normalização e regras puras (TASK-002)", () => {
  it("expõe constantes de consulta (lote 20, mínimo 3)", () => {
    expect(EXERCISE_PAGE_SIZE).toBe(20);
    expect(EXERCISE_SEARCH_MIN_LENGTH).toBe(3);
  });

  describe("normalizeExerciseText", () => {
    it("converte maiúsculas para minúsculas", () => {
      expect(normalizeExerciseText("Supino Reto")).toBe("supino reto");
    });

    it("remove acentos por decomposição (a = á = à = ã)", () => {
      expect(normalizeExerciseText("peito")).toBe(normalizeExerciseText("PEITO"));
      expect(normalizeExerciseText("àáãâ")).toBe("aaaa");
      expect(normalizeExerciseText("Supino Rêto")).toBe("supino reto");
      expect(normalizeExerciseText("perna")).toBe(normalizeExerciseText("pérná"));
    });

    it("remove caracteres especiais", () => {
      expect(normalizeExerciseText("Supino! Reto?")).toBe("supino reto");
      expect(normalizeExerciseText("supino-reto")).toBe("supino reto");
      expect(normalizeExerciseText("puxada (aberta)")).toBe("puxada aberta");
    });

    it("aplica trim + colapso de espaços", () => {
      expect(normalizeExerciseText("  supino   reto  ")).toBe("supino reto");
      expect(normalizeExerciseText("supino\t\treto")).toBe("supino reto");
    });

    it("canoniza variações equivalentes para a mesma forma", () => {
      const a = normalizeExerciseText("  SUPINO Rêto! ");
      const b = normalizeExerciseText("supino   reto");
      const c = normalizeExerciseText("Súpiño-Reto");
      expect(a).toBe("supino reto");
      expect(b).toBe("supino reto");
      expect(c).toBe("supino reto");
    });
  });

  describe("isSameExercise", () => {
    it("iguala nome+músculo ignorando caixa/acentos/especiais/espaços", () => {
      expect(
        isSameExercise(
          { name: "Supino Reto", muscle: "Peito" },
          { name: "  supino   rêto! ", muscle: "peito" },
        ),
      ).toBe(true);
    });

    it("distingue nomes diferentes no mesmo músculo", () => {
      expect(
        isSameExercise(
          { name: "Supino Reto", muscle: "Peito" },
          { name: "Supino Inclinado", muscle: "Peito" },
        ),
      ).toBe(false);
    });

    it("permite mesmo nome em músculos diferentes", () => {
      expect(
        isSameExercise(
          { name: "Supino Reto", muscle: "Peito" },
          { name: "Supino Reto", muscle: "Perna" },
        ),
      ).toBe(false);
    });
  });

  describe("matchesExerciseQuery", () => {
    it("ignora consultas com 0, 1 ou 2 caracteres (comporta-se como sem busca)", () => {
      expect(matchesExerciseQuery({ name: "Supino Reto" }, "")).toBe(true);
      expect(matchesExerciseQuery({ name: "Supino Reto" }, "su")).toBe(true);
      expect(matchesExerciseQuery({ name: "Supino Reto" }, "s")).toBe(true);
      expect(matchesExerciseQuery({ name: "Supino Reto" }, "  su  ")).toBe(true);
    });

    it("filtra por contenção normalizada a partir do terceiro caractere", () => {
      expect(matchesExerciseQuery({ name: "Supino Reto" }, "sup")).toBe(true);
      expect(matchesExerciseQuery({ name: "Supino Reto" }, "supi")).toBe(true);
      expect(matchesExerciseQuery({ name: "Supino Inclinado" }, "supi")).toBe(true);
      expect(matchesExerciseQuery({ name: "Agachamento" }, "sup")).toBe(false);
    });

    it("busca é insensível a caixa/acentos/especiais/espaços", () => {
      expect(matchesExerciseQuery({ name: "Supino Rêto" }, "SUPINO reto")).toBe(true);
      expect(matchesExerciseQuery({ name: "Puxada Aberta" }, "puxada-aberta!")).toBe(true);
    });

    it("combina com filtro de músculo por E lógico (composição das puras)", () => {
      const items = [
        { name: "Supino Reto", muscle: "Peito" },
        { name: "Supino Inclinado", muscle: "Peito" },
        { name: "Supino Reto", muscle: "Perna" },
      ];
      const muscle = "peito";
      const query = "supi";
      const result = items.filter(
        (e) =>
          normalizeExerciseText(e.muscle) === normalizeExerciseText(muscle) &&
          matchesExerciseQuery(e, query),
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("compareExercisesByMuscleThenName", () => {
    it("ordena por músculo normalizado e depois por nome normalizado", () => {
      const items = [
        { name: "Supino Reto", muscle: "Peito" },
        { name: "Agachamento", muscle: "Perna" },
        { name: "Crucifixo", muscle: "Peito" },
      ];
      const sorted = [...items].sort(compareExercisesByMuscleThenName);
      expect(sorted.map((e) => e.name)).toEqual([
        "Crucifixo",
        "Supino Reto",
        "Agachamento",
      ]);
    });

    it("ordenação ignora caixa e acentos", () => {
      const items = [
        { name: "supino rêto", muscle: "peito" },
        { name: "Crucifixo", muscle: "PEITO" },
      ];
      const sorted = [...items].sort(compareExercisesByMuscleThenName);
      expect(sorted[0].name).toBe("Crucifixo");
    });
  });
});
