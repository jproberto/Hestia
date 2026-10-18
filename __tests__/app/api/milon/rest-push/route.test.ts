// @vitest-environment node
/**
 * Contrato RED — Mílon #06 Timer de descanso auto + PWA push (TASK-007):
 * `app/api/milon/rest-push/route.ts` (ainda INEXISTENTE) — primeiro route
 * handler do app: `POST /api/milon/rest-push` com as ações `schedule` e
 * `cancel`.
 *
 * Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/spec.md`
 * (§3 endpoint/cancelamento/push somente ao dono; §6 F6/F8/decisão 7 —
 * descanso >300 s envia ao fim da janela) + `plan.md` §3 (Rota POST
 * /api/milon/rest-push — corpo, validações, respostas, sleep de até 280 s,
 * re-leitura de status, remoção de assinatura morta; Sender — VAPID via env
 * e TTL 300; textos congelados de erro) + `tasks.json` TASK-007
 * (acceptanceCriteria — fonte da cobertura de cada caso).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/app/api/milon/rest-push/route` ainda não existe — Expected: FAIL com
 * falha de coleta "Cannot find module" (acceptanceCriteria 1 da TASK-007).
 * Hefesto fará GREEN (TASK-008) apenas com o contrato descrito no plano —
 * sem inventar APIs.
 *
 * Ambiente node (pragma no topo — a rota é lado servidor) com fake timers
 * (relógio do servidor determinístico: `fire_at` e a janela de 280 s
 * observáveis sem dormir). Harness validado empiricamente: `Request.json()`,
 * `setTimeout` e o dreno de microtarefas funcionam com fake timers neste
 * ambiente.
 *
 * MOCKS (plan §2 — rota testada com mocks de utils/supabase/server.ts,
 * repositories via barrel e web-push):
 * - `@/utils/supabase/server` — `createClient` devolve a "sessão"
 *   (`auth.getUser`); o dono é SEMPRE o e-mail da sessão (DA2 — nunca do
 *   corpo);
 * - `@/lib/shared/supabaseClient` — stub do `SupabaseDatabaseClient` (mesma
 *   superfície de auth do real) para a rota envolver o client server (DA14);
 * - `@/lib/milon/db/push` — barrel oficial mockado com as sete operações
 *   (forma com `db:` — a rota consome repositories com o client server, não
 *   os standalones);
 * - `web-push` — mockado via `vi.hoisted` + factory (o pacote/@types são da
 *   TASK-008; o handle do mock vem do hoisted para o `tsc --noEmit` do RED
 *   acusar SOMENTE os Cannot find module dos módulos-alvo). O sender real
 *   (`lib/milon/rest-push-sender.ts`) roda de ponta a ponta: o payload
 *   exato, o TTL 300 e os VAPID details são observados no `sendNotification`
 *   (contrato do plan §3 — Sender).
 *
 * CONTRATO CONSUMIDO (plan.md §3 — rota POST /api/milon/rest-push):
 * - `POST` com `export const maxDuration = 300`;
 * - dono exclusivamente de `user.email` da sessão; sem sessão → `401` com
 *   `Não autenticado.` e SEM tocar em persistência;
 * - corpo malformado, `action` desconhecida, `durationSeconds` fora de
 *   1–86400 (não inteiro incluso) ou assinatura sem `endpoint`/chaves →
 *   `400` com `Requisição inválida.`;
 * - VAPID ausente no ambiente → `503` com `Configuração de push ausente no
 *   servidor.` SOMENTE em `schedule`; `cancel` segue funcionando;
 * - `schedule`: upsert da assinatura com a autoria da sessão → criação do
 *   agendamento com o id vindo do corpo e `fire_at` = relógio do servidor +
 *   `durationSeconds` → espera `min(reatante, 280 segundos)` → re-leitura
 *   por id: se não for mais `agendado`, responde `200` com
 *   `{scheduleId, status}` SEM enviar (mata push órfão) → envio → `200` com
 *   `{scheduleId, status: "enviado" | "erro" | "cancelado"}`;
 * - erro do `web-push` com `statusCode` 404/410 remove a assinatura morta
 *   pelo endpoint e marca `erro`; demais erros marcam `erro` e respondem
 *   `200` (nunca exceção não tratada);
 * - `cancel`: `cancelRestSchedule` com id + autoria da sessão → `200` com
 *   `{scheduleId, cancelled}` (`true` somente quando o repositório teve
 *   efeito);
 * - payload do envio congelado: título `Descanso terminado`, corpo
 *   `Descanso de <exercício> terminou.` (ou `O descanso terminou.` sem
 *   nome), url `/milon/today`, TTL 300 segundos.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST, maxDuration } from "@/app/api/milon/rest-push/route";
import { createClient } from "@/utils/supabase/server";
import { SupabaseDatabaseClient } from "@/lib/shared/supabaseClient";
import {
  upsertSubscription,
  createRestSchedule,
  findRestScheduleById,
  cancelRestSchedule,
  markRestScheduleSent,
  markRestScheduleFailed,
  deleteSubscriptionByEndpoint,
} from "@/lib/milon/db/push";
import type {
  DevicePushSubscription,
  RestPushSchedule,
} from "@/lib/milon/types";

// ---------------------------------------------------------------------------
// Mock de `web-push` sem import do pacote (vi.hoisted — o pacote e os @types
// entram na TASK-008; importá-lo aqui quebraria o "só Cannot find module nos
// módulos-alvo" do tsc do RED).
// ---------------------------------------------------------------------------

const { sendNotificationMock, findSubscriptionByEndpointMock } = vi.hoisted(
  () => ({
    sendNotificationMock: vi.fn(),
    // Leitura de assinatura por endpoint — operação exigida pela correção do
    // blocker B2 da review (Argos, finding security): localizar a assinatura
    // existente ANTES do upsert e recusar quando `created_by` difere da
    // sessão. O barrel real ainda não a exporta (é a correção do Hefesto);
    // declarar aqui no hoisted mantém o `tsc --noEmit` do RED apontando só
    // para o código real (sem import de export inexistente) e deixa o mock
    // pronto para a rota consumir. Nome espelha a convenção do módulo
    // (`deleteSubscriptionByEndpoint`/`findRestScheduleById`) + a sugestão do
    // finding; se a correção adotar outro nome, Minos ajusta este mock
    // (regra 3 — atualização proativa de testes).
    findSubscriptionByEndpointMock: vi.fn(),
  }),
);

vi.mock("web-push", () => ({
  default: { sendNotification: sendNotificationMock },
  sendNotification: sendNotificationMock,
}));

// -------------------------------------------------------------------------
// Mocks dos módulos consumidos pela rota (plan §2/§3)
// -------------------------------------------------------------------------

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Stub do wrapper do client server: mesma superfície de auth do real
// `SupabaseDatabaseClient` (DA14 — a rota envolve o client de
// utils/supabase/server.ts antes de consumir os repositories).
vi.mock("@/lib/shared/supabaseClient", () => ({
  createBrowserDatabaseClient: vi.fn(),
  SupabaseDatabaseClient: class SupabaseDatabaseClientStub {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private readonly client: any) {}
    async getUserEmail(): Promise<string | null> {
      const { data } = await this.client.auth.getUser();
      return data.user?.email ?? null;
    }
  },
}));

// Barrel oficial de push (TASK-004): forma com `db:` — a rota consome as
// funções do módulo com o client server (não os *Standalone do browser).
vi.mock("@/lib/milon/db/push", () => ({
  upsertSubscription: vi.fn(),
  createRestSchedule: vi.fn(),
  findRestScheduleById: vi.fn(),
  cancelRestSchedule: vi.fn(),
  markRestScheduleSent: vi.fn(),
  markRestScheduleFailed: vi.fn(),
  deleteSubscriptionByEndpoint: vi.fn(),
  findSubscriptionByEndpoint: findSubscriptionByEndpointMock,
}));

// ---------------------------------------------------------------------------
// Constantes do contrato
// ---------------------------------------------------------------------------

const DONO = "dono-sessao@hestia.lan";
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/dispositivo-1";
const P256DH = "p256dh-chave-do-dispositivo";
const AUTH = "auth-segredo-do-dispositivo";
const SUBSCRIPTION_ID = "3f1c8f9e-1a2b-4c5d-8e6f-0a1b2c3d4e5f";
const SCHEDULE_ID = "7c2d9b4e-5f60-4a71-9c82-1d2e3f4a5b6c";
const EXERCICIO = "Supino reto";

// Relógio do servidor congelado (fake timers + setSystemTime): origem de
// `fire_at` e da janela de espera.
const AGORA = new Date("2026-10-18T12:00:00.000Z");
const JANELA_MS = 280_000; // margem sob o limite real de 300 s (F6, DA9)

const SUBJECT = "mailto:dono@hestia.lan";
const VAPID_PUBLIC = "chave-publica-vapid";
const VAPID_PRIVATE = "chave-privada-vapid";

const MENSAGEM_401 = "Não autenticado.";
const MENSAGEM_400 = "Requisição inválida.";
const MENSAGEM_503 = "Configuração de push ausente no servidor.";

// ---------------------------------------------------------------------------
// Fixtures (domínio camelCase das migrações/TASK-004)
// ---------------------------------------------------------------------------

const ASSINATURA: DevicePushSubscription = {
  id: SUBSCRIPTION_ID,
  endpoint: ENDPOINT,
  p256dh: P256DH,
  auth: AUTH,
  createdAt: AGORA.toISOString(),
  created_by: DONO,
};

function agendamento(
  overrides: Partial<RestPushSchedule> = {},
): RestPushSchedule {
  return {
    id: SCHEDULE_ID,
    subscriptionId: SUBSCRIPTION_ID,
    durationSeconds: 90,
    fireAt: new Date(AGORA.getTime() + 90_000).toISOString(),
    status: "agendado",
    sentAt: null,
    createdAt: AGORA.toISOString(),
    created_by: DONO,
    ...overrides,
  };
}

type ClienteServer = Awaited<ReturnType<typeof createClient>>;

function sessaoComEmail(email: string | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: async () => ({ data: { user: email ? { email } : null } }),
    },
  } as unknown as ClienteServer);
}

function requisicao(corpo: unknown): Request {
  return new Request("http://localhost/api/milon/rest-push", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

async function corpoDe(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

function corpoSchedule(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    action: "schedule",
    scheduleId: SCHEDULE_ID,
    durationSeconds: 90,
    exerciseName: EXERCICIO,
    subscription: { endpoint: ENDPOINT, keys: { p256dh: P256DH, auth: AUTH } },
    ...overrides,
  };
}

function corpoCancel(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { action: "cancel", scheduleId: SCHEDULE_ID, ...overrides };
}

/**
 * Dreno de microtarefas: a cadeia assíncrona da rota (json → sessão →
 * persistência) precisa acontecer ANTES de o sleep ser registrado — fake
 * timers não avançam microtarefas.
 */
async function drenarMicrotarefas(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

function erroComStatus(statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(`WebPushError ${statusCode}`), {
    statusCode,
  });
}

interface ChamadaSend {
  0: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  1: string;
  2: {
    TTL?: number;
    vapidDetails?: { subject?: string; publicKey?: string; privateKey?: string };
  };
}

function chamadaSend(indice = 0): ChamadaSend {
  return sendNotificationMock.mock.calls[indice] as unknown as ChamadaSend;
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);

  process.env.WEB_PUSH_SUBJECT = SUBJECT;
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY = VAPID_PUBLIC;
  process.env.WEB_PUSH_PRIVATE_KEY = VAPID_PRIVATE;

  sessaoComEmail(DONO);
  sendNotificationMock.mockResolvedValue({});
  // Sem linha prévia por padrão: a leitura por endpoint (correção do blocker
  // B2) só encontra assinatura quando o teste semeia explicitamente.
  findSubscriptionByEndpointMock.mockResolvedValue(null);
  vi.mocked(upsertSubscription).mockResolvedValue(ASSINATURA);
  vi.mocked(createRestSchedule).mockResolvedValue(agendamento());
  vi.mocked(findRestScheduleById).mockResolvedValue(agendamento());
  vi.mocked(cancelRestSchedule).mockResolvedValue(true);
  vi.mocked(markRestScheduleSent).mockResolvedValue(undefined);
  vi.mocked(markRestScheduleFailed).mockResolvedValue(undefined);
  vi.mocked(deleteSubscriptionByEndpoint).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.WEB_PUSH_SUBJECT;
  delete process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  delete process.env.WEB_PUSH_PRIVATE_KEY;
});

// ---------------------------------------------------------------------------

describe("Mílon #06 — POST /api/milon/rest-push (contrato RED, TASK-007)", () => {
  // -------------------------------------------------------------------------
  // 1. Janela da função (F6) e autenticação por sessão (DA2)
  // -------------------------------------------------------------------------
  describe("1. maxDuration e autenticação", () => {
    it("declara maxDuration = 300 (janela máxima da função da Vercel, F6)", () => {
      expect(maxDuration).toBe(300);
    });

    it("sem sessão autenticada responde 401 com 'Não autenticado.' e não toca em persistência", async () => {
      sessaoComEmail(null);

      const res = await POST(requisicao(corpoSchedule()));

      expect(res.status).toBe(401);
      expect(await corpoDe(res)).toEqual({ error: MENSAGEM_401 });
      expect(upsertSubscription).not.toHaveBeenCalled();
      expect(createRestSchedule).not.toHaveBeenCalled();
      expect(cancelRestSchedule).not.toHaveBeenCalled();
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Validação do corpo (400)
  // -------------------------------------------------------------------------
  describe("2. validação do corpo → 400 'Requisição inválida.'", () => {
    async function expect400(corpo: unknown): Promise<void> {
      const res = await POST(requisicao(corpo));

      expect(res.status).toBe(400);
      expect(await corpoDe(res)).toEqual({ error: MENSAGEM_400 });
      expect(upsertSubscription).not.toHaveBeenCalled();
      expect(createRestSchedule).not.toHaveBeenCalled();
      expect(sendNotificationMock).not.toHaveBeenCalled();
    }

    it("corpo malformado (JSON inválido)", async () => {
      await expect400("isto-não-é-json{{{");
    });

    it("action desconhecida", async () => {
      await expect400(corpoSchedule({ action: "explodir" }));
      await expect400(corpoCancel({ action: "listar" }));
    });

    it("durationSeconds fora de 1–86400 (zero, negativo, acima do teto, não inteiro ou ausente)", async () => {
      for (const durationSeconds of [0, -5, 86401, 90.5, undefined]) {
        await expect400(corpoSchedule({ durationSeconds }));
      }
    });

    it("subscription sem endpoint, sem keys, sem p256dh ou sem auth", async () => {
      await expect400(
        corpoSchedule({
          subscription: { keys: { p256dh: P256DH, auth: AUTH } },
        }),
      );
      await expect400(corpoSchedule({ subscription: { endpoint: ENDPOINT } }));
      await expect400(
        corpoSchedule({
          subscription: { endpoint: ENDPOINT, keys: { auth: AUTH } },
        }),
      );
      await expect400(
        corpoSchedule({
          subscription: { endpoint: ENDPOINT, keys: { p256dh: P256DH } },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. VAPID ausente (DA8) — 503 só no schedule; cancel segue
  // -------------------------------------------------------------------------
  describe("3. VAPID ausente no ambiente", () => {
    beforeEach(() => {
      delete process.env.WEB_PUSH_SUBJECT;
      delete process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
      delete process.env.WEB_PUSH_PRIVATE_KEY;
    });

    it("schedule responde 503 com 'Configuração de push ausente no servidor.' e nunca envia", async () => {
      const res = await POST(requisicao(corpoSchedule()));

      expect(res.status).toBe(503);
      expect(await corpoDe(res)).toEqual({ error: MENSAGEM_503 });
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it("cancel continua funcionando sem VAPID e responde 200", async () => {
      const res = await POST(requisicao(corpoCancel()));

      expect(res.status).toBe(200);
      expect(await corpoDe(res)).toEqual({
        scheduleId: SCHEDULE_ID,
        cancelled: true,
      });
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 4. schedule autenticado — gravação (assinatura com o e-mail da SESSÃO;
  //    agendamento com o id do cliente e fire_at do relógio do servidor)
  // -------------------------------------------------------------------------
  describe("4. schedule autenticado — persistência", () => {
    it("faz upsert da assinatura com a autoria da sessão e cria o agendamento com o id do corpo", async () => {
      const promessa = POST(
        requisicao(
          corpoSchedule({
            // E-mail no corpo é SEMPRE ignorado: o dono vem da sessão (DA2).
            email: "intruso@hestia.lan",
            createdBy: "intruso@hestia.lan",
          }),
        ),
      );
      await drenarMicrotarefas();

      expect(upsertSubscription).toHaveBeenCalledTimes(1);
      const [dbUpsert, inputUpsert, emailUpsert] =
        vi.mocked(upsertSubscription).mock.calls[0];
      expect(dbUpsert).toBeInstanceOf(SupabaseDatabaseClient);
      expect(inputUpsert).toEqual({
        endpoint: ENDPOINT,
        p256dh: P256DH,
        auth: AUTH,
      });
      expect(emailUpsert).toBe(DONO);

      expect(createRestSchedule).toHaveBeenCalledTimes(1);
      const [dbCreate, inputCreate, emailCreate] =
        vi.mocked(createRestSchedule).mock.calls[0];
      expect(dbCreate).toBeInstanceOf(SupabaseDatabaseClient);
      expect(inputCreate.id).toBe(SCHEDULE_ID);
      expect(inputCreate.subscriptionId).toBe(SUBSCRIPTION_ID);
      expect(emailCreate).toBe(DONO);

      await vi.advanceTimersByTimeAsync(90_000);
      await promessa;
    });

    it("calcula fire_at com o relógio do servidor (agora + durationSeconds), não no corpo", async () => {
      const promessa = POST(
        requisicao(
          corpoSchedule({ durationSeconds: 90, fireAt: "2099-01-01T00:00:00.000Z" }),
        ),
      );
      await drenarMicrotarefas();

      const inputCreate = vi.mocked(createRestSchedule).mock.calls[0][1];
      expect(new Date(inputCreate.fireAt).getTime()).toBe(
        AGORA.getTime() + 90_000,
      );

      await vi.advanceTimersByTimeAsync(90_000);
      await promessa;
    });
  });

  // -------------------------------------------------------------------------
  // 5. Janela da espera: duração de 400 s espera ~280 s e envia (decisão 7 —
  //    nunca espera os 400 inteiros)
  // -------------------------------------------------------------------------
  describe("5. janela da espera (280 s)", () => {
    it("durationSeconds 400 não envia antes de 280 s, envia exatamente ao fim da janela e responde enviado", async () => {
      const promessa = POST(
        requisicao(corpoSchedule({ durationSeconds: 400 })),
      );
      await drenarMicrotarefas();

      // O agendamento é gravado com a duração e o fire_at completos do
      // cliente; a espera interna é quem é cortada pela janela.
      const inputCreate = vi.mocked(createRestSchedule).mock.calls[0][1];
      expect(inputCreate.durationSeconds).toBe(400);
      expect(new Date(inputCreate.fireAt).getTime()).toBe(
        AGORA.getTime() + 400_000,
      );
      expect(sendNotificationMock).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(JANELA_MS - 1);
      expect(sendNotificationMock).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(sendNotificationMock).toHaveBeenCalledTimes(1);

      const res = await promessa;
      expect(res.status).toBe(200);
      expect(await corpoDe(res)).toEqual({
        scheduleId: SCHEDULE_ID,
        status: "enviado",
      });
      expect(markRestScheduleSent).toHaveBeenCalledWith(
        expect.anything(),
        SCHEDULE_ID,
      );
    });
  });

  // -------------------------------------------------------------------------
  // 6. Re-leitura de status durante a espera (mata push órfão — DA9)
  // -------------------------------------------------------------------------
  describe("6. re-leitura de status antes de enviar", () => {
    it("agendamento re-lido como cancelado responde 200 com status cancelado e NUNCA chama sendNotification", async () => {
      vi.mocked(findRestScheduleById).mockResolvedValue(
        agendamento({ status: "cancelado" }),
      );

      const promessa = POST(requisicao(corpoSchedule({ durationSeconds: 90 })));
      await drenarMicrotarefas();
      await vi.advanceTimersByTimeAsync(90_000);
      const res = await promessa;

      expect(res.status).toBe(200);
      expect(await corpoDe(res)).toEqual({
        scheduleId: SCHEDULE_ID,
        status: "cancelado",
      });
      expect(sendNotificationMock).not.toHaveBeenCalled();
      expect(markRestScheduleSent).not.toHaveBeenCalled();
      expect(markRestScheduleFailed).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 7. Envio OK e falhas do web-push (DA13)
  // -------------------------------------------------------------------------
  describe("7. envio e falhas", () => {
    it("envio bem-sucedido marca enviado e responde 200 com status enviado", async () => {
      const promessa = POST(requisicao(corpoSchedule({ durationSeconds: 90 })));
      await drenarMicrotarefas();
      await vi.advanceTimersByTimeAsync(90_000);
      const res = await promessa;

      expect(res.status).toBe(200);
      expect(await corpoDe(res)).toEqual({
        scheduleId: SCHEDULE_ID,
        status: "enviado",
      });
      expect(markRestScheduleSent).toHaveBeenCalledTimes(1);
      expect(markRestScheduleSent).toHaveBeenCalledWith(
        expect.anything(),
        SCHEDULE_ID,
      );
      expect(markRestScheduleFailed).not.toHaveBeenCalled();
      expect(deleteSubscriptionByEndpoint).not.toHaveBeenCalled();
    });

    it.each([404, 410])(
      "erro do web-push com statusCode %i remove a assinatura morta e marca erro, respondendo 200",
      async (statusCode) => {
        sendNotificationMock.mockRejectedValue(erroComStatus(statusCode));

        const promessa = POST(
          requisicao(corpoSchedule({ durationSeconds: 90 })),
        );
        await drenarMicrotarefas();
        await vi.advanceTimersByTimeAsync(90_000);
        const res = await promessa;

        expect(res.status).toBe(200);
        expect(await corpoDe(res)).toEqual({
          scheduleId: SCHEDULE_ID,
          status: "erro",
        });
        expect(deleteSubscriptionByEndpoint).toHaveBeenCalledTimes(1);
        expect(deleteSubscriptionByEndpoint).toHaveBeenCalledWith(
          expect.anything(),
          ENDPOINT,
        );
        expect(markRestScheduleFailed).toHaveBeenCalledWith(
          expect.anything(),
          SCHEDULE_ID,
        );
        expect(markRestScheduleSent).not.toHaveBeenCalled();
      },
    );

    it("demais erros de envio marcam erro e respondem 200 (nunca exceção não tratada; assinatura preservada)", async () => {
      sendNotificationMock.mockRejectedValue(new Error("falha transitória"));

      const promessa = POST(requisicao(corpoSchedule({ durationSeconds: 90 })));
      await drenarMicrotarefas();
      await vi.advanceTimersByTimeAsync(90_000);
      const res = await promessa;

      expect(res.status).toBe(200);
      expect(await corpoDe(res)).toEqual({
        scheduleId: SCHEDULE_ID,
        status: "erro",
      });
      expect(markRestScheduleFailed).toHaveBeenCalledWith(
        expect.anything(),
        SCHEDULE_ID,
      );
      expect(deleteSubscriptionByEndpoint).not.toHaveBeenCalled();
      expect(markRestScheduleSent).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 8. cancel — somente o próprio dono agendado tem cancelled true
  // -------------------------------------------------------------------------
  describe("8. cancel", () => {
    it("cancela o agendamento do próprio dono (id + e-mail da sessão) e devolve cancelled true", async () => {
      vi.mocked(cancelRestSchedule).mockResolvedValue(true);

      const res = await POST(
        requisicao(corpoCancel({ email: "intruso@hestia.lan" })),
      );

      expect(res.status).toBe(200);
      expect(await corpoDe(res)).toEqual({
        scheduleId: SCHEDULE_ID,
        cancelled: true,
      });
      expect(cancelRestSchedule).toHaveBeenCalledTimes(1);
      const [db, id, email] = vi.mocked(cancelRestSchedule).mock.calls[0];
      expect(db).toBeInstanceOf(SupabaseDatabaseClient);
      expect(id).toBe(SCHEDULE_ID);
      expect(email).toBe(DONO);
      expect(sendNotificationMock).not.toHaveBeenCalled();
      expect(createRestSchedule).not.toHaveBeenCalled();
    });

    it("alheio, inexistente ou já terminal devolve cancelled false (200, sem erro)", async () => {
      vi.mocked(cancelRestSchedule).mockResolvedValue(false);

      const res = await POST(requisicao(corpoCancel()));

      expect(res.status).toBe(200);
      expect(await corpoDe(res)).toEqual({
        scheduleId: SCHEDULE_ID,
        cancelled: false,
      });
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 9. Payload exato do envio (plan §3 — Sender + textos congelados)
  // -------------------------------------------------------------------------
  describe("9. payload do envio", () => {
    it("com nome do exercício: título 'Descanso terminado', corpo 'Descanso de <exercício> terminou.', url /milon/today e TTL 300", async () => {
      const promessa = POST(
        requisicao(
          corpoSchedule({ durationSeconds: 90, exerciseName: EXERCICIO }),
        ),
      );
      await drenarMicrotarefas();
      await vi.advanceTimersByTimeAsync(90_000);
      await promessa;

      expect(sendNotificationMock).toHaveBeenCalledTimes(1);
      const chamada = chamadaSend(0);
      expect(chamada[0]).toMatchObject({
        endpoint: ENDPOINT,
        keys: { p256dh: P256DH, auth: AUTH },
      });
      expect(JSON.parse(chamada[1])).toEqual({
        title: "Descanso terminado",
        body: `Descanso de ${EXERCICIO} terminou.`,
        url: "/milon/today",
      });
      expect(chamada[2]).toMatchObject({
        TTL: 300,
        vapidDetails: {
          subject: SUBJECT,
          publicKey: VAPID_PUBLIC,
          privateKey: VAPID_PRIVATE,
        },
      });
    });

    it("sem nome do exercício o corpo é 'O descanso terminou.'", async () => {
      const corpo = corpoSchedule({ durationSeconds: 90 });
      delete (corpo as Record<string, unknown>).exerciseName;

      const promessa = POST(requisicao(corpo));
      await drenarMicrotarefas();
      await vi.advanceTimersByTimeAsync(90_000);
      await promessa;

      expect(JSON.parse(chamadaSend(0)[1])).toEqual({
        title: "Descanso terminado",
        body: "O descanso terminou.",
        url: "/milon/today",
      });
    });
  });

  // -------------------------------------------------------------------------
  // 10. Propriedade da assinatura — blocker B2 da review (security): DA2
  //    (plan.md:224 "ainda que chamasse a rota, só agendaria para a própria
  //    sessão/assinatura") e spec.md:59 ("o endpoint nunca envia o push do
  //    descanso para outro usuário"). Convenção de status escolhida por Minos:
  //    403 (Forbidden) para "o recurso pertence a outro dono" — o plan não
  //    congela mensagem para esta recusa (os textos congelados 401/400/503
  //    continuam valendo), por isso o caso exige apenas um corpo JSON com
  //    `error` e não um texto específico.
  // -------------------------------------------------------------------------
  describe("10. propriedade da assinatura (B2 — sessão não agenda endpoint alheio)", () => {
    const DONO_A = "dono-a@hestia.lan";
    const DONO_B = "dono-b@hestia.lan";

    // Estado "em banco" da assinatura, semeado com created_by de A. O upsert
    // emulado espelha o repositório REAL (lib/milon/repositories/push.ts:44-69):
    // por conflito no endpoint ele REATRIBUI created_by ao chamador — exata-
    // mente a vulnerabilidade que a checagem de dono do servidor precisa
    // impedir (a fake nunca pode "consertar" sozinha o que a rota permite).
    let assinaturaArmazenada: DevicePushSubscription = ASSINATURA;

    function semearAssinaturaDe(dono: string): void {
      assinaturaArmazenada = { ...ASSINATURA, created_by: dono };
    }

    function instalarUpsertEstadual(): void {
      vi.mocked(upsertSubscription).mockImplementation(
        async (...args: Parameters<typeof upsertSubscription>) => {
          const [, input, email] = args;
          assinaturaArmazenada = {
            ...assinaturaArmazenada,
            ...input,
            created_by: email,
          };
          return assinaturaArmazenada;
        },
      );
    }

    it("sessão B agenda com subscription cujo endpoint já pertence a A → 403, sem envio e sem reatribuição de created_by", async () => {
      semearAssinaturaDe(DONO_A);
      findSubscriptionByEndpointMock.mockResolvedValue({
        ...assinaturaArmazenada,
      });
      sessaoComEmail(DONO_B);
      instalarUpsertEstadual();

      const promessa = POST(requisicao(corpoSchedule()));
      await drenarMicrotarefas();
      // Se a rota falhar a checagem, ela dorme o descanso e envia — avança o
      // relógio para que o comportamento errado se complete e seja flagrado.
      await vi.advanceTimersByTimeAsync(90_000);
      const res = await promessa;

      expect(res.status).toBe(403);
      expect(await corpoDe(res)).toHaveProperty("error");
      // O push do descanso NUNCA sai para a sessão de quem não é o dono
      // (spec.md:59) e nada é agendado para a assinatura alheia.
      expect(sendNotificationMock).not.toHaveBeenCalled();
      expect(createRestSchedule).not.toHaveBeenCalled();
      // Nenhuma escrita na linha alheia: a recusa acontece ANTES do upsert
      // (review-report finding B2 — a reinscrição do próprio dono continua
      // válida, mas a de outro dono não pode sequer tocar a linha).
      expect(upsertSubscription).not.toHaveBeenCalled();
      expect(assinaturaArmazenada.created_by).toBe(DONO_A);
    });

    it("regressão: sessão A agenda com o próprio endpoint (linha já existente de A) segue funcionando", async () => {
      semearAssinaturaDe(DONO_A);
      findSubscriptionByEndpointMock.mockResolvedValue({
        ...assinaturaArmazenada,
      });
      sessaoComEmail(DONO_A);
      instalarUpsertEstadual();

      const promessa = POST(requisicao(corpoSchedule()));
      await drenarMicrotarefas();
      await vi.advanceTimersByTimeAsync(90_000);
      const res = await promessa;

      expect(res.status).toBe(200);
      expect(await corpoDe(res)).toEqual({
        scheduleId: SCHEDULE_ID,
        status: "enviado",
      });
      // Upsert do próprio dono segue válido (DA2 — a própria assinatura).
      expect(upsertSubscription).toHaveBeenCalledTimes(1);
      expect(vi.mocked(upsertSubscription).mock.calls[0][2]).toBe(DONO_A);
      expect(assinaturaArmazenada.created_by).toBe(DONO_A);
      expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    });
  });
});
