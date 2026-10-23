// @vitest-environment node
/**
 * Contrato RED — Mílon #06 Timer de descanso auto + PWA push:
 * `app/api/milon/rest-push/route.ts` na forma EMENDADA (Emenda 2026-10-23 —
 * fix-01-server, TASK-020 → GREEN na TASK-021).
 *
 * Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/spec.md`
 * (seção "Emenda 2026-10-23" — Alavancas 1–3, critérios 1/4/8/13/14 da §5
 * emendada, edge cases da emenda) + `plan.md` §Emenda 2026-10-23 (DA16–DA18,
 * catálogo S3/S4/S6/S21) + acceptanceCriteria da TASK-020 no `tasks.json`.
 *
 * Escrito ANTES da implementação da rota emendada (outside-in): os casos novos
 * falham contra a rota atual (TASK-008) pelos motivos certos — resposta pós-
 * sono em vez de 202 imediato, `fire_at` sem `elapsed`, `after()` nunca
 * registrado e `cancelAllRestSchedulesByOwner` nunca chamado. Hefesto fará
 * GREEN na TASK-021 apenas com o contrato da emenda — sem inventar APIs.
 *
 * Alavancas sob teste:
 * - Alavanca 1 (DA16): `elapsed` opcional no corpo de `schedule` (ms; número
 *   finito ≥ 0 → usado; ausente/negativo/não-numérico/não-finito → 0, retro-
 *   compat com a PWA já instalada, NUNCA 400);
 *   `fire_at = agora + max(0, durationSeconds − elapsed/1000)`;
 *   `elapsed ≥ duration*1000` → `fire_at = agora` (envio imediato).
 * - Alavanca 2 (DA17): resposta `202` com corpo exato
 *   `{scheduleId, status: "agendado"}` IMEDIATA (a resposta NÃO espera a
 *   espera nem o envio; 202 não significa "enviado"); a espera (até `fire_at`,
 *   cap `JANELA_ESPERA_MS` = 280000 — decisão 7 intacta), a re-leitura de
 *   status e o envio rodam em callback registrada via `after()` de
 *   `next/server` (mockado aqui capturando as callbacks — o `after` real
 *   lança fora de request scope); re-lê ≠ 'agendado' → sem envio; 404/410 do
 *   web-push → `deleteSubscriptionByEndpoint` + `markRestScheduleFailed` +
 *   `console.error`; demais falhas → `markRestScheduleFailed` +
 *   `console.error`; a callback NUNCA rejeita (try/catch integral);
 *   `sent_at` continua a marca do envio real (só via `markRestScheduleSent`).
 * - Alavanca 3 (DA18): `cancelAllRestSchedulesByOwner(db, dono)` chamado ANTES
 *   de `createRestSchedule` em todo `schedule` (ordem por espião); invariante:
 *   no máximo 1 agendamento `agendado` por dono no servidor.
 *
 * Substituição sem duas verdades (catálogo S21 da emenda): os casos que
 * codificavam a resposta aberta até o sono da rota antiga foram reescritos
 * para a forma emendada (202 imediato + background) — as buscas de
 * substituição obrigatórias do acceptanceCriteria da TASK-020 retornam 0
 * neste arquivo.
 *
 * Preservados (invariantes da TASK-008 que a emenda mantém): `maxDuration`
 * 300; 401 sem sessão sem tocar em persistência; 400 de corpo malformado,
 * ação desconhecida, `durationSeconds` fora de 1–86400 e assinatura inválida;
 * 403 de endpoint de outro dono ANTES de qualquer escrita; 503 sem VAPID só
 * no `schedule` (cancel segue); payload congelado (`Descanso terminado` /
 * `Descanso de <exercício> terminou.` / `O descanso terminou.` /
 * `/milon/today`) com TTL 300; dono exclusivamente da sessão (DA2, nunca do
 * corpo); `cancel` síncrono com `200 {scheduleId, cancelled}`.
 *
 * Ambiente node (pragma — rota é lado servidor) + fake timers (relógio do
 * servidor determinístico: `fire_at` e a janela de 280 s observáveis sem
 * dormir). Harness da emenda: `next/server` mockado com um `after` que
 * captura as callbacks registradas; o teste dispara a callback manualmente e
 * avança fake timers — nenhum sleep real, nenhum request scope do Next.
 *
 * MOCKS (plan §2 + §Emenda):
 * - `@/utils/supabase/server` — `createClient` devolve a "sessão"
 *   (`auth.getUser`); o dono é SEMPRE o e-mail da sessão (DA2);
 * - `@/lib/shared/supabaseClient` — stub do `SupabaseDatabaseClient` (mesma
 *   superfície de auth do real) para a rota envolver o client server (DA14);
 * - `@/lib/milon/db/push` — barrel oficial mockado com as NOVE operações
 *   (as 7 originais + `findSubscriptionByEndpoint` do B2 +
 *   `cancelAllRestSchedulesByOwner` da Alavanca 3);
 * - `next/server` — `after` capturador de callbacks (DA17; o plano congela o
 *   import de `next/server` — next@16.2.10 re-exporta `after` de lá);
 * - `web-push` — mockado via `vi.hoisted` + factory; o sender real
 *   (`lib/milon/rest-push-sender.ts`) roda de ponta a ponta: payload exato,
 *   TTL 300 e VAPID details observados no `sendNotification`.
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
  cancelAllRestSchedulesByOwner,
  markRestScheduleSent,
  markRestScheduleFailed,
  deleteSubscriptionByEndpoint,
} from "@/lib/milon/db/push";
import type {
  CreateRestPushScheduleInput,
  DevicePushSubscription,
  RestPushSchedule,
} from "@/lib/milon/types";

// ---------------------------------------------------------------------------
// Mocks hoisted: web-push (sender real observa o mock) + after de next/server
// (captura as callbacks de background registradas pela rota emendada).
// ---------------------------------------------------------------------------

const {
  sendNotificationMock,
  findSubscriptionByEndpointMock,
  afterMock,
} = vi.hoisted(() => ({
  sendNotificationMock: vi.fn(),
  // Leitura de assinatura por endpoint — operação exigida pela correção do
  // blocker B2 da review (Argos, finding security): localizar a assinatura
  // existente ANTES do upsert e recusar quando `created_by` difere da sessão.
  findSubscriptionByEndpointMock: vi.fn(),
  // `after` de next/server (DA17): em produção o App Router executa a
  // callback após a resposta; aqui o mock SÓ captura — o teste a dispara
  // manualmente e avança fake timers (o after real lança fora de request
  // scope, risco mitigado no plano).
  afterMock: vi.fn(),
}));

vi.mock("web-push", () => ({
  default: { sendNotification: sendNotificationMock },
  sendNotification: sendNotificationMock,
}));

// next/server mockado com after capturador (TASK-020/DA17 — o plano congela
// `import { after } from "next/server"`; o mock deixa o teste no controle de
// QUANDO a espera/envio em background roda, sem sleep real).
vi.mock("next/server", () => ({
  after: afterMock,
}));

// -------------------------------------------------------------------------
// Mocks dos módulos consumidos pela rota (plan §2/§3 + §Emenda)
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

// Barrel oficial de push: forma com `db:` — a rota consome as funções do
// módulo com o client server (nove operações: 7 originais + B2 +
// cancel-all da Alavanca 3 / TASK-017).
vi.mock("@/lib/milon/db/push", () => ({
  upsertSubscription: vi.fn(),
  createRestSchedule: vi.fn(),
  findRestScheduleById: vi.fn(),
  cancelRestSchedule: vi.fn(),
  cancelAllRestSchedulesByOwner: vi.fn(),
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
const SCHEDULE_ID_ANTERIOR = "0a1b2c3d-4e5f-4678-9abc-def012345678";
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
 * persistência) precisa acontecer antes de qualquer asserção — fake timers
 * não avançam microtarefas.
 */
async function drenarMicrotarefas(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

/**
 * POST de `schedule` SEM avançar fake timers (contrato emendado: a resposta
 * 202 é imediata — não pode depender da espera). Com a rota atual (sono
 * dentro do request) a promise nunca assenta e `respondeu` fica falso: o
 * teste falha com a mensagem da asserção de imediatidão, pelo motivo certo.
 */
async function scheduleSemEsperar(
  corpo: unknown,
): Promise<{ respondeu: boolean; response: Response | null }> {
  let respondeu = false;
  let response: Response | null = null;
  void POST(requisicao(corpo)).then((r) => {
    respondeu = true;
    response = r;
  });
  await drenarMicrotarefas();
  return { respondeu, response };
}

/**
 * Última callback registrada via `after()` (DA17). Com a rota atual `after`
 * nunca é chamado — lança com o motivo exato do RED.
 */
function ultimaCallbackAfter(): () => Promise<unknown> {
  if (afterMock.mock.calls.length === 0) {
    throw new Error(
      "after() nunca foi chamado — a rota emendada registra a espera/re-leitura/envio em background via after() de next/server (DA17)",
    );
  }
  const ultima = afterMock.mock.calls[afterMock.mock.calls.length - 1][0];
  return ultima as () => Promise<unknown>;
}

/** Dispara a callback de background capturada (o teste avança os timers). */
function dispararBackground(): Promise<unknown> {
  return ultimaCallbackAfter()();
}

/**
 * Grava o agendamento via POST (sem avançar timers) e devolve o `fireAt`
 * passado ao `createRestSchedule` — a asserção central da Alavanca 1.
 */
async function fireAtGravado(
  corpo: Record<string, unknown>,
): Promise<{ fireAt: number; respondeu: boolean; response: Response | null }> {
  const resultado = await scheduleSemEsperar(corpo);
  expect(
    createRestSchedule,
    "createRestSchedule deve ser chamado no caminho schedule",
  ).toHaveBeenCalledTimes(1);
  const input: CreateRestPushScheduleInput =
    vi.mocked(createRestSchedule).mock.calls[0][1];
  return {
    fireAt: new Date(input.fireAt).getTime(),
    ...resultado,
  };
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
  vi.mocked(cancelAllRestSchedulesByOwner).mockResolvedValue(undefined);
  vi.mocked(markRestScheduleSent).mockResolvedValue(undefined);
  vi.mocked(markRestScheduleFailed).mockResolvedValue(undefined);
  vi.mocked(deleteSubscriptionByEndpoint).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete process.env.WEB_PUSH_SUBJECT;
  delete process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  delete process.env.WEB_PUSH_PRIVATE_KEY;
});

// ---------------------------------------------------------------------------

describe("Mílon #06 — POST /api/milon/rest-push (contrato RED emendado, TASK-020)", () => {
  // -------------------------------------------------------------------------
  // 1. Janela da função (F6) e autenticação por sessão (DA2)
  // -------------------------------------------------------------------------
  describe("1. maxDuration e autenticação", () => {
    it("declara maxDuration = 300 (janela máxima da função da Vercel, F6)", () => {
      expect(maxDuration).toBe(300);
    });

    it("sem sessão autenticada responde 401 com 'Não autenticado.' e não toca em persistência nem registra background", async () => {
      sessaoComEmail(null);

      const res = await POST(requisicao(corpoSchedule()));

      expect(res.status).toBe(401);
      expect(await corpoDe(res)).toEqual({ error: MENSAGEM_401 });
      expect(upsertSubscription).not.toHaveBeenCalled();
      expect(createRestSchedule).not.toHaveBeenCalled();
      expect(cancelRestSchedule).not.toHaveBeenCalled();
      expect(cancelAllRestSchedulesByOwner).not.toHaveBeenCalled();
      expect(sendNotificationMock).not.toHaveBeenCalled();
      expect(afterMock).not.toHaveBeenCalled();
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
      expect(afterMock).not.toHaveBeenCalled();
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

    it("schedule responde 503 com 'Configuração de push ausente no servidor.', sem gravar e sem registrar background", async () => {
      const res = await POST(requisicao(corpoSchedule()));

      expect(res.status).toBe(503);
      expect(await corpoDe(res)).toEqual({ error: MENSAGEM_503 });
      expect(sendNotificationMock).not.toHaveBeenCalled();
      expect(createRestSchedule).not.toHaveBeenCalled();
      expect(afterMock).not.toHaveBeenCalled();
    });

    it("cancel continua funcionando sem VAPID e devolve 200", async () => {
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
  // 4. Resposta 202 imediata + after() (Alavanca 2 / DA17 — critério 14)
  // -------------------------------------------------------------------------
  describe("4. schedule responde 202 imediato e registra background via after()", () => {
    it("responde 202 com {scheduleId, status: 'agendado'} SEM avançar fake timers, com after registrado e sem enviar (202 não é 'enviado')", async () => {
      const { respondeu, response } = await scheduleSemEsperar(
        corpoSchedule(),
      );

      expect(
        respondeu,
        "a resposta de schedule não pode esperar a espera/envio: contrato emendado é 202 imediato (Alavanca 2)",
      ).toBe(true);
      expect(response!.status).toBe(202);
      expect(await corpoDe(response!)).toEqual({
        scheduleId: SCHEDULE_ID,
        status: "agendado",
      });
      // A espera/envio ficam penduradas no background; nada enviado na
      // resposta e sent_at continua sendo marca só do envio real.
      expect(sendNotificationMock).not.toHaveBeenCalled();
      expect(markRestScheduleSent).not.toHaveBeenCalled();
      expect(markRestScheduleFailed).not.toHaveBeenCalled();
      // O callback de background foi registrado via after() de next/server.
      expect(afterMock).toHaveBeenCalledTimes(1);
      expect(typeof afterMock.mock.calls[0][0]).toBe("function");
    });

    it("a callback de background sem avanço de timers não envia; após avançar até fire_at envia e marca enviado", async () => {
      const { respondeu, response } = await scheduleSemEsperar(
        corpoSchedule({ durationSeconds: 90 }),
      );
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);

      const background = dispararBackground();
      await drenarMicrotarefas();
      // Sem avanço de relógio a espera não terminou: nenhum envio ainda.
      expect(sendNotificationMock).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(90_000);
      await background;

      expect(sendNotificationMock).toHaveBeenCalledTimes(1);
      expect(markRestScheduleSent).toHaveBeenCalledTimes(1);
      expect(markRestScheduleSent).toHaveBeenCalledWith(
        expect.anything(),
        SCHEDULE_ID,
      );
      expect(markRestScheduleFailed).not.toHaveBeenCalled();
    });

    it("janela da espera em background: durationSeconds 400 espera o cap de 280 s — não envia antes, envia ao fim da janela (decisão 7 intacta)", async () => {
      const { respondeu, response } = await scheduleSemEsperar(
        corpoSchedule({ durationSeconds: 400 }),
      );
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);

      // O agendamento é gravado com a duração e o fire_at completos do
      // cliente; a espera em background é quem é cortada pela janela.
      const inputCreate = vi.mocked(createRestSchedule).mock.calls[0][1];
      expect(inputCreate.durationSeconds).toBe(400);
      expect(new Date(inputCreate.fireAt).getTime()).toBe(
        AGORA.getTime() + 400_000,
      );

      const background = dispararBackground();
      await vi.advanceTimersByTimeAsync(JANELA_MS - 1);
      expect(sendNotificationMock).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(sendNotificationMock).toHaveBeenCalledTimes(1);

      await background;
      expect(markRestScheduleSent).toHaveBeenCalledWith(
        expect.anything(),
        SCHEDULE_ID,
      );
    });
  });

  // -------------------------------------------------------------------------
  // 5. schedule autenticado — gravação (assinatura com o e-mail da SESSÃO;
  //    agendamento com o id do cliente)
  // -------------------------------------------------------------------------
  describe("5. schedule autenticado — persistência", () => {
    it("faz upsert da assinatura com a autoria da sessão e cria o agendamento com o id do corpo", async () => {
      await scheduleSemEsperar(
        corpoSchedule({
          // E-mail no corpo é SEMPRE ignorado: o dono vem da sessão (DA2).
          email: "intruso@hestia.lan",
          createdBy: "intruso@hestia.lan",
        }),
      );

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
    });
  });

  // -------------------------------------------------------------------------
  // 6. fire_at ancorado no clique (Alavanca 1 / DA16 — critérios 1 e 13)
  // -------------------------------------------------------------------------
  describe("6. fire_at com elapsed ancorado no clique (Alavanca 1)", () => {
    it("elapsed 20000 com durationSeconds 60 grava fire_at = agora + 40 s (relógio do servidor congelado)", async () => {
      const { fireAt, respondeu, response } = await fireAtGravado(
        corpoSchedule({ durationSeconds: 60, elapsed: 20_000 }),
      );

      expect(fireAt).toBe(AGORA.getTime() + 40_000);
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);
    });

    it("elapsed 1500 com durationSeconds 90 grava fire_at = agora + 88,5 s (clique que iniciou o timer)", async () => {
      const { fireAt, respondeu, response } = await fireAtGravado(
        corpoSchedule({ durationSeconds: 90, elapsed: 1_500 }),
      );

      expect(fireAt).toBe(AGORA.getTime() + 88_500);
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);
    });

    it("elapsed ausente grava fire_at = agora + duração (retrocompat com a PWA já instalada) e ignora fireAt vindo do corpo", async () => {
      const { fireAt, respondeu, response } = await fireAtGravado(
        corpoSchedule({
          durationSeconds: 90,
          fireAt: "2099-01-01T00:00:00.000Z",
        }),
      );

      expect(fireAt).toBe(AGORA.getTime() + 90_000);
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);
    });

    it("elapsed negativo, não-numérico, nulo ou não-finito é tratado como 0 (nunca 400 — compat idem ao campo ausente)", async () => {
      for (const elapsed of [-500, -5_000, "abc", null, Number.NaN]) {
        vi.mocked(createRestSchedule).mockClear();
        const { fireAt, respondeu, response } = await fireAtGravado(
          corpoSchedule({ durationSeconds: 90, elapsed }),
        );

        expect(fireAt).toBe(AGORA.getTime() + 90_000);
        // Nunca vira 400 por causa do elapsed: o agendamento segue e a
        // resposta emendada é o 202 (o campo inválido só cai no fallback 0).
        expect(respondeu, "202 imediato obrigatório").toBe(true);
        expect(response!.status).toBe(202);
      }
    });

    it("elapsed maior ou igual à duração (120000 ms vs 90 s) grava fire_at = agora (envio imediato em background)", async () => {
      const { fireAt, respondeu, response } = await fireAtGravado(
        corpoSchedule({ durationSeconds: 90, elapsed: 120_000 }),
      );

      expect(fireAt).toBe(AGORA.getTime());
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);
    });
  });

  // -------------------------------------------------------------------------
  // 7. cancel-all por dono antes do INSERT (Alavanca 3 / DA18 — critério 4)
  // -------------------------------------------------------------------------
  describe("7. cancel-all por dono antes do INSERT (Alavanca 3)", () => {
    it("chama cancelAllRestSchedulesByOwner com o dono da sessão ANTES de createRestSchedule em todo schedule", async () => {
      await scheduleSemEsperar(corpoSchedule());

      expect(cancelAllRestSchedulesByOwner).toHaveBeenCalledTimes(1);
      const [dbCancelAll, emailCancelAll] =
        vi.mocked(cancelAllRestSchedulesByOwner).mock.calls[0];
      expect(dbCancelAll).toBeInstanceOf(SupabaseDatabaseClient);
      expect(emailCancelAll).toBe(DONO);
      // Ordem por espião: cancel-all ANTES do INSERT (o recém-criado não pode
      // ser cancelado — invariante: máx 1 agendado por dono).
      expect(
        vi.mocked(cancelAllRestSchedulesByOwner).mock.invocationCallOrder[0],
      ).toBeLessThan(
        vi.mocked(createRestSchedule).mock.invocationCallOrder[0],
      );
    });

    it("dois schedules do mesmo dono: o cancel-all do segundo cancela o primeiro, o segundo permanece agendado e o background do primeiro NÃO envia", async () => {
      // Fake de estado em memória no mock do barrel: espelha a invariante por
      // dono imposta pelo cancel-all (Alavanca 3).
      const linhas = new Map<string, RestPushSchedule>();
      vi.mocked(createRestSchedule).mockImplementation(
        async (...args: Parameters<typeof createRestSchedule>) => {
          const [, input, email] = args;
          const linha: RestPushSchedule = {
            id: input.id,
            subscriptionId: input.subscriptionId,
            durationSeconds: input.durationSeconds,
            fireAt: input.fireAt,
            status: "agendado",
            sentAt: null,
            createdAt: AGORA.toISOString(),
            created_by: email,
          };
          linhas.set(input.id, linha);
          return linha;
        },
      );
      vi.mocked(cancelAllRestSchedulesByOwner).mockImplementation(
        async () => {
          for (const linha of linhas.values()) {
            if (linha.status === "agendado") linha.status = "cancelado";
          }
        },
      );
      vi.mocked(findRestScheduleById).mockImplementation(
        async (...args: Parameters<typeof findRestScheduleById>) => linhas.get(args[1]) ?? null,
      );

      // Primeiro agendamento (id A) — background capturado, ainda não disparado.
      const primeiro = await scheduleSemEsperar(
        corpoSchedule({ scheduleId: SCHEDULE_ID_ANTERIOR }),
      );
      expect(primeiro.respondeu, "202 imediato do primeiro").toBe(true);
      expect(linhas.get(SCHEDULE_ID_ANTERIOR)!.status).toBe("agendado");
      const backgroundDoPrimeiro = ultimaCallbackAfter();

      // Segundo agendamento (id B): o cancel-all antecede o INSERT e cancela A.
      const segundo = await scheduleSemEsperar(
        corpoSchedule({ scheduleId: SCHEDULE_ID }),
      );
      expect(segundo.respondeu, "202 imediato do segundo").toBe(true);
      expect(linhas.get(SCHEDULE_ID_ANTERIOR)!.status).toBe("cancelado");
      expect(linhas.get(SCHEDULE_ID)!.status).toBe("agendado");

      // Background do primeiro re-lê `cancelado` e NUNCA envia; o do segundo
      // (único agendado) envia ao fim da espera.
      const backgroundDoSegundo = ultimaCallbackAfter();
      const p1 = backgroundDoPrimeiro();
      const p2 = backgroundDoSegundo();
      await vi.advanceTimersByTimeAsync(90_000);
      await p1;
      await p2;

      expect(sendNotificationMock).toHaveBeenCalledTimes(1);
      expect(markRestScheduleSent).toHaveBeenCalledTimes(1);
      expect(markRestScheduleSent).toHaveBeenCalledWith(
        expect.anything(),
        SCHEDULE_ID,
      );
      expect(markRestScheduleFailed).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 8. Re-leitura de status no background (mata push órfão — DA9, mantida)
  // -------------------------------------------------------------------------
  describe("8. re-leitura de status antes de enviar (background)", () => {
    it("agendamento re-lido como cancelado termina o background sem enviar e sem marcar enviado/erro", async () => {
      vi.mocked(findRestScheduleById).mockResolvedValue(
        agendamento({ status: "cancelado" }),
      );

      const { respondeu, response } = await scheduleSemEsperar(
        corpoSchedule({ durationSeconds: 90 }),
      );
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);

      const background = dispararBackground();
      await vi.advanceTimersByTimeAsync(90_000);
      await background;

      expect(sendNotificationMock).not.toHaveBeenCalled();
      expect(markRestScheduleSent).not.toHaveBeenCalled();
      expect(markRestScheduleFailed).not.toHaveBeenCalled();
    });

    it("linha sumida (re-leitura nula) também termina sem enviar (mesmo desfecho de cancelado)", async () => {
      vi.mocked(findRestScheduleById).mockResolvedValue(null);

      const { respondeu, response } = await scheduleSemEsperar(
        corpoSchedule({ durationSeconds: 90 }),
      );
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);

      const background = dispararBackground();
      await vi.advanceTimersByTimeAsync(90_000);
      await background;

      expect(sendNotificationMock).not.toHaveBeenCalled();
      expect(markRestScheduleSent).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 9. Falhas do web-push no background (DA13 — try/catch integral, a
  //    callback nunca rejeita / nenhum unhandled rejection)
  // -------------------------------------------------------------------------
  describe("9. falhas do web-push no background", () => {
    it.each([404, 410])(
      "erro do web-push com statusCode %i remove a assinatura morta, marca erro e loga console.error — sem rejeitar a callback",
      async (statusCode) => {
        sendNotificationMock.mockRejectedValue(erroComStatus(statusCode));
        const erroLog = vi
          .spyOn(console, "error")
          .mockImplementation(() => undefined);

        const { respondeu, response } = await scheduleSemEsperar(
          corpoSchedule({ durationSeconds: 90 }),
        );
        expect(respondeu, "202 imediato obrigatório").toBe(true);
        expect(response!.status).toBe(202);

        const background = dispararBackground();
        await vi.advanceTimersByTimeAsync(90_000);
        // A callback inteira roda em try/catch: nenhuma exceção escapa para o
        // runtime (nenhum unhandled rejection) — await sem .catch.
        await background;

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
        expect(erroLog).toHaveBeenCalled();
      },
    );

    it("demais erros de envio marcam erro e logam console.error sem remover a assinatura — sem rejeitar a callback", async () => {
      sendNotificationMock.mockRejectedValue(new Error("falha transitória"));
      const erroLog = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      const { respondeu, response } = await scheduleSemEsperar(
        corpoSchedule({ durationSeconds: 90 }),
      );
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);

      const background = dispararBackground();
      await vi.advanceTimersByTimeAsync(90_000);
      await background;

      expect(markRestScheduleFailed).toHaveBeenCalledWith(
        expect.anything(),
        SCHEDULE_ID,
      );
      expect(deleteSubscriptionByEndpoint).not.toHaveBeenCalled();
      expect(markRestScheduleSent).not.toHaveBeenCalled();
      expect(erroLog).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 10. cancel — síncrono no request, processável de imediato (Alavanca 2:
  //     nada fica pendurado na fila HTTP atrás do schedule)
  // -------------------------------------------------------------------------
  describe("10. cancel síncrono", () => {
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

    it("com um schedule respondido 202 e background pendurado, o cancel responde 200 imediatamente, sem avançar timers (sem fila atrás de POSTs pendurados)", async () => {
      const agendado = await scheduleSemEsperar(corpoSchedule());
      expect(
        agendado.respondeu,
        "o schedule deve responder 202 imediato antes do cancel (Alavanca 2)",
      ).toBe(true);
      expect(agendado.response!.status).toBe(202);

      // Nenhum avanço de relógio entre o 202 e o cancel: o request de cancel
      // é processável na hora.
      const res = await POST(requisicao(corpoCancel()));
      expect(res.status).toBe(200);
      expect(await corpoDe(res)).toEqual({
        scheduleId: SCHEDULE_ID,
        cancelled: true,
      });
      // O cancel em si não envia push; o background pendurado é quem envia
      // (e a re-leitura de status o matará — caso 8).
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 11. Payload exato do envio (plan §3 — Sender + textos congelados)
  // -------------------------------------------------------------------------
  describe("11. payload do envio (background)", () => {
    it("com nome do exercício: título 'Descanso terminado', corpo 'Descanso de <exercício> terminou.', url /milon/today e TTL 300", async () => {
      const { respondeu } = await scheduleSemEsperar(
        corpoSchedule({ durationSeconds: 90, exerciseName: EXERCICIO }),
      );
      expect(respondeu, "202 imediato obrigatório").toBe(true);

      const background = dispararBackground();
      await vi.advanceTimersByTimeAsync(90_000);
      await background;

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

      const { respondeu } = await scheduleSemEsperar(corpo);
      expect(respondeu, "202 imediato obrigatório").toBe(true);

      const background = dispararBackground();
      await vi.advanceTimersByTimeAsync(90_000);
      await background;

      expect(JSON.parse(chamadaSend(0)[1])).toEqual({
        title: "Descanso terminado",
        body: "O descanso terminou.",
        url: "/milon/today",
      });
    });
  });

  // -------------------------------------------------------------------------
  // 12. Propriedade da assinatura — blocker B2 da review (security): DA2
  //     (plan.md:224 "ainda que chamasse a rota, só agendaria para a própria
  //     sessão/assinatura") e spec.md:59 ("o endpoint nunca envia o push do
  //     descanso para outro usuário"). Convenção de status escolhida por Minos:
  //     403 (Forbidden) para "o recurso pertence a outro dono" — o plan não
  //     congela mensagem para esta recusa (os textos congelados 401/400/503
  //     continuam valendo), por isso o caso exige apenas um corpo JSON com
  //     `error` e não um texto específico.
  // -------------------------------------------------------------------------
  describe("12. propriedade da assinatura (B2 — sessão não agenda endpoint alheio)", () => {
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

    it("sessão B agenda com subscription cujo endpoint já pertence a A → 403, sem envio, sem escrita e sem reatribuição de created_by", async () => {
      semearAssinaturaDe(DONO_A);
      findSubscriptionByEndpointMock.mockResolvedValue({
        ...assinaturaArmazenada,
      });
      sessaoComEmail(DONO_B);
      instalarUpsertEstadual();

      const res = await POST(requisicao(corpoSchedule()));

      expect(res.status).toBe(403);
      expect(await corpoDe(res)).toHaveProperty("error");
      // O push do descanso NUNCA sai para a sessão de quem não é o dono
      // (spec.md:59) e nada é agendado para a assinatura alheia.
      expect(sendNotificationMock).not.toHaveBeenCalled();
      expect(createRestSchedule).not.toHaveBeenCalled();
      // Nenhuma escrita na linha alheia: a recusa acontece ANTES do upsert
      // e antes do cancel-all/INSERT (review-report finding B2 — a
      // reinscrição do próprio dono continua válida, mas a de outro dono não
      // pode sequer tocar a linha).
      expect(upsertSubscription).not.toHaveBeenCalled();
      expect(cancelAllRestSchedulesByOwner).not.toHaveBeenCalled();
      expect(afterMock).not.toHaveBeenCalled();
      expect(assinaturaArmazenada.created_by).toBe(DONO_A);
    });

    it("regressão: sessão A agenda com o próprio endpoint (linha já existente de A) — 202 imediato e envio em background", async () => {
      semearAssinaturaDe(DONO_A);
      findSubscriptionByEndpointMock.mockResolvedValue({
        ...assinaturaArmazenada,
      });
      sessaoComEmail(DONO_A);
      instalarUpsertEstadual();

      const { respondeu, response } = await scheduleSemEsperar(
        corpoSchedule(),
      );
      expect(respondeu, "202 imediato obrigatório").toBe(true);
      expect(response!.status).toBe(202);
      expect(await corpoDe(response!)).toEqual({
        scheduleId: SCHEDULE_ID,
        status: "agendado",
      });
      // Upsert do próprio dono segue válido (DA2 — a própria assinatura).
      expect(upsertSubscription).toHaveBeenCalledTimes(1);
      expect(vi.mocked(upsertSubscription).mock.calls[0][2]).toBe(DONO_A);
      expect(assinaturaArmazenada.created_by).toBe(DONO_A);

      const background = dispararBackground();
      await vi.advanceTimersByTimeAsync(90_000);
      await background;

      expect(sendNotificationMock).toHaveBeenCalledTimes(1);
      expect(markRestScheduleSent).toHaveBeenCalledWith(
        expect.anything(),
        SCHEDULE_ID,
      );
    });
  });
});
