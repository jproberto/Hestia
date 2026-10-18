// Primeiro route handler do app (Mílon #06, TASK-008):
// POST /api/milon/rest-push com as ações `schedule` e `cancel`.
//
// Contrato (plan §3): dono EXCLUSIVAMENTE da sessão (`auth.getUser()` via
// utils/supabase/server.ts — DA2, nunca do corpo); validações 400; 401 sem
// sessão; 503 só no `schedule` sem VAPID (DA8); upsert da assinatura + criação
// do agendamento com id gerado no cliente (DA3) e `fire_at` do relógio do
// servidor; espera de até 280 s sob o limite de 300 s da função (F6, DA9) com
// re-leitura do status antes do envio (mata push órfão); 404/410 remove a
// assinatura morta; demais falhas de envio viram status erro com log e resposta
// 200 (nunca exceção não tratada — DA13).
//
// Persistência pelos repositórios do módulo via barrel `lib/milon/db/push`
// sobre o client server envelopado no SupabaseDatabaseClient (DA14); nenhum
// pacote Supabase é importado aqui (o helper de utils/supabase/server.ts é o
// único ponto autorizado do adaptador Supabase no servidor).
import {
  SupabaseDatabaseClient,
  type SupabaseLikeClient,
} from "@/lib/shared/supabaseClient";
import { createClient } from "@/utils/supabase/server";
import {
  cancelRestSchedule,
  createRestSchedule,
  deleteSubscriptionByEndpoint,
  findRestScheduleById,
  findSubscriptionByEndpoint,
  markRestScheduleFailed,
  markRestScheduleSent,
  upsertSubscription,
} from "@/lib/milon/db/push";
import {
  getRestPushVapidDetails,
  sendRestEndPush,
} from "@/lib/milon/rest-push-sender";

// Janela máxima da função da Vercel Hobby (F6); o sleep usa a margem abaixo.
export const maxDuration = 300;

// Margem de segurança sob o limite real de 300 s (DA9).
const JANELA_ESPERA_MS = 280_000;
const DURACAO_MIN_SEGUNDOS = 1;
const DURACAO_MAX_SEGUNDOS = 86_400;

// Payload congelado da notificação (plan §3 — textos sem paráfrase).
const TITULO_DESCANSO = "Descanso terminado";
const URL_TREINO_DO_DIA = "/milon/today";
const CORPO_SEM_NOME = "O descanso terminou.";

const MENSAGEM_401 = "Não autenticado.";
const MENSAGEM_400 = "Requisição inválida.";
const MENSAGEM_403 = "Assinatura de push pertence a outro usuário.";
const MENSAGEM_503 = "Configuração de push ausente no servidor.";

type Corpo = Record<string, unknown>;

function resposta(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function lerCorpo(request: Request): Promise<Corpo | null> {
  try {
    const corpo: unknown = await request.json();
    if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) {
      return null;
    }
    return corpo as Corpo;
  } catch {
    return null;
  }
}

function textoNaoVazio(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length > 0;
}

function assinaturaValida(valor: unknown): boolean {
  if (typeof valor !== "object" || valor === null) return false;
  const { endpoint, keys } = valor as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown } | null;
  };
  if (!textoNaoVazio(endpoint)) return false;
  if (typeof keys !== "object" || keys === null) return false;
  return textoNaoVazio(keys.p256dh) && textoNaoVazio(keys.auth);
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `cancel` — cancela o agendamento do próprio dono ainda agendado (a guarda de
 * dono + status fica no repositório, que devolve false para linha alheia,
 * inexistente ou já terminal).
 */
async function cancelar(
  db: SupabaseDatabaseClient,
  corpo: Corpo,
  dono: string,
): Promise<Response> {
  const { scheduleId } = corpo;
  if (!textoNaoVazio(scheduleId)) {
    return resposta(400, { error: MENSAGEM_400 });
  }
  const cancelled = await cancelRestSchedule(db, scheduleId, dono);
  return resposta(200, { scheduleId, cancelled });
}

/**
 * `schedule` — valida, grava assinatura (autoria da sessão) e agendamento
 * (id do cliente, fire_at do relógio do servidor), espera dentro da janela,
 * re-lê o status e envia.
 */
async function agendar(
  db: SupabaseDatabaseClient,
  corpo: Corpo,
  dono: string,
): Promise<Response> {
  const { scheduleId, durationSeconds, subscription } = corpo;
  const durationValida =
    typeof durationSeconds === "number" &&
    Number.isInteger(durationSeconds) &&
    durationSeconds >= DURACAO_MIN_SEGUNDOS &&
    durationSeconds <= DURACAO_MAX_SEGUNDOS;
  if (
    !textoNaoVazio(scheduleId) ||
    !durationValida ||
    !assinaturaValida(subscription)
  ) {
    return resposta(400, { error: MENSAGEM_400 });
  }

  // VAPID ausente só degrada o envio: 503 sem gravar agendamento órfão (DA8).
  if (!getRestPushVapidDetails()) {
    return resposta(503, { error: MENSAGEM_503 });
  }

  const { endpoint, keys } = subscription as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  // Propriedade da assinatura (DA2 / spec: o endpoint nunca envia o push do
  // descanso para outro usuário): endpoint já inscrito pertence ao dono da
  // linha — recusa ANTES de qualquer escrita/envio quando a sessão não é o
  // dono (sem reatribuir created_by alheio; a reinscrição do próprio dono
  // e o endpoint novo seguem o fluxo normal).
  const existente = await findSubscriptionByEndpoint(db, endpoint);
  if (existente && existente.created_by !== dono) {
    return resposta(403, { error: MENSAGEM_403 });
  }
  const assinatura = await upsertSubscription(
    db,
    { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    dono,
  );
  const fireAt = new Date(
    Date.now() + durationSeconds * 1000,
  ).toISOString();
  await createRestSchedule(
    db,
    {
      id: scheduleId,
      subscriptionId: assinatura.id,
      durationSeconds,
      fireAt,
    },
    dono,
  );

  // Espera até o fim planejado, cortada pela janela da função (decisão 7 da
  // spec: descanso > janela envia ao fim da janela; a camada visual cobre).
  const restanteMs = new Date(fireAt).getTime() - Date.now();
  await dormir(Math.min(Math.max(restanteMs, 0), JANELA_ESPERA_MS));

  // Re-leitura: um cancelamento durante a espera não pode virar push órfão.
  const atual = await findRestScheduleById(db, scheduleId);
  if (!atual || atual.status !== "agendado") {
    // Sem linha (ex.: assinatura removida em cascata) o desfecho observável é
    // o mesmo de um cancelamento: nunca enviar.
    return resposta(200, {
      scheduleId,
      status: atual?.status ?? "cancelado",
    });
  }

  const exerciseName =
    typeof corpo.exerciseName === "string" && corpo.exerciseName.length > 0
      ? corpo.exerciseName
      : undefined;
  const payload = {
    title: TITULO_DESCANSO,
    body: exerciseName
      ? `Descanso de ${exerciseName} terminou.`
      : CORPO_SEM_NOME,
    url: URL_TREINO_DO_DIA,
  };

  try {
    await sendRestEndPush(assinatura, payload);
    await markRestScheduleSent(db, scheduleId);
    return resposta(200, { scheduleId, status: "enviado" });
  } catch (erro) {
    const statusCode = (erro as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await deleteSubscriptionByEndpoint(db, assinatura.endpoint);
    }
    await markRestScheduleFailed(db, scheduleId);
    console.error("Falha ao enviar push do fim do descanso:", erro);
    return resposta(200, { scheduleId, status: "erro" });
  }
}

export async function POST(request: Request): Promise<Response> {
  const clientServer = await createClient();
  const db = new SupabaseDatabaseClient(
    clientServer as unknown as SupabaseLikeClient,
  );
  const dono = await db.getUserEmail();
  if (!dono) {
    return resposta(401, { error: MENSAGEM_401 });
  }

  const corpo = await lerCorpo(request);
  if (!corpo) {
    return resposta(400, { error: MENSAGEM_400 });
  }

  if (corpo.action === "schedule") return agendar(db, corpo, dono);
  if (corpo.action === "cancel") return cancelar(db, corpo, dono);
  return resposta(400, { error: MENSAGEM_400 });
}
