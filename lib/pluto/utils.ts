export type {
  ItemUrgency,
} from "@/lib/shared";

export {
  MONTH_NAMES,
  formatCurrency,
  formatCurrencyOptional,
  formatDateBR,
  getMonthRange,
  parseYearMonth,
  getItemUrgency,
  getUrgencyBadgeConfig,
} from "@/lib/shared";

/**
 * Chave de identidade de nomes de categoria e de conta (R1/D8 — Pluto 11).
 *
 * trim das pontas + mesma forma Unicode (composto = decomposto) + remoção de
 * acentos (marcas combinantes) + caixa minúscula. É a ÚNICA implementação
 * desta regra no código cliente (DT-1) — repositórios, fakes, hooks e
 * componentes importam daqui. O texto **salvo** nunca passa por ela (D2/R3).
 */
export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getMonthLabel(month: number): string {
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return names[month - 1] ?? "";
}