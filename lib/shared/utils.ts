export type ItemUrgency = "completed" | "overdue" | "warning" | "ondue";

export function getItemUrgency(
  item: { day: number; is_completed: boolean },
  selectedYear: number,
  selectedMonth: number
): ItemUrgency {
  if (item.is_completed) return "completed";

  const today = new Date();
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const itemDate = new Date(selectedYear, selectedMonth - 1, item.day);

  const diffTime = itemDate.getTime() - todayZero.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "warning";
  return "ondue";
}

export function getUrgencyBadgeConfig(urgency: ItemUrgency, day?: number) {
  switch (urgency) {
    case "completed":
      return {
        rowBg: "opacity-60 bg-muted/30",
        badgeBg: "bg-muted text-muted-foreground border border-border",
        statusIcon: "completed",
        statusLabel: "Concluída",
      };
    case "overdue":
      return {
        rowBg: "",
        badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-semibold",
        statusIcon: "overdue",
        statusLabel: day ? `Vencida (Dia ${day})` : "Vencida",
      };
    case "warning":
      return {
        rowBg: "",
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 font-semibold",
        statusIcon: "warning",
        statusLabel: day ? `Dia ${day} (Em breve)` : "Em breve",
      };
    default:
      return {
        rowBg: "",
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50",
        statusIcon: "ondue",
        statusLabel: day ? `Dia ${day}` : "Dia",
      };
  }
}