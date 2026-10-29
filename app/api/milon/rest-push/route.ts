// Primeiro route handler do app (Mílon #06, TASK-008 + Emenda 2026-10-23,
// TASK-021 + Emenda 2 — janela de graça, TASK-026):
// POST /api/milon/rest-push com as ações `schedule` e `cancel`.
//
// Contrato emendado (plan §Emenda — Alavancas 1–3, DA16–DA18): dono
// EXCLUSIVAMENTE da sessão (`auth.getUser()` via utils/supabase/server.ts —
// DA2, nunca do corpo); validações 400; 401 sem sessão; 503 só no `schedule`
// sem VAPID (DA8); 403 de endpoint de outro dono ANTES de qualquer escrita
// (B2). O `schedule` ancora o `fire_at` ao clique do usuário via `elapsed`
// opcional do corpo (DA16 — `agora + max(0, durationSeconds − elapsed/1000)`;
// ausente/inválido → 0, retrocompat com a PWA já instalada, nunca 400), faz
// upsert da assinatura + cancel-all por dono (DA18 — invariante: no máximo 1
// agendado por `created_by`) + INSERT com id gerado no cliente (DA3), registra
// a espera/re-leitura/envio em background via `after()` de next/server (DA17)
// e responde `202` imediatamente com `{scheduleId, status: "agendado"}` — a
// resposta não espera o envio e `202` não significa "enviado". A callback de
// background espera até `fire_at` (cap de 280 s sob o limite de 300 s da
// função — F6/DA9, decisão 7 intacta), espera a janela de graça de 800 ms
// (Emenda 2 — DA22: o cancel do cliente no zero com aba visível chega antes
// do envio), re-lê o status (mata push órfão) e envia; 404/410 remove a
// assinatura morta; demais falhas viram erro com log
// (nunca exceção escapando da callback — DA13). `sent_at` é preenchido só por
// `markRestScheduleSent` após o envio real. O `cancel` permanece síncrono no
// request (`200` `{scheduleId, cancelled}`).
//
// Persistência pelos repositórios do módulo via barrel `lib/milon/db/push`
// sobre o client server envelopado no SupabaseDatabaseClient (DA14); nenhum
// pacote Supabase é importado aqui (o helper de utils/supabase/server.ts é o
// único ponto autorizado do adaptador Supabase no servidor).
import { after } from "next/server";
import {
  SupabaseDatabaseClient,
  type SupabaseLikeClient,
} from "@/lib/shared/supabaseClient";
import { createClient } from "@/utils/supabase/server";
import {
  cancelAllRestSchedulesByOwner,
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
// Janela de graça da Emenda 2 (Mecanismo 2 / DA22 — valor congelado na spec):
// espera-se após a janela ANTES da re-leitura para que o cancel do cliente
// (disparado ~no zero com aba visível, RTT de dezenas de ms) chegue ao
// servidor antes de qualquer envio.
const JANELA_GRACA_ENVIO_MS = 800;
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
 * `elapsed` do corpo (Alavanca 1 / DA16): ms entre o clique que iniciou o
 * timer e o POST. Só número finito maior que zero é usado; ausente, negativo,
 * não-numérico ou não-finito cai no 0 (retrocompat com a PWA já instalada —
 * nunca 400). `elapsed ≥ duração` resulta em `fire_at = agora` (envio
 * imediato em background).
 */
function normalizarElapsed(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0
    ? valor
    : 0;
}

/**
 * `schedule` — valida, grava assinatura (autoria da sessão), cancela todo
 * agendamento anterior do dono (Alavanca 3), grava o novo agendamento (id do
 * cliente; `fire_at` ancorado ao clique via `elapsed` — Alavanca 1) e responde
 * `202` imediatamente; a espera + re-leitura + envio rodam em background via
 * `after()` (Alavanca 2).
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
  // Alavanca 3 (DA18): cancel-all por dono ANTES do INSERT — invariante de no
  // máximo 1 agendamento `agendado` por `created_by` no servidor (mata órfãos
  // de reload, aba dupla e cancel perdido).
  await cancelAllRestSchedulesByOwner(db, dono);
  // Alavanca 1 (DA16): `fire_at = agora + max(0, duration − elapsed/1000)` —
  // o relógio de referência é o clique do usuário; só a diferença medida no
  // cliente importa (imune a clock-skew).
  const elapsedMs = normalizarElapsed(corpo.elapsed);
  const restanteSegundos = Math.max(0, durationSeconds - elapsedMs / 1000);
  const fireAt = new Date(Date.now() + restanteSegundos * 1000).toISOString();
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

  const exerciseName =
    typeof corpo.exerciseName === "string" && corpo.exerciseName.length > 0
      ? corpo.exerciseName
      : undefined;

  // Alavanca 2 (DA17): espera + re-leitura + envio em background — a resposta
  // 202 não espera nada; `202` não significa "enviado".
  after(async () => {
    try {
      // Espera até o fim planejado, cortada pela janela da função (decisão 7:
      // descanso > janela envia ao fim da janela; a camada visual cobre).
      const restanteMs = new Date(fireAt).getTime() - Date.now();
      await dormir(Math.min(Math.max(restanteMs, 0), JANELA_ESPERA_MS));

      // Janela de graça da Emenda 2 (DA22): composta DEPOIS da espera (e
      // depois do cap, nunca dentro) — o cancel do cliente no zero com aba
      // visível chega ao servidor dentro dela.
      await dormir(JANELA_GRACA_ENVIO_MS);

      // Re-leitura (pós-graça): um cancelamento (ou cancel-all de novo
      // agendamento do dono) durante a espera não pode virar push órfão. Sem
      // linha (ex.: remoção em cascata) o desfecho é o mesmo de cancelado:
      // nunca enviar, terminando sem espera adicional (a graça é UMA).
      const atual = await findRestScheduleById(db, scheduleId);
      if (!atual || atual.status !== "agendado") return;

      const payload = {
        title: TITULO_DESCANSO,
        body: exerciseName
          ? `Descanso de ${exerciseName} terminou.`
          : CORPO_SEM_NOME,
        url: URL_TREINO_DO_DIA,
      };

      await sendRestEndPush(assinatura, payload);
      await markRestScheduleSent(db, scheduleId);
    } catch (erro) {
      const statusCode = (erro as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await deleteSubscriptionByEndpoint(db, assinatura.endpoint);
      }
      await markRestScheduleFailed(db, scheduleId);
      console.error("Falha ao enviar push do fim do descanso:", erro);
    }
  });

  return resposta(202, { scheduleId, status: "agendado" });
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
