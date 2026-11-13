import { describe, it, expect } from "vitest";
import * as plutoUtils from "@/lib/pluto/utils";

// ---------------------------------------------------------------------------
// T2 RED — Pluto 11 (Categorias e Contas sem Distinção de Caixa e Acentos).
// Fontes: `tasks.json` T2 (acceptanceCriteria 1), `spec.md` §5 R1 e
// `plan.md` §"Contratos Completos" (regra pura — DT-1).
//
// `normalizeName(text)` ainda NÃO existe em `lib/pluto/utils.ts` — o export
// é criado apenas na T3 (GREEN). O acesso é feito em runtime (cast) para o
// gate `npx tsc --noEmit` permanecer limpo (sem TS2305): a falha esperada é
// de runtime, com a mensagem clara do guard abaixo, sem SyntaxError/TS2 no
// output do vitest.
//
// Comportamento exigido (R1/D8): trim das pontas + mesma forma Unicode
// (é composto = é decomposto) + remoção de acentos + caixa minúscula. O
// texto salvo nunca passa por esta regra (D2/R3) — coberto nos
// repositórios, fakes e contracts.
// ---------------------------------------------------------------------------

type NormalizeName = (text: string) => string;

const { normalizeName } = plutoUtils as unknown as { normalizeName?: NormalizeName };

function norm(text: string): string {
  if (typeof normalizeName !== "function") {
    throw new Error("normalizeName ausente em lib/pluto/utils.ts (T3 GREEN pendente)");
  }
  return normalizeName(text);
}

describe("normalizeName (regra pura R1 — lib/pluto/utils.ts)", () => {
  it("remove os espaços das pontas (trim)", () => {
    expect(norm("  Alimentação  ")).toBe("alimentacao");
    expect(norm("   Mercado")).toBe("mercado");
  });

  it("reduz à caixa minúscula", () => {
    expect(norm("MERCADO")).toBe("mercado");
    expect(norm("Mercado")).toBe("mercado");
    expect(norm("MERCADO")).toBe(norm("mercado"));
  });

  it("remove os acentos", () => {
    expect(norm("Alimentação")).toBe("alimentacao");
    expect(norm("ALIMENTAÇÃO")).toBe("alimentacao");
    expect(norm("Salário")).toBe("salario");
  });

  it("iguala a forma Unicode composta e decomposta (colagem)", () => {
    const composto = "Alimentação"; // ca/ã em forma composta (NFC)
    const decomposto = composto.normalize("NFD");
    // fixture sanity: as duas formas precisam realmente ser diferentes
    expect(decomposto).not.toBe(composto);

    expect(norm(decomposto)).toBe(norm(composto));
    expect(norm(decomposto)).toBe("alimentacao");
  });

  it("combina trim + caixa + acento numa mesma chave de comparação", () => {
    expect(norm("  ALIMENTAÇÃO  ")).toBe("alimentacao");
    expect(norm("  Alimentação  ")).toBe(norm("alimentacao"));
    expect(norm("  Itaú  ")).toBe("itau");
  });
});
