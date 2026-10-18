// Helpers de push do fim de descanso no cliente (Mílon #06, TASK-006):
// ensureDeviceSubscription (assinatura do navegador sob permissão granted),
// scheduleRestPush/cancelRestPush (POST na rota /api/milon/rest-push) e a
// regra pura urlBase64ToUint8Array (chave pública VAPID base64url → bytes).
// Push é melhor esforço: indisponibilidade vira null/silêncio e nunca
// bloqueia a marcação (spec critério 10); agendamento/cancelamento são
// sempre chamados fire-and-forget pelo useRestTimer.

const ROTA_REST_PUSH = "/api/milon/rest-push";

// Formato do payload de assinatura aceito pela rota (endpoint + chaves).
export interface RestPushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface ScheduleRestPushInput {
  scheduleId: string;
  subscription: RestPushSubscriptionPayload;
  durationSeconds: number;
  exerciseName?: string;
}

/**
 * Converte chave pública VAPID em base64url para os bytes exigidos pelo
 * PushManager (regra pura, teste direto).
 */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Normalizada = `${base64}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64Normalizada);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// O JSON do PushSubscription do navegador tem endpoint e chaves opcionais;
// payload incompleto não serve para a rota — devolve null (indisponibilidade).
function extrairPayload(
  json: PushSubscriptionJSON,
): RestPushSubscriptionPayload | null {
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

async function postRestPush(corpo: Record<string, unknown>): Promise<void> {
  const resposta = await fetch(ROTA_REST_PUSH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    throw new Error(`Agendamento de push recusado (${resposta.status}).`);
  }
}

/**
 * Devolve o JSON da assinatura de push do dispositivo (endpoint + keys) ou
 * `null` quando push está indisponível (sem service worker, permissão não
 * concedida, sem PushManager ou falha interna) — nunca lança.
 */
export async function ensureDeviceSubscription(): Promise<RestPushSubscriptionPayload | null> {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return null;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.serviceWorker ||
      typeof PushManager === "undefined"
    ) {
      return null;
    }
    const registration = await navigator.serviceWorker.ready;
    if (!registration?.pushManager) {
      return null;
    }
    const existente = await registration.pushManager.getSubscription();
    if (existente) {
      return extrairPayload(existente.toJSON());
    }
    const chavePublica = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    if (!chavePublica) {
      return null;
    }
    const inscrita = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(chavePublica),
    });
    return extrairPayload(inscrita.toJSON());
  } catch {
    return null;
  }
}

/** Agenda o fim do descanso na rota; lança em resposta não-2xx. */
export async function scheduleRestPush(input: ScheduleRestPushInput): Promise<void> {
  await postRestPush({
    action: "schedule",
    scheduleId: input.scheduleId,
    durationSeconds: input.durationSeconds,
    exerciseName: input.exerciseName,
    subscription: input.subscription,
  });
}

/** Cancela agendamento na rota; lança em resposta não-2xx. */
export async function cancelRestPush(scheduleId: string): Promise<void> {
  await postRestPush({ action: "cancel", scheduleId });
}
