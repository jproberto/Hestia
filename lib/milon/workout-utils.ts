// Regras puras de treinos e séries do módulo Mílon (sem I/O, sem repositório).
// Ver Mapa de Camadas no AGENTS.md + plan.md §3 (contrato textual das utilidades).
import type {
  LoadUnit,
  WorkoutExecutionSeries,
  WorkoutSeries,
} from "@/lib/milon/types";

export const MSG_TREINO_COM_EXERCICIOS =
  "Este treino possui exercícios. Remova-os antes de excluir o treino.";

export const MSG_PROGRAMA_COM_TREINOS =
  "Este programa possui treinos. Esvazie-o antes de excluir.";

export const MSG_EXERCICIO_JA_NO_PROGRAMA =
  "Este exercício já está em um treino deste programa. Escolha outro exercício.";

export const MSG_EXERCICIO_JA_NO_TREINO =
  "Este exercício já está neste treino. Escolha outro exercício.";

export const MSG_NOME_TREINO_OBRIGATORIO = "Informe o nome do treino.";

export const MSG_NOME_TREINO_DUPLICADO =
  "Já existe um treino com esse nome neste programa.";

export const MSG_QUANTIDADE_SERIES_INVALIDA =
  "Informe a quantidade de séries (número inteiro maior ou igual a 1).";

export const MSG_CARGA_NEGATIVA = "A carga não pode ser negativa.";

export const MSG_UNIDADE_OBRIGATORIA =
  "Escolha a unidade da carga: kg ou lb.";

export const MSG_CARGA_NAO_NUMERICA =
  "Informe um valor numérico válido para a carga.";

const FATOR_LB_PARA_KG = 0.45359237;

export function normalizarNomeTreino(valor: string): string {
  return valor.trim().replace(/\s+/g, " ");
}

export function validarNomeTreino(nomeNormalizado: string): string | null {
  if (nomeNormalizado.trim() === "") {
    return MSG_NOME_TREINO_OBRIGATORIO;
  }
  return null;
}

export function nomesTreinoIguais(a: string, b: string): boolean {
  return (
    normalizarNomeTreino(a).toLowerCase() ===
    normalizarNomeTreino(b).toLowerCase()
  );
}

export function validarNomeUnicoNoPrograma(
  nomeNormalizado: string,
  nomesExistentesExceto: string[],
): string | null {
  const colide = nomesExistentesExceto.some((existente) =>
    nomesTreinoIguais(nomeNormalizado, existente),
  );
  return colide ? MSG_NOME_TREINO_DUPLICADO : null;
}

export function rotuloSequencial(indice: number): string {
  let n = indice + 1;
  let rotulo = "";
  while (n > 0) {
    n -= 1;
    rotulo = String.fromCharCode(65 + (n % 26)) + rotulo;
    n = Math.floor(n / 26);
  }
  return rotulo;
}

export function sugerirNomeTreino(nomesExistentes: string[]): string {
  for (let indice = 0; ; indice += 1) {
    const candidato = `Treino ${rotuloSequencial(indice)}`;
    const ocupado = nomesExistentes.some((existente) =>
      nomesTreinoIguais(candidato, existente),
    );
    if (!ocupado) {
      return candidato;
    }
  }
}

export function gerarSubtituloMusculares(musculos: string[]): string {
  const unicos: string[] = [];
  for (const musculo of musculos) {
    if (!unicos.includes(musculo)) {
      unicos.push(musculo);
    }
  }
  if (unicos.length === 0) {
    return "";
  }
  if (unicos.length === 1) {
    return unicos[0];
  }
  if (unicos.length === 2) {
    return `${unicos[0]} e ${unicos[1]}`;
  }
  return `${unicos.slice(0, -1).join(", ")} e ${unicos[unicos.length - 1]}`;
}

export function interpretarQuantidadeSeries(
  valorBruto: string,
): { valido: false } | { valido: true; quantidade: number } {
  const texto = valorBruto.trim();
  if (!/^\d+$/.test(texto)) {
    return { valido: false };
  }
  return { valido: true, quantidade: Number(texto) };
}

export function validarInteiroCampo(
  valorBruto: string,
  rotulo: string,
): { ok: true; valor: number | null } | { ok: false; mensagem: string } {
  const texto = valorBruto.trim();
  if (texto === "") {
    return { ok: true, valor: null };
  }
  if (!/^\d+$/.test(texto)) {
    return {
      ok: false,
      mensagem: `Use um número inteiro maior ou igual a zero para ${rotulo}.`,
    };
  }
  return { ok: true, valor: Number(texto) };
}

export function validarCarga(
  valorBruto: string,
): { ok: true; valor: number | null } | { ok: false; mensagem: string } {
  const texto = valorBruto.trim();
  if (texto === "") {
    return { ok: true, valor: null };
  }
  const numero = Number(texto.replace(",", "."));
  if (!Number.isFinite(numero)) {
    return { ok: false, mensagem: MSG_CARGA_NAO_NUMERICA };
  }
  if (numero < 0) {
    return { ok: false, mensagem: MSG_CARGA_NEGATIVA };
  }
  return { ok: true, valor: numero };
}

export function hasSeriePreenchida(series: WorkoutSeries[]): boolean {
  return series.some((s) => s.value != null || s.load != null);
}

export function aplicarSerieOrigemEmTodas(
  series: WorkoutSeries[],
  origemId: string,
): WorkoutSeries[] {
  const origem = series.find((s) => s.id === origemId);
  if (!origem) {
    return series.map((s) => ({ ...s }));
  }
  return series.map((s) => {
    if (s.id === origemId) {
      return { ...s };
    }
    // Construção explícita com valor único + carga (D34): o resultado nunca
    // carrega as colunas antigas (removidas na migração 0013).
    return {
      id: s.id,
      entryId: s.entryId,
      position: s.position,
      value: origem.value,
      load: origem.load,
      createdAt: s.createdAt,
      created_by: s.created_by,
    };
  });
}

export function converterCarga(
  valor: number,
  de: LoadUnit,
  para: LoadUnit,
): number {
  if (de === para) {
    return valor;
  }
  if (de === "lb") {
    return valor * FATOR_LB_PARA_KG;
  }
  return valor / FATOR_LB_PARA_KG;
}

export function formatarCargaComSecundaria(
  valor: number,
  unidade: LoadUnit | null,
): { principal: string; secundaria: string | null } {
  if (unidade === null) {
    return { principal: String(valor), secundaria: null };
  }
  // Exibição direta do valor do banco (D38): sem transformação, sem abreviação.
  const secundariaUnidade: LoadUnit = unidade === "kg" ? "lb" : "kg";
  const secundaria = converterCarga(valor, unidade, secundariaUnidade).toFixed(1);
  return { principal: `${valor} ${unidade}`, secundaria };
}

// Execução série a série (Mílon #5, D1): o feito de uma série é a existência
// da linha realizada correspondente na execução aberta — nunca coluna do
// template. As duas regras abaixo operam só sobre essa lista de realizadas.
export function contarMarcadasNaExecucao(
  realizadas: WorkoutExecutionSeries[],
): number {
  return realizadas.length;
}

export function ehUltimaMarcada(
  realizadas: WorkoutExecutionSeries[],
  seriesId: string,
): boolean {
  return realizadas.length === 1 && realizadas[0].seriesId === seriesId;
}
