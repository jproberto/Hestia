/**
 * Contrato RED — Mílon #2 (TASK-002): `lib/milon/program-utils.ts`.
 *
 * Fonte da verdade: `.agents/modules/milon/02-programas/spec.md` (§3 Regras de
 * Negócio) + `plan.md` §3 (contrato textual de `program-utils`) +
 * `tasks.json` TASK-002 (acceptanceCriteria).
 *
 * Escrito ANTES da implementação (outside-in): deve falhar porque
 * `@/lib/milon/program-utils` ainda não existe. Hefesto fará GREEN apenas com
 * o contrato descrito no plano — sem inventar APIs.
 *
 * DIVERGÊNCIA CONHECIDA (reportada por Minos a Zeus): o acceptanceCriteria de
 * TASK-002 no tasks.json diz "transicoesPermitidas('ativo') inclui 'reativar'
 * (não 'ativar')", mas a spec.md §3 é explícita: reativação é a transição
 * inativo → ativo; de ativo, a transição possível é virar inativo (efeito
 * colateral de outra ativação). Estes testes SEGUEM A SPEC.
 */
import { describe, it, expect } from "vitest";
import type { Program } from "@/lib/milon/types";
import {
  TEMPLATES_SUGESTAO,
  POOLS_SUGESTAO,
  normalizarTitulo,
  validarTitulo,
  sortearSugestao,
  transicoesPermitidas,
  guardaAtivacao,
  aplicarEfeitoColateralAtivacao,
} from "@/lib/milon/program-utils";

// ---------------------------------------------------------------------------
// Helpers de teste (nunca reimplementam regra de produção — só observam)
// ---------------------------------------------------------------------------

const SLOTS_CONHECIDOS = ["adj", "substantivo", "complemento"];
const SLOT_REGEX = /^\{(adj|substantivo|complemento)\}$/;

const escaparRegex = (texto: string): string =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Correspondência slot → pool conforme plan.md §3 ("adjetivos, substantivos,
// complementos") e TASK-002 description.
const POOLS_POR_SLOT: Record<string, readonly string[]> = {
  adj: POOLS_SUGESTAO.adjetivos,
  substantivo: POOLS_SUGESTAO.substantivos,
  complemento: POOLS_SUGESTAO.complementos,
};

/**
 * Monta um regex que casa SOMENTE strings obtidas de `template` com cada slot
 * substituído por uma palavra literal do pool correspondente (alternância
 * escapada — sem captura frágil, sem depender de como o sorteio é feito).
 */
const regexDeTemplateComPools = (template: string): RegExp => {
  const partes = template
    .split(/(\{(?:adj|substantivo|complemento)\})/)
    .filter((parte) => parte !== "");
  let padrao = "^";
  for (const parte of partes) {
    const slot = SLOT_REGEX.exec(parte);
    if (slot) {
      const pool = POOLS_POR_SLOT[slot[1]] ?? [];
      padrao += `(?:${pool.map(escaparRegex).join("|")})`;
    } else {
      padrao += escaparRegex(parte);
    }
  }
  return new RegExp(`${padrao}$`);
};

const programa = (
  campos: Partial<Program> & Pick<Program, "id" | "owner" | "status">,
): Program => ({
  title: "Programa",
  createdAt: "2026-09-01T00:00:00.000Z",
  created_by: "ana@exemplo.com",
  ...campos,
});

// ---------------------------------------------------------------------------

describe("Mílon #2 — program-utils (contrato RED, TASK-002)", () => {
  it("expõe as 8 exportações do contrato", () => {
    expect(Array.isArray(TEMPLATES_SUGESTAO)).toBe(true);
    expect(typeof POOLS_SUGESTAO).toBe("object");
    expect(typeof normalizarTitulo).toBe("function");
    expect(typeof validarTitulo).toBe("function");
    expect(typeof sortearSugestao).toBe("function");
    expect(typeof transicoesPermitidas).toBe("function");
    expect(typeof guardaAtivacao).toBe("function");
    expect(typeof aplicarEfeitoColateralAtivacao).toBe("function");
  });

  describe("material de sugestões (templates + pools)", () => {
    it("TEMPLATES_SUGESTAO é array não vazio de strings não vazias", () => {
      expect(Array.isArray(TEMPLATES_SUGESTAO)).toBe(true);
      expect(TEMPLATES_SUGESTAO.length).toBeGreaterThan(0);
      for (const template of TEMPLATES_SUGESTAO) {
        expect(typeof template).toBe("string");
        expect(template.trim().length).toBeGreaterThan(0);
      }
    });

    it("POOLS_SUGESTAO expõe adjetivos, substantivos e complementos não vazios", () => {
      expect(typeof POOLS_SUGESTAO).toBe("object");
      expect(POOLS_SUGESTAO).not.toBeNull();
      for (const chave of ["adjetivos", "substantivos", "complementos"]) {
        const pool = (POOLS_SUGESTAO as unknown as Record<string, unknown>)[chave];
        expect(Array.isArray(pool), `pool "${chave}" deve ser array`).toBe(true);
        const palavras = pool as string[];
        expect(palavras.length, `pool "${chave}" não pode ser vazia`).toBeGreaterThan(0);
        for (const palavra of palavras) {
          expect(typeof palavra).toBe("string");
          expect(palavra.trim().length, `palavra vazia em "${chave}"`).toBeGreaterThan(0);
        }
      }
    });

    it("templates contêm slots e usam apenas {adj}, {substantivo} e {complemento}", () => {
      const usados = new Set<string>();
      for (const template of TEMPLATES_SUGESTAO) {
        const encontrados = (template.match(/\{([^{}]*)\}/g) ?? []).map((m) =>
          m.slice(1, -1),
        );
        expect(encontrados.length, `template sem slot: "${template}"`).toBeGreaterThan(0);
        for (const slot of encontrados) {
          expect(
            SLOTS_CONHECIDOS,
            `slot desconhecido "{${slot}}" em "${template}"`,
          ).toContain(slot);
          usados.add(slot);
        }
      }
      for (const slot of SLOTS_CONHECIDOS) {
        expect(usados.has(slot), `nenhum template usa o slot {${slot}}`).toBe(true);
      }
    });
  });

  describe("normalizarTitulo (trim + colapso de espaços)", () => {
    it("remove espaços das bordas e colapsa espaços internos duplicados", () => {
      expect(normalizarTitulo("  Treino   A  ")).toBe("Treino A");
      expect(normalizarTitulo("Treino    do     Peito")).toBe("Treino do Peito");
      expect(normalizarTitulo("   ")).toBe("");
    });

    it("preserva acentos e maiúsculas — só os espaços colapsam", () => {
      expect(normalizarTitulo("  Treino MAROMBA   do PEITO é  SHOW  ")).toBe(
        "Treino MAROMBA do PEITO é SHOW",
      );
      expect(normalizarTitulo("FichA dA MArombA")).toBe("FichA dA MArombA");
    });

    it("é idempotente (normalizar de novo não altera o resultado)", () => {
      const umaVez = normalizarTitulo("  Treino   do  casal ");
      expect(umaVez).toBe("Treino do casal");
      expect(normalizarTitulo(umaVez)).toBe(umaVez);
    });
  });

  describe("validarTitulo (não-vazio)", () => {
    it("título vazio retorna mensagem de erro", () => {
      const erro = validarTitulo("");
      expect(typeof erro).toBe("string");
      expect(erro).toBeTruthy();
    });

    it("título só com espaços retorna mensagem de erro", () => {
      const erro = validarTitulo("        ");
      expect(typeof erro).toBe("string");
      expect(erro).toBeTruthy();
    });

    it("título não-vazio retorna null", () => {
      expect(validarTitulo("Treino A")).toBeNull();
      expect(validarTitulo("  Treino A  ")).toBeNull();
      expect(validarTitulo("é")).toBeNull();
    });
  });

  describe("sortearSugestao (combinação offline template + pool)", () => {
    it("retorna string preenchida, não vazia e sem slots residuais {...}", () => {
      for (let i = 0; i < 10; i++) {
        const sorteio = sortearSugestao();
        expect(typeof sorteio).toBe("string");
        expect(sorteio.trim().length, `sorteio #${i} em branco`).toBeGreaterThan(0);
        expect(sorteio, `sorteio #${i} com slot residual: "${sorteio}"`).not.toMatch(
          /[{}]/,
        );
      }
    });

    it("cada sorteio deriva de um template com slots preenchidos pelo pool correspondente", () => {
      const regexes = TEMPLATES_SUGESTAO.map(regexDeTemplateComPools);
      for (let i = 0; i < 25; i++) {
        const sorteio = sortearSugestao();
        const casaComAlgumTemplate = regexes.some((regex) => regex.test(sorteio));
        expect(
          casaComAlgumTemplate,
          `sorteio #${i} fora do material embarcado: "${sorteio}"`,
        ).toBe(true);
      }
    });
  });

  describe("transicoesPermitidas (spec §3 — ciclo de vida fechado)", () => {
    it("'rascunho' inclui 'ativar' (e não inativar/reativar)", () => {
      const acoes = transicoesPermitidas("rascunho");
      expect(Array.isArray(acoes)).toBe(true);
      expect(acoes).toContain("ativar");
      expect(acoes).not.toContain("inativar");
      expect(acoes).not.toContain("reativar");
    });

    // Spec §3: de ativo só existe virar inativo (efeito colateral); reativar é
    // exclusivo de inativo → ativo. Divergente do tasks.json — ver cabeçalho.
    it("'ativo' inclui 'inativar' e NÃO inclui 'ativar' nem 'reativar'", () => {
      const acoes = transicoesPermitidas("ativo");
      expect(Array.isArray(acoes)).toBe(true);
      expect(acoes).toContain("inativar");
      expect(acoes).not.toContain("ativar");
      expect(acoes).not.toContain("reativar");
    });

    it("'inativo' inclui 'reativar'", () => {
      const acoes = transicoesPermitidas("inativo");
      expect(Array.isArray(acoes)).toBe(true);
      expect(acoes).toContain("reativar");
    });
  });

  describe("guardaAtivacao (≥1 treino com ≥1 exercício)", () => {
    it("sem conteúdo (false) retorna mensagem de erro", () => {
      const erro = guardaAtivacao(false);
      expect(typeof erro).toBe("string");
      expect(erro).toBeTruthy();
    });

    it("com conteúdo (true) retorna null", () => {
      expect(guardaAtivacao(true)).toBeNull();
    });
  });

  describe("aplicarEfeitoColateralAtivacao (unicidade do ativo por dono)", () => {
    const dono = "ana@exemplo.com";
    const outroDono = "bruno@exemplo.com";

    const criarLista = (): Program[] => [
      programa({ id: "ana-ativo", owner: dono, status: "ativo", title: "Ana — vigente" }),
      programa({ id: "ana-rascunho", owner: dono, status: "rascunho", title: "Ana rascunho" }),
      programa({ id: "ana-inativo", owner: dono, status: "inativo", title: "Ana antiga" }),
      programa({ id: "bruno-ativo", owner: outroDono, status: "ativo", title: "Bruno — vigente" }),
      programa({ id: "bruno-rascunho", owner: outroDono, status: "rascunho", title: "Bruno rascunho" }),
    ];

    const statusDe = (lista: Program[], id: string): string | undefined =>
      lista.find((p) => p.id === id)?.status;

    it("desativa apenas o programa ativo do mesmo dono; demais ficam intactos", () => {
      const lista = criarLista();
      const resultado = aplicarEfeitoColateralAtivacao(lista, dono);

      expect(statusDe(resultado, "ana-ativo")).toBe("inativo");
      // não-ativos do mesmo dono não mudam
      expect(statusDe(resultado, "ana-rascunho")).toBe("rascunho");
      expect(statusDe(resultado, "ana-inativo")).toBe("inativo");
      // ativo e não-ativo de OUTRO dono não mudam
      expect(statusDe(resultado, "bruno-ativo")).toBe("ativo");
      expect(statusDe(resultado, "bruno-rascunho")).toBe("rascunho");
      expect(resultado).toHaveLength(lista.length);
    });

    it("retorna nova lista e não muta a lista original", () => {
      const lista = criarLista();
      const antes = lista.map((p) => ({ ...p }));

      const resultado = aplicarEfeitoColateralAtivacao(lista, dono);

      expect(resultado).not.toBe(lista);
      expect(lista).toEqual(antes);
      expect(lista[0].status).toBe("ativo");
    });

    it("dono sem programa ativo devolve lista com status intactos", () => {
      const lista = [
        programa({ id: "a1", owner: dono, status: "rascunho" }),
        programa({ id: "a2", owner: dono, status: "inativo" }),
        programa({ id: "b1", owner: outroDono, status: "ativo" }),
      ];
      const resultado = aplicarEfeitoColateralAtivacao(lista, dono);
      expect(resultado.map((p) => p.status)).toEqual(["rascunho", "inativo", "ativo"]);
    });

    it("no item desativado só o status muda; id, título, dono e datas permanecem", () => {
      const lista = criarLista();
      const original = lista[0];
      const resultado = aplicarEfeitoColateralAtivacao(lista, dono);
      const desativado = resultado.find((p) => p.id === original.id);
      expect(desativado).toEqual({ ...original, status: "inativo" });
      expect(resultado.find((p) => p.id === "bruno-ativo")).toEqual(lista[3]);
    });
  });
});
