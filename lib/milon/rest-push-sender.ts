// Envio do push do fim de descanso no servidor (Mílon #06, TASK-008).
// Módulo de LADO SERVIDOR: importa `web-push` — nunca entrar em código de
// browser (rota/lá só é consumido por app/api/milon/rest-push/route.ts).
// VAPID lido das env vars da DA8; segredo algum vive no repositório.
// Os erros do web-push propagam como estão (com a propriedade `statusCode`)
// para a rota decidir a remoção de assinatura morta em 404/410 (DA13).
import { sendNotification } from "web-push";
import type { DevicePushSubscription } from "./types";

// Payload congelado da notificação (plan §3 — textos sem paráfrase).
export interface RestEndPushPayload {
  title: string;
  body: string;
  url: string;
}

interface RestPushVapidDetails {
  subject: string;
  publicKey: string;
  privateKey: string;
}

// TTL sob o limite do payload; ida ao device não deve arrastar aviso velho.
const TTL_DESCANSO_SEGUNDOS = 300;

/**
 * Detalhes VAPID do ambiente (DA8): `null` se qualquer uma das três env vars
 * faltar — a rota responde 503 só no `schedule` nesse caso (cancel segue).
 */
export function getRestPushVapidDetails(): RestPushVapidDetails | null {
  const subject = process.env.WEB_PUSH_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return null;
  return { subject, publicKey, privateKey };
}

/**
 * Envia o payload do fim do descanso à assinatura do dispositivo com os
 * detalhes VAPID e TTL de 300 segundos. Falha propaga (a rota responde 200
 * com status erro e, em 404/410, remove a assinatura morta).
 */
export async function sendRestEndPush(
  subscription: DevicePushSubscription,
  payload: RestEndPushPayload,
): Promise<void> {
  const vapidDetails = getRestPushVapidDetails();
  if (!vapidDetails) {
    throw new Error("Configuração de push ausente no servidor.");
  }
  await sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    { TTL: TTL_DESCANSO_SEGUNDOS, vapidDetails },
  );
}
