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

export function getMonthLabel(month: number): string {
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return names[month - 1] ?? "";
}