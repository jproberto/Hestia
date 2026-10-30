"use client";

import { Button } from "@/components/ui/button";

export type RestPushPermission = "default" | "granted" | "denied" | "unsupported";

export interface RestPushEnableHintProps {
  supported: boolean;
  permission: RestPushPermission;
  isStandalone: boolean;
  isIOS: boolean;
  requesting: boolean;
  onRequest: () => void;
}

/**
 * Hint de ativação dos avisos de descanso (Mílon #06, plan §3 e DA15).
 * Presentacional por props: renderiza `null` sem suporte à API de notificação
 * ou com permissão diferente de `default` (degradação silenciosa); com
 * `default` exibe o texto base e o botão `Ativar avisos de descanso` (o gesto
 * que dispara `onRequest`); no iPhone não-instalado (`isIOS && !isStandalone`)
 * soma a linha de "Adicionar à Tela Inicial". Nenhuma marcação depende do
 * hint. Textos congelados — sem paráfrase.
 */
export default function RestPushEnableHint({
  supported,
  permission,
  isStandalone,
  isIOS,
  requesting,
  onRequest,
}: RestPushEnableHintProps) {
  if (!supported || permission !== "default") return null;

  return (
    <div className="rounded-md border px-3 py-2 flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Ative os avisos para receber o fim do descanso com a tela apagada.
      </p>
      {isIOS && !isStandalone ? (
        <p className="text-xs text-muted-foreground">
          No iPhone, adicione o Héstia à Tela Inicial para receber avisos com a
          tela apagada.
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={requesting}
          onClick={onRequest}
        >
          Ativar avisos de descanso
        </Button>
      </div>
    </div>
  );
}
