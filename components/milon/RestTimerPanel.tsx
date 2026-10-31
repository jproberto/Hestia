"use client";

import { Button } from "@/components/ui/button";
import { formatarContagemDescanso } from "@/lib/milon/utils";

export interface RestTimerPanelProps {
  exerciseName: string | null;
  remainingSeconds: number | null;
  finished: boolean;
  onDismiss: () => void;
}

/**
 * Painel visual do timer de descanso (Mílon #06, plan §3).
 * Presentacional por props: contagem `mm:ss` com o nome do exercício
 * (`role="status"`) enquanto roda; alerta de fim descartável
 * (`role="alert"`, textos congelados, botão `Fechar`) quando `finished`;
 * `null` sem contagem e sem fim. Sem som, sem vibração, sem modal
 * (decisão 1 da spec).
 */
export default function RestTimerPanel({
  exerciseName,
  remainingSeconds,
  finished,
  onDismiss,
}: RestTimerPanelProps) {
  if (finished) {
    const alerta = exerciseName
      ? `Descanso de ${exerciseName} terminou.`
      : "O descanso terminou.";
    return (
      <div
        role="alert"
        className="rounded-md border border-[#B7602B] bg-card px-3 py-2 flex flex-col gap-2"
      >
        <p className="font-display text-base tracking-wide text-[#B7602B]">
          {alerta}
        </p>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  if (remainingSeconds === null) return null;

  const rotulo = exerciseName ? `Descanso — ${exerciseName}` : "Descanso";
  return (
    <div
      role="status"
      className="rounded-md border px-3 py-2 flex items-center justify-between gap-3"
    >
      <span className="font-display text-base tracking-wide text-[#B7602B]">
        {rotulo}
      </span>
      <span className="text-sm font-semibold tabular-nums">
        {formatarContagemDescanso(remainingSeconds)}
      </span>
    </div>
  );
}
