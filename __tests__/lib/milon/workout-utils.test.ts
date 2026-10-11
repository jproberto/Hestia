/**
 * Contrato RED — Mílon #3 (TASK-003): `lib/milon/workout-utils.ts`.
 *
 * Fonte da verdade: `.agents/modules/milon/03-treinos-series/plan.md` §3
 * (contrato textual das utilidades puras) + `spec.md` §3 (regras D10, D11 e
 * D15) + `tasks.json` TASK-003 (acceptanceCriteria).
 *
 * Escrito ANTES da implementação (outside-in): deve falhar porque
 * `@/lib/milon/workout-utils` ainda não existe. Hefesto fará GREEN apenas com
 * o contrato descrito no plano — sem inventar APIs.
 *
 * NOTA DE COBERTURA (Minos → Zeus): o branch "nenhuma livre → string vazia" de
 * `sugerirNomeTreino` (plan.md §3 / spec.md §3, "cenário improvável") é
 * INALCANÇÁVEL com entrada finita — a sequência de rótulos é infinita (não
 * para em Z), então qualquer lista finita de nomes sempre deixa alguma
 * posição livre. Para afirmar esse branch seria preciso inventar um teto de
 * varredura que nenhum documento especifica; portanto nenhuma asserção é
 * fabricada aqui. O branch segue documentado no contrato textual de Hefesto
 * (defensivo).
 *
 * Interpretações registradas (derivadas do texto do plano, sem inventar):
 * - `formatarCargaComSecundaria`: "principal = valor como digitado com a
 *   unidade" → a principal contém o valor digitado e a unidade; "secundaria =
 *   convertido com 1 casa decimal" → exatamente 1 casa (separador "." ou ","
 *   aceito — o plano não fixa o separador e não há convenção numérica no
 *   codebase), com sufixo de unidade opcional (o plano não menciona unidade na
 *   secundária).
 * - `gerarSubtituloMusculares` com 4+ itens segue o padrão da spec D15
 *   ("vírgula entre os itens, 'e' antes do último").
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { LoadUnit, WorkoutExecutionSeries, WorkoutSeries } from "@/lib/milon/types";
import {
  MSG_TREINO_COM_EXERCICIOS,
  MSG_PROGRAMA_COM_TREINOS,
  MSG_EXERCICIO_JA_NO_PROGRAMA,
  MSG_NOME_TREINO_OBRIGATORIO,
  MSG_NOME_TREINO_DUPLICADO,
  MSG_QUANTIDADE_SERIES_INVALIDA,
  MSG_CARGA_NEGATIVA,
  MSG_UNIDADE_OBRIGATORIA,
  MSG_CARGA_NAO_NUMERICA,
  normalizarNomeTreino,
  validarNomeTreino,
  nomesTreinoIguais,
  validarNomeUnicoNoPrograma,
  rotuloSequencial,
  sugerirNomeTreino,
  gerarSubtituloMusculares,
  interpretarQuantidadeSeries,
  validarInteiroCampo,
  validarCarga,
  hasSeriePreenchida,
  aplicarSerieOrigemEmTodas,
  converterCarga,
  formatarCargaComSecundaria,
  contarMarcadasNaExecucao,
  ehUltimaMarcada,
} from "@/lib/milon/workout-utils";

// ---------------------------------------------------------------------------
// Helpers de teste (nunca reimplementam regra de produção — só observam)
// ---------------------------------------------------------------------------

const serie = (
  overrides: Partial<WorkoutSeries> & { id: string }
): WorkoutSeries => ({
  entryId: "entry-1",
  position: 1,
  value: null,
  load: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  created_by: "casal@exemplo.com",
  ...overrides,
});

/** "Treino A" … "Treino Z" sem depender de `rotuloSequencial` (evita acoplar). */
const treinosDeAaZ = (): string[] =>
  Array.from({ length: 26 }, (_, i) => `Treino ${String.fromCharCode(65 + i)}`);

/** Aceita 1 casa decimal com separador "." ou "," e sufixo de unidade opcional. */
const CASA_DECIMAL = /^\d+[.,]\d(\s*(kg|lb))?$/;

// ---------------------------------------------------------------------------
// Constantes de mensagem — texto exato caractere a caractere (plan.md §3)
// ---------------------------------------------------------------------------

describe("constantes de mensagem", () => {
  it("MSG_TREINO_COM_EXERCICIOS tem o texto exato do plano", () => {
    expect(MSG_TREINO_COM_EXERCICIOS).toBe(
      "Este treino possui exercícios. Remova-os antes de excluir o treino."
    );
  });

  it("MSG_PROGRAMA_COM_TREINOS tem o texto exato do plano", () => {
    expect(MSG_PROGRAMA_COM_TREINOS).toBe(
      "Este programa possui treinos. Esvazie-o antes de excluir."
    );
  });

  it("MSG_EXERCICIO_JA_NO_PROGRAMA tem o texto exato do plano", () => {
    expect(MSG_EXERCICIO_JA_NO_PROGRAMA).toBe(
      "Este exercício já está em um treino deste programa. Escolha outro exercício."
    );
  });

  it("MSG_NOME_TREINO_OBRIGATORIO tem o texto exato do plano", () => {
    expect(MSG_NOME_TREINO_OBRIGATORIO).toBe("Informe o nome do treino.");
  });

  it("MSG_NOME_TREINO_DUPLICADO tem o texto exato do plano", () => {
    expect(MSG_NOME_TREINO_DUPLICADO).toBe(
      "Já existe um treino com esse nome neste programa."
    );
  });

  it("MSG_QUANTIDADE_SERIES_INVALIDA tem o texto exato do plano", () => {
    expect(MSG_QUANTIDADE_SERIES_INVALIDA).toBe(
      "Informe a quantidade de séries (número inteiro maior ou igual a 1)."
    );
  });

  it("MSG_CARGA_NEGATIVA tem o texto exato do plano", () => {
    expect(MSG_CARGA_NEGATIVA).toBe("A carga não pode ser negativa.");
  });

  it("MSG_UNIDADE_OBRIGATORIA tem o texto exato do plano", () => {
    expect(MSG_UNIDADE_OBRIGATORIA).toBe(
      "Escolha a unidade da carga: kg ou lb."
    );
  });

  it("MSG_CARGA_NAO_NUMERICA tem o texto exato do plano", () => {
    expect(MSG_CARGA_NAO_NUMERICA).toBe(
      "Informe um valor numérico válido para a carga."
    );
  });
});

// ---------------------------------------------------------------------------
// Nome do treino (D11): normalização, obrigatório e unicidade
// ---------------------------------------------------------------------------

describe("normalizarNomeTreino", () => {
  it("remove espaços das bordas e colapsa espaços internos", () => {
    expect(normalizarNomeTreino("  Treino   A  ")).toBe("Treino A");
  });

  it("devolve vazio para vazio e para só espaços", () => {
    expect(normalizarNomeTreino("")).toBe("");
    expect(normalizarNomeTreino("   ")).toBe("");
  });

  it("não altera um nome já normalizado", () => {
    expect(normalizarNomeTreino("Treino A")).toBe("Treino A");
  });
});

describe("validarNomeTreino", () => {
  it("vazio → MSG_NOME_TREINO_OBRIGATORIO", () => {
    expect(validarNomeTreino("")).toBe(MSG_NOME_TREINO_OBRIGATORIO);
    expect(validarNomeTreino("")).toBe("Informe o nome do treino.");
  });

  it("só espaços → MSG_NOME_TREINO_OBRIGATORIO", () => {
    expect(validarNomeTreino("   ")).toBe(MSG_NOME_TREINO_OBRIGATORIO);
  });

  it("nome preenchido → null (válido)", () => {
    expect(validarNomeTreino("Treino A")).toBeNull();
  });
});

describe("nomesTreinoIguais", () => {
  it("caixa diferente conta como igual", () => {
    expect(nomesTreinoIguais("Treino A", "treino a")).toBe(true);
  });

  it("espaços extras (borda e internos) contam como iguais", () => {
    expect(nomesTreinoIguais("  treino   a  ", "Treino A")).toBe(true);
  });

  it("nomes distintos são diferentes", () => {
    expect(nomesTreinoIguais("Treino A", "Treino B")).toBe(false);
  });
});

describe("validarNomeUnicoNoPrograma", () => {
  it("sem nomes existentes → null (válido)", () => {
    expect(validarNomeUnicoNoPrograma("Treino A", [])).toBeNull();
  });

  it("nome que não colide → null (válido)", () => {
    expect(validarNomeUnicoNoPrograma("Treino A", ["Push"])).toBeNull();
  });

  it("colisão exata → MSG_NOME_TREINO_DUPLICADO", () => {
    expect(validarNomeUnicoNoPrograma("Treino A", ["Treino A"])).toBe(
      MSG_NOME_TREINO_DUPLICADO
    );
    expect(validarNomeUnicoNoPrograma("Treino A", ["Treino A"])).toBe(
      "Já existe um treino com esse nome neste programa."
    );
  });

  it("colisão normalizada (caixa/espaços) → MSG_NOME_TREINO_DUPLICADO", () => {
    expect(validarNomeUnicoNoPrograma("Treino A", ["treino   a"])).toBe(
      MSG_NOME_TREINO_DUPLICADO
    );
  });

  it("colide mesmo quando há outros nomes na lista", () => {
    expect(validarNomeUnicoNoPrograma("Treino A", ["Push", "Treino A"])).toBe(
      MSG_NOME_TREINO_DUPLICADO
    );
  });
});

// ---------------------------------------------------------------------------
// Sugestão sequencial (D11): A…Z, AA, AB… — a sequência não para em Z
// ---------------------------------------------------------------------------

describe("rotuloSequencial", () => {
  it("0 → A e 25 → Z", () => {
    expect(rotuloSequencial(0)).toBe("A");
    expect(rotuloSequencial(25)).toBe("Z");
  });

  it("26 → AA e 27 → AB (continua depois de Z)", () => {
    expect(rotuloSequencial(26)).toBe("AA");
    expect(rotuloSequencial(27)).toBe("AB");
  });
});

describe("sugerirNomeTreino", () => {
  it("Programa vazio → 'Treino A'", () => {
    expect(sugerirNomeTreino([])).toBe("Treino A");
  });

  it("primeira posição livre: 'Treino A' existente → 'Treino B'", () => {
    expect(sugerirNomeTreino(["Treino A"])).toBe("Treino B");
  });

  it("'Treino A' + 'Push' → 'Treino B' (exemplo do plano)", () => {
    expect(sugerirNomeTreino(["Treino A", "Push"])).toBe("Treino B");
  });

  it("a ordem dos nomes existentes não influencia", () => {
    expect(sugerirNomeTreino(["Push", "Treino A"])).toBe("Treino B");
  });

  it("pulando lacunas: 'Treino A' e 'Treino C' → 'Treino B'", () => {
    expect(sugerirNomeTreino(["Treino A", "Treino C"])).toBe("Treino B");
  });

  it("comparação normalizada: nome existente com caixa/espaços extras ocupa a posição", () => {
    expect(sugerirNomeTreino(["  treino   a  "])).toBe("Treino B");
  });

  it("Programa só com 'Treino A'..'Treino Z' → 'Treino AA' (além de Z)", () => {
    expect(sugerirNomeTreino(treinosDeAaZ())).toBe("Treino AA");
  });

  it("'Treino AA' também existente → 'Treino AB'", () => {
    expect(sugerirNomeTreino([...treinosDeAaZ(), "Treino AA"])).toBe(
      "Treino AB"
    );
  });
});

// ---------------------------------------------------------------------------
// Subtítulo de musculares (D15): únicos, ordem de primeira aparição
// ---------------------------------------------------------------------------

describe("gerarSubtituloMusculares", () => {
  it("vazio → string vazia", () => {
    expect(gerarSubtituloMusculares([])).toBe("");
  });

  it("1 grupo → sai sozinho", () => {
    expect(gerarSubtituloMusculares(["Peito"])).toBe("Peito");
  });

  it("2 grupos → 'Peito e Ombros'", () => {
    expect(gerarSubtituloMusculares(["Peito", "Ombros"])).toBe(
      "Peito e Ombros"
    );
  });

  it("3 grupos → 'Peito, Tríceps e Ombros'", () => {
    expect(gerarSubtituloMusculares(["Peito", "Tríceps", "Ombros"])).toBe(
      "Peito, Tríceps e Ombros"
    );
  });

  it("4+ grupos → vírgula entre itens e 'e' antes do último (padrão D15)", () => {
    expect(
      gerarSubtituloMusculares(["Peito", "Tríceps", "Ombros", "Costas"])
    ).toBe("Peito, Tríceps, Ombros e Costas");
  });

  it("deduplica preservando a ordem de primeira aparição (2 grupos)", () => {
    expect(
      gerarSubtituloMusculares(["Peito", "Ombros", "Peito"])
    ).toBe("Peito e Ombros");
  });

  it("deduplica preservando a ordem de primeira aparição (3 grupos)", () => {
    expect(
      gerarSubtituloMusculares([
        "Peito",
        "Tríceps",
        "Peito",
        "Ombros",
        "Tríceps",
      ])
    ).toBe("Peito, Tríceps e Ombros");
  });
});

// ---------------------------------------------------------------------------
// Validações numéricas de série
// ---------------------------------------------------------------------------

describe("interpretarQuantidadeSeries", () => {
  it("vazio → inválido", () => {
    expect(interpretarQuantidadeSeries("").valido).toBe(false);
  });

  it("não numérico → inválido", () => {
    expect(interpretarQuantidadeSeries("abc").valido).toBe(false);
  });

  it("negativo → inválido", () => {
    expect(interpretarQuantidadeSeries("-1").valido).toBe(false);
  });

  it("não inteiro → inválido", () => {
    expect(interpretarQuantidadeSeries("2.5").valido).toBe(false);
  });

  it("'0' → válido com quantidade 0 (significa zerar)", () => {
    const resultado = interpretarQuantidadeSeries("0");
    expect(resultado.valido).toBe(true);
    if (resultado.valido) {
      expect(resultado.quantidade).toBe(0);
    }
  });

  it("'5' → válido com quantidade 5", () => {
    const resultado = interpretarQuantidadeSeries("5");
    expect(resultado.valido).toBe(true);
    if (resultado.valido) {
      expect(resultado.quantidade).toBe(5);
    }
  });
});

describe("validarInteiroCampo", () => {
  it("vazio → ok com valor null (campo opcional)", () => {
    expect(validarInteiroCampo("", "repetições")).toEqual({
      ok: true,
      valor: null,
    });
    expect(validarInteiroCampo("", "tempo")).toEqual({
      ok: true,
      valor: null,
    });
    expect(validarInteiroCampo("", "descanso")).toEqual({
      ok: true,
      valor: null,
    });
  });

  it("'0' → ok com valor 0", () => {
    expect(validarInteiroCampo("0", "repetições")).toEqual({
      ok: true,
      valor: 0,
    });
  });

  it("inteiro ≥ 0 → ok com o valor", () => {
    expect(validarInteiroCampo("7", "tempo")).toEqual({ ok: true, valor: 7 });
  });

  it("não numérico → mensagem exata para o rótulo 'repetições'", () => {
    const resultado = validarInteiroCampo("abc", "repetições");
    expect(resultado.ok).toBe(false);
    expect(resultado).toEqual({
      ok: false,
      mensagem:
        "Use um número inteiro maior ou igual a zero para repetições.",
    });
  });

  it("negativo → mensagem exata para o rótulo 'tempo'", () => {
    expect(validarInteiroCampo("-1", "tempo")).toEqual({
      ok: false,
      mensagem: "Use um número inteiro maior ou igual a zero para tempo.",
    });
  });

  it("não inteiro → mensagem exata para o rótulo 'descanso'", () => {
    expect(validarInteiroCampo("2.5", "descanso")).toEqual({
      ok: false,
      mensagem: "Use um número inteiro maior ou igual a zero para descanso.",
    });
  });
});

describe("validarCarga", () => {
  it("vazio → ok com valor null (vazio ≠ 0)", () => {
    const resultado = validarCarga("");
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor).toBeNull();
    }
  });

  it("'0' → ok com valor 0 (zero é valor legítimo, não vazio)", () => {
    const resultado = validarCarga("0");
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor).toBe(0);
    }
  });

  it("vazio e zero produzem valores diferentes (vazio ≠ 0)", () => {
    const vazio = validarCarga("");
    const zero = validarCarga("0");
    expect(vazio.ok && vazio.valor).toBeNull();
    expect(zero.ok && zero.valor).toBe(0);
  });

  it("não numérico → MSG_CARGA_NAO_NUMERICA com texto exato", () => {
    const resultado = validarCarga("abc");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.mensagem).toBe(MSG_CARGA_NAO_NUMERICA);
      expect(resultado.mensagem).toBe(
        "Informe um valor numérico válido para a carga."
      );
    }
  });

  it("negativo → MSG_CARGA_NEGATIVA com texto exato", () => {
    const resultado = validarCarga("-1");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.mensagem).toBe(MSG_CARGA_NEGATIVA);
      expect(resultado.mensagem).toBe("A carga não pode ser negativa.");
    }
  });

  it("decimal digitado é aceito", () => {
    const resultado = validarCarga("12.5");
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor).toBe(12.5);
    }
  });
});

// ---------------------------------------------------------------------------
// Séries: preenchimento e "aplicar a todas"
// ---------------------------------------------------------------------------

describe("hasSeriePreenchida", () => {
  it("lista vazia → false", () => {
    expect(hasSeriePreenchida([])).toBe(false);
  });

  it("todas com campos nulos → false", () => {
    expect(
      hasSeriePreenchida([serie({ id: "s1" }), serie({ id: "s2" })])
    ).toBe(false);
  });

  it("só value preenchido → true", () => {
    expect(hasSeriePreenchida([serie({ id: "s1", value: 10 })])).toBe(true);
  });

  it("só value (modo tempo) preenchido → true", () => {
    expect(
      hasSeriePreenchida([serie({ id: "s1", value: 30 })])
    ).toBe(true);
  });

  it("carga 0 conta como preenchida (0 é valor, não vazio)", () => {
    expect(hasSeriePreenchida([serie({ id: "s1", load: 0 })])).toBe(true);
  });

  it("alguma preenchida entre vazias → true", () => {
    expect(
      hasSeriePreenchida([
        serie({ id: "s1" }),
        serie({ id: "s2", value: 8 }),
        serie({ id: "s3" }),
      ])
    ).toBe(true);
  });
});

describe("aplicarSerieOrigemEmTodas", () => {
  it("copia value/load da origem para as demais séries", () => {
    const origem = serie({
      id: "s1",
      position: 1,
      value: 10,
      load: 60,
    });
    const destino = serie({ id: "s2", position: 2 });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(resultado).toHaveLength(2);
    expect(resultado[1]).toMatchObject({
      value: 10,
      load: 60,
    });
  });

  it("sobrescreve valores anteriores das demais séries (re-executável)", () => {
    const origem = serie({ id: "s1", position: 1, value: 10, load: 60 });
    const destino = serie({
      id: "s2",
      position: 2,
      value: 5,
      load: 20,
    });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(resultado[1]).toMatchObject({
      value: 10,
      load: 60,
    });
  });

  it("null da origem sobrescreve valor existente nas demais", () => {
    const origem = serie({ id: "s1", position: 1, value: 10 });
    const destino = serie({ id: "s2", position: 2, load: 99 });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(resultado[1]).toMatchObject({
      value: 10,
      load: null,
    });
  });

  it("não altera a própria série de origem", () => {
    const origem = serie({
      id: "s1",
      position: 1,
      value: 10,
      load: 60,
    });
    const destino = serie({ id: "s2", position: 2, value: 1 });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(resultado[0]).toMatchObject({
      value: 10,
      load: 60,
    });
  });

  it("preserva position/id/entryId das séries (não reordena nem recria)", () => {
    const origem = serie({ id: "s1", position: 1, value: 10 });
    const meio = serie({ id: "s2", position: 2 });
    const fim = serie({ id: "s3", position: 3 });
    const resultado = aplicarSerieOrigemEmTodas([origem, meio, fim], "s1");

    expect(resultado.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
    expect(resultado.map((s) => s.position)).toEqual([1, 2, 3]);
    expect(resultado.map((s) => s.entryId)).toEqual([
      "entry-1",
      "entry-1",
      "entry-1",
    ]);
  });

  it("não introduz campo de descanso (descanso é campo único da entrada, D4)", () => {
    const origem = serie({ id: "s1", position: 1, value: 10 });
    const destino = serie({ id: "s2", position: 2 });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(Object.keys(resultado[1]).sort()).toEqual(
      [
        "id",
        "entryId",
        "position",
        "value",
        "load",
        "createdAt",
        "created_by",
      ].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// Conversão e formatação de carga (D10 — fator exato 0,45359237 kg/lb)
// ---------------------------------------------------------------------------

describe("converterCarga", () => {
  it("lb → kg multiplica pelo fator exato 0.45359237", () => {
    expect(converterCarga(1, "lb", "kg")).toBe(0.45359237);
    expect(converterCarga(100, "lb", "kg")).toBeCloseTo(45.359237, 9);
  });

  it("kg → lb divide pelo fator exato 0.45359237", () => {
    expect(converterCarga(0.45359237, "kg", "lb")).toBe(1);
  });

  it("mesma unidade devolve o mesmo valor", () => {
    expect(converterCarga(50, "kg", "kg")).toBe(50);
    expect(converterCarga(50, "lb", "lb")).toBe(50);
  });

  it("ida e volta são consistentes (round trip)", () => {
    const ida = converterCarga(100, "kg", "lb");
    const volta = converterCarga(ida, "lb", "kg");
    expect(volta).toBeCloseTo(100, 6);
  });
});

describe("formatarCargaComSecundaria", () => {
  it("kg → lb: secundária convertida com exatamente 1 casa decimal", () => {
    const resultado = formatarCargaComSecundaria(100, "kg");
    expect(resultado.secundaria).toMatch(CASA_DECIMAL);
    expect(parseFloat(String(resultado.secundaria).replace(",", "."))).toBe(
      220.5
    );
  });

  it("lb → kg: secundária convertida com exatamente 1 casa decimal", () => {
    const resultado = formatarCargaComSecundaria(10, "lb");
    expect(resultado.secundaria).toMatch(CASA_DECIMAL);
    expect(parseFloat(String(resultado.secundaria).replace(",", "."))).toBe(
      4.5
    );
  });

  it("principal contém o valor como digitado e a unidade", () => {
    const resultado = formatarCargaComSecundaria(100, "kg");
    expect(resultado.principal).toContain("100");
    expect(resultado.principal).toContain("kg");
  });

  it("principal preserva o decimal digitado", () => {
    const resultado = formatarCargaComSecundaria(12.5, "lb");
    expect(resultado.principal.replace(",", ".")).toContain("12.5");
    expect(resultado.principal).toContain("lb");
  });

  it("unidade nula → secundaria null", () => {
    const resultado = formatarCargaComSecundaria(100, null);
    expect(resultado.secundaria).toBeNull();
    expect(resultado.principal).toContain("100");
  });

  it("zero é exibido como valor (secundária 0 com 1 casa), diferente de vazio", () => {
    const resultado = formatarCargaComSecundaria(0, "kg");
    expect(resultado.principal).toContain("0");
    expect(resultado.secundaria).toMatch(CASA_DECIMAL);
    expect(
      parseFloat(String(resultado.secundaria).replace(",", "."))
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Execução série a série (Mílon #5, TASK-003): regras puras sobre a lista de
// realizadas da execução aberta.
//
// Fonte da verdade: `.agents/modules/milon/05-execucao-series/plan.md` §3
// (Regras puras de workout-utils: contar marcadas recebe a lista de
// realizadas da execução aberta e devolve o total; detectar última marcada
// recebe a lista e o identificador da série do template e indica verdadeiro
// só quando a lista tem exatamente uma linha e ela referencia a série
// informada. Nomes exportados exatos: contarMarcadasNaExecucao e
// ehUltimaMarcada) + `tasks.json` TASK-003.
//
// Escrito ANTES da implementação (outside-in): falha porque
// `contarMarcadasNaExecucao` e `ehUltimaMarcada` ainda não existem em
// `@/lib/milon/workout-utils` — Expected: FAIL nos blocos novos
// (acceptanceCriteria 2 da TASK-003). Hefesto fará GREEN (TASK-004) apenas
// com o contrato do plano — sem inventar APIs.
// ---------------------------------------------------------------------------

const realizada = (
  overrides: Partial<WorkoutExecutionSeries> & { seriesId: string },
): WorkoutExecutionSeries => ({
  id: `done-${overrides.seriesId}`,
  executionId: "exec-1",
  entryId: "ent-1",
  position: 1,
  value: 10,
  load: 40,
  createdAt: "2026-10-08T10:01:00.000Z",
  created_by: "casal@exemplo.com",
  ...overrides,
});

describe("contarMarcadasNaExecucao", () => {
  it("lista vazia → 0 (execução aberta com zero marcadas é estado válido)", () => {
    expect(contarMarcadasNaExecucao([])).toBe(0);
  });

  it("uma realizada → 1", () => {
    expect(contarMarcadasNaExecucao([realizada({ seriesId: "s-1" })])).toBe(1);
  });

  it("duas realizadas → 2 (total da execução aberta)", () => {
    expect(
      contarMarcadasNaExecucao([
        realizada({ seriesId: "s-1", position: 1 }),
        realizada({ seriesId: "s-2", position: 2 }),
      ]),
    ).toBe(2);
  });

  it("três realizadas → 3, independente dos valores de retrato", () => {
    expect(
      contarMarcadasNaExecucao([
        realizada({ seriesId: "s-1", value: 10 }),
        realizada({ seriesId: "s-2", value: null, load: null }),
        realizada({ seriesId: "s-3", value: 30 }),
      ]),
    ).toBe(3);
  });
});

describe("ehUltimaMarcada", () => {
  it("lista vazia → false para qualquer série", () => {
    expect(ehUltimaMarcada([], "s-1")).toBe(false);
  });

  it("exatamente uma linha referenciando a série informada → true", () => {
    expect(ehUltimaMarcada([realizada({ seriesId: "s-1" })], "s-1")).toBe(true);
  });

  it("exatamente uma linha de OUTRA série → false", () => {
    expect(ehUltimaMarcada([realizada({ seriesId: "s-2" })], "s-1")).toBe(false);
  });

  it("duas marcadas → false mesmo para série presente na lista", () => {
    const lista = [
      realizada({ seriesId: "s-1", position: 1 }),
      realizada({ seriesId: "s-2", position: 2 }),
    ];
    expect(ehUltimaMarcada(lista, "s-1")).toBe(false);
    expect(ehUltimaMarcada(lista, "s-2")).toBe(false);
  });

  it("três marcadas → false para qualquer série", () => {
    const lista = [
      realizada({ seriesId: "s-1" }),
      realizada({ seriesId: "s-2" }),
      realizada({ seriesId: "s-3" }),
    ];
    expect(ehUltimaMarcada(lista, "s-1")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Contrato RED da TASK-013 (Mílon #5, Aditamento 2026-10-10 "valor único +
// lb") — consumido pelas TASK-014/015.
// Fonte: tasks.json TASK-013 + plan.md Aditamento 2026-10-10 §1 (Mudanças
// A/B), §3 (contratos de valor único e D38) + spec §3.
// Expected: FAIL em todos os blocos de comportamento (código atual ainda usa
// reps/durationSeconds/libra). O bloco da guarda abreviarUnidadeCarga já é
// verde (a função nunca foi implementada — D38 removeu a ideia do plano).
// Convenção: `value` via cast — o tipo ainda não tem o campo (RED inclui os
// tipos); em runtime o objeto o carrega.
// ---------------------------------------------------------------------------

describe("Milon 05 TASK-013 RED — valor único nas regras puras (D34)", () => {
  type SerieComValor = WorkoutSeries & { value: number | null };

  const serieValor = (
    overrides: Record<string, unknown> & { id: string },
  ): WorkoutSeries =>
    ({
      entryId: "entry-1",
      position: 1,
      value: null,
      load: null,
      createdAt: "2026-10-01T00:00:00.000Z",
      created_by: "casal@exemplo.com",
      ...overrides,
    }) as unknown as WorkoutSeries;

  it("hasSeriePreenchida: série só com value preenchido conta como preenchida", () => {
    expect(hasSeriePreenchida([serieValor({ id: "s1", value: 10 })])).toBe(
      true,
    );
  });

  it("hasSeriePreenchida: value 0 conta como preenchida (0 é valor, não vazio)", () => {
    expect(hasSeriePreenchida([serieValor({ id: "s1", value: 0 })])).toBe(
      true,
    );
  });

  it("aplicarSerieOrigemEmTodas: copia value + carga da origem para as seguintes", () => {
    const origem = serieValor({ id: "s1", position: 1, value: 12, load: 60 });
    const destino = serieValor({ id: "s2", position: 2 });
    const resultado = aplicarSerieOrigemEmTodas(
      [origem, destino],
      "s1",
    ) as unknown as SerieComValor[];
    expect(resultado[1].value).toBe(12);
    expect(resultado[1].load).toBe(60);
  });

  it("aplicarSerieOrigemEmTodas: resultado não carrega reps/durationSeconds", () => {
    const origem = serieValor({ id: "s1", position: 1, value: 12, load: 60 });
    const destino = serieValor({ id: "s2", position: 2 });
    const resultado = aplicarSerieOrigemEmTodas(
      [origem, destino],
      "s1",
    ) as unknown as Array<Record<string, unknown>>;
    expect("reps" in resultado[1]).toBe(false);
    expect("durationSeconds" in resultado[1]).toBe(false);
    expect(resultado[1].value).toBe(12);
  });
});

describe("Milon 05 TASK-013 RED — lb no banco com exibição direta (D38)", () => {
  it("MSG_UNIDADE_OBRIGATORIA cita kg ou lb (nunca libra por extenso)", () => {
    expect(MSG_UNIDADE_OBRIGATORIA).toBe(
      "Escolha a unidade da carga: kg ou lb.",
    );
  });

  it("converterCarga opera com lb: 1 lb → kg usa o fator exato", () => {
    expect(converterCarga(1, "lb" as unknown as LoadUnit, "kg")).toBe(
      0.45359237,
    );
  });

  it("converterCarga opera com lb: ida e volta a partir de lb são consistentes", () => {
    const ida = converterCarga(100, "lb" as unknown as LoadUnit, "kg");
    const volta = converterCarga(ida, "kg", "lb" as unknown as LoadUnit);
    expect(volta).toBeCloseTo(100, 6);
  });

  it("formatarCargaComSecundaria com lb exibe lb direto e secundária em kg", () => {
    const resultado = formatarCargaComSecundaria(10, "lb" as unknown as LoadUnit);
    expect(resultado.principal).toContain("lb");
    expect(resultado.principal).not.toContain("libra");
    expect(parseFloat(String(resultado.secundaria).replace(",", "."))).toBe(
      4.5,
    );
  });

  it("não existe função de transformação de unidade (exibição direta, D38)", () => {
    const fonte = fs.readFileSync(
      path.resolve(__dirname, "../../../lib/milon/workout-utils.ts"),
      "utf8",
    );
    expect(fonte).not.toMatch(/abreviarUnidadeCarga/);
  });
});
