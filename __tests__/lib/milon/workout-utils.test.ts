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
import type { WorkoutSeries } from "@/lib/milon/types";
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
} from "@/lib/milon/workout-utils";

// ---------------------------------------------------------------------------
// Helpers de teste (nunca reimplementam regra de produção — só observam)
// ---------------------------------------------------------------------------

const serie = (
  overrides: Partial<WorkoutSeries> & { id: string }
): WorkoutSeries => ({
  entryId: "entry-1",
  position: 1,
  reps: null,
  durationSeconds: null,
  load: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  created_by: "casal@exemplo.com",
  ...overrides,
});

/** "Treino A" … "Treino Z" sem depender de `rotuloSequencial` (evita acoplar). */
const treinosDeAaZ = (): string[] =>
  Array.from({ length: 26 }, (_, i) => `Treino ${String.fromCharCode(65 + i)}`);

/** Aceita 1 casa decimal com separador "." ou "," e sufixo de unidade opcional. */
const CASA_DECIMAL = /^\d+[.,]\d(\s*(kg|libra))?$/;

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
      "Escolha a unidade da carga: kg ou libra."
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

  it("só reps preenchido → true", () => {
    expect(hasSeriePreenchida([serie({ id: "s1", reps: 10 })])).toBe(true);
  });

  it("só tempo preenchido → true", () => {
    expect(
      hasSeriePreenchida([serie({ id: "s1", durationSeconds: 30 })])
    ).toBe(true);
  });

  it("carga 0 conta como preenchida (0 é valor, não vazio)", () => {
    expect(hasSeriePreenchida([serie({ id: "s1", load: 0 })])).toBe(true);
  });

  it("alguma preenchida entre vazias → true", () => {
    expect(
      hasSeriePreenchida([
        serie({ id: "s1" }),
        serie({ id: "s2", reps: 8 }),
        serie({ id: "s3" }),
      ])
    ).toBe(true);
  });
});

describe("aplicarSerieOrigemEmTodas", () => {
  it("copia reps/durationSeconds/load da origem para as demais séries", () => {
    const origem = serie({
      id: "s1",
      position: 1,
      reps: 10,
      durationSeconds: 30,
      load: 60,
    });
    const destino = serie({ id: "s2", position: 2 });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(resultado).toHaveLength(2);
    expect(resultado[1]).toMatchObject({
      reps: 10,
      durationSeconds: 30,
      load: 60,
    });
  });

  it("sobrescreve valores anteriores das demais séries (re-executável)", () => {
    const origem = serie({ id: "s1", position: 1, reps: 10, load: 60 });
    const destino = serie({
      id: "s2",
      position: 2,
      reps: 5,
      durationSeconds: 90,
      load: 20,
    });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(resultado[1]).toMatchObject({
      reps: 10,
      durationSeconds: null,
      load: 60,
    });
  });

  it("null da origem sobrescreve valor existente nas demais", () => {
    const origem = serie({ id: "s1", position: 1, reps: 10 });
    const destino = serie({ id: "s2", position: 2, load: 99 });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(resultado[1]).toMatchObject({
      reps: 10,
      durationSeconds: null,
      load: null,
    });
  });

  it("não altera a própria série de origem", () => {
    const origem = serie({
      id: "s1",
      position: 1,
      reps: 10,
      durationSeconds: 30,
      load: 60,
    });
    const destino = serie({ id: "s2", position: 2, reps: 1 });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(resultado[0]).toMatchObject({
      reps: 10,
      durationSeconds: 30,
      load: 60,
    });
  });

  it("preserva position/id/entryId das séries (não reordena nem recria)", () => {
    const origem = serie({ id: "s1", position: 1, reps: 10 });
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
    const origem = serie({ id: "s1", position: 1, reps: 10 });
    const destino = serie({ id: "s2", position: 2 });
    const resultado = aplicarSerieOrigemEmTodas([origem, destino], "s1");

    expect(Object.keys(resultado[1]).sort()).toEqual(
      [
        "id",
        "entryId",
        "position",
        "reps",
        "durationSeconds",
        "load",
        "createdAt",
        "created_by",
      ].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// Conversão e formatação de carga (D10 — fator exato 0,45359237 kg/libra)
// ---------------------------------------------------------------------------

describe("converterCarga", () => {
  it("libra → kg multiplica pelo fator exato 0.45359237", () => {
    expect(converterCarga(1, "libra", "kg")).toBe(0.45359237);
    expect(converterCarga(100, "libra", "kg")).toBeCloseTo(45.359237, 9);
  });

  it("kg → libra divide pelo fator exato 0.45359237", () => {
    expect(converterCarga(0.45359237, "kg", "libra")).toBe(1);
  });

  it("mesma unidade devolve o mesmo valor", () => {
    expect(converterCarga(50, "kg", "kg")).toBe(50);
    expect(converterCarga(50, "libra", "libra")).toBe(50);
  });

  it("ida e volta são consistentes (round trip)", () => {
    const ida = converterCarga(100, "kg", "libra");
    const volta = converterCarga(ida, "libra", "kg");
    expect(volta).toBeCloseTo(100, 6);
  });
});

describe("formatarCargaComSecundaria", () => {
  it("kg → libra: secundária convertida com exatamente 1 casa decimal", () => {
    const resultado = formatarCargaComSecundaria(100, "kg");
    expect(resultado.secundaria).toMatch(CASA_DECIMAL);
    expect(parseFloat(String(resultado.secundaria).replace(",", "."))).toBe(
      220.5
    );
  });

  it("libra → kg: secundária convertida com exatamente 1 casa decimal", () => {
    const resultado = formatarCargaComSecundaria(10, "libra");
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
    const resultado = formatarCargaComSecundaria(12.5, "libra");
    expect(resultado.principal.replace(",", ".")).toContain("12.5");
    expect(resultado.principal).toContain("libra");
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
