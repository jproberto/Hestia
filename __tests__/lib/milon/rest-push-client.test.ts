/**
 * Contrato RED — Mílon #06 Timer de descanso auto + PWA push (TASK-005):
 * `lib/milon/rest-push-client.ts` (ainda INEXISTENTE) — helpers de push do
 * cliente: `ensureDeviceSubscription`, `scheduleRestPush`, `cancelRestPush` e
 * a regra pura `urlBase64ToUint8Array`.
 *
 * Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/spec.md`
 * (§3 infraestrutura PWA + push, §5 critérios 2, 8 e 10) + `plan.md` §3
 * (Helpers do cliente — assinaturas e semânticas exatas) + `tasks.json`
 * TASK-005 (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/rest-push-client` ainda não existe — Expected: FAIL com
 * falha de coleta "Cannot find module" (acceptanceCriteria 1 da TASK-005).
 * Hefesto fará GREEN (TASK-006) apenas com o contrato descrito no plano —
 * sem inventar APIs.
 *
 * Padrão: helpers de navegador simulados por `Object.defineProperty` em
 * `navigator.serviceWorker` (configurável) + `vi.stubGlobal` de
 * `Notification`/`PushManager`/`fetch` (mesmo harness da RED do hook);
 * `process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` atribuído no teste (o
 * setup global stuba `process` sem essa chave).
 *
 * NOTA (Minos → Hefesto): o contrato NÃO congela como o helper obtém a
 * registration (`serviceWorker.ready` ou `getRegistration()`); o double
 * cobre os dois caminhos e os testes só observam o resultado e as opções de
 * `subscribe`. Nenhum teste aqui solicita permissão (o gesto é do
 * `usePushPermission`, TASK-009).
 *
 * CONTRATO CONSUMIDO (plan.md §3 — helpers do cliente):
 * - `ensureDeviceSubscription(): Promise<object | null>` — `null` quando não
 *   há `navigator.serviceWorker`, a permissão não é `granted` ou não há
 *   `PushManager`; caso contrário usa `getSubscription()` (assinatura
 *   existente) ou `subscribe({ userVisibleOnly: true, applicationServerKey })`
 *   com a chave pública VAPID (`NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`) convertida
 *   por `urlBase64ToUint8Array`; devolve o JSON da assinatura (`endpoint` +
 *   `keys`); qualquer falha interna devolve `null` (nunca lança);
 * - `scheduleRestPush(input { scheduleId, subscription, durationSeconds,
 *   exerciseName? }): Promise<void>` — POST em `/api/milon/rest-push` com
 *   `action: "schedule"`; lança em resposta não-2xx;
 * - `cancelRestPush(scheduleId: string): Promise<void>` — POST com
 *   `action: "cancel"`; lança em resposta não-2xx;
 * - `urlBase64ToUint8Array(base64: string): Uint8Array` — regra pura de
 *   base64url → bytes (teste direto).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ensureDeviceSubscription,
  scheduleRestPush,
  cancelRestPush,
  urlBase64ToUint8Array,
} from "@/lib/milon/rest-push-client";

// ---------------------------------------------------------------------------
// Constantes do contrato
// ---------------------------------------------------------------------------

const ROTA = "/api/milon/rest-push";
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/dispositivo-1";
const NOVO_ENDPOINT = "https://fcm.googleapis.com/fcm/send/dispositivo-2";
const P256DH = "p256dh-chave-do-dispositivo";
const AUTH = "auth-segredo-do-dispositivo";
const SCHEDULE_ID = "7c2d9b4e-5f60-4a71-9c82-1d2e3f4a5b6c";
const EXERCICIO = "Supino reto";
// base64url sem `+`/`/`/`=` — entrada válida para urlBase64ToUint8Array.
const CHAVE_PUBLICA = "AQIDBAUGBwgJCgsMDQ4PEA";

// ---------------------------------------------------------------------------
// Fetch global observado
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();

function resposta(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ scheduleId: SCHEDULE_ID, status: "agendado" }),
    text: async () => "",
    ...overrides,
  };
}

function corpoDaChamada(indice: number): Record<string, unknown> {
  const chamada = fetchMock.mock.calls[indice];
  const init = chamada?.[1] as RequestInit | undefined;
  const body = init?.body;
  return typeof body === "string"
    ? (JSON.parse(body) as Record<string, unknown>)
    : (body as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Double de navegador com push
// ---------------------------------------------------------------------------

type AssinaturaBrowser = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  toJSON: () => { endpoint: string; keys: { p256dh: string; auth: string } };
};

function fazerAssinatura(endpoint = ENDPOINT): AssinaturaBrowser {
  return {
    endpoint,
    keys: { p256dh: P256DH, auth: AUTH },
    toJSON: () => ({ endpoint, keys: { p256dh: P256DH, auth: AUTH } }),
  };
}

interface OpcoesNavegador {
  permissao?: "granted" | "denied" | "default";
  assinaturaExistente?: AssinaturaBrowser | null;
  comPushManager?: boolean;
  semServiceWorker?: boolean;
}

function instalarNavegador(opcoes: OpcoesNavegador = {}): {
  getSubscription: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
} {
  const {
    permissao = "granted",
    assinaturaExistente = null,
    comPushManager = true,
    semServiceWorker = false,
  } = opcoes;

  vi.stubGlobal("Notification", { permission: permissao });
  if (comPushManager) {
    vi.stubGlobal("PushManager", class PushManager {});
  }

  if (semServiceWorker) {
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
    return { getSubscription: vi.fn(), subscribe: vi.fn() };
  }

  const getSubscription = vi.fn(async () => assinaturaExistente);
  const subscribe = vi.fn(async () => fazerAssinatura(NOVO_ENDPOINT));
  const registration = { pushManager: { getSubscription, subscribe } };
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      ready: Promise.resolve(registration),
      getRegistration: async () => registration,
      register: async () => registration,
    },
  });
  return { getSubscription, subscribe };
}

const INPUT_AGENDAMENTO = {
  scheduleId: SCHEDULE_ID,
  subscription: { endpoint: ENDPOINT, keys: { p256dh: P256DH, auth: AUTH } },
  durationSeconds: 90,
  exerciseName: EXERCICIO,
};

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(resposta());
  vi.stubGlobal("fetch", fetchMock);
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY = CHAVE_PUBLICA;
});

afterEach(() => {
  vi.unstubAllGlobals();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).serviceWorker;
  delete process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
});

// ---------------------------------------------------------------------------

describe("Mílon #06 — rest-push-client (contrato RED, TASK-005)", () => {
  // -------------------------------------------------------------------------
  // 1. ensureDeviceSubscription — indisponibilidades devolvem null
  // -------------------------------------------------------------------------
  describe("1. ensureDeviceSubscription — indisponibilidade devolve null", () => {
    it("sem navigator.serviceWorker devolve null (mesmo com permissão granted)", async () => {
      instalarNavegador({ semServiceWorker: true, permissao: "granted" });

      await expect(ensureDeviceSubscription()).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("com permissão denied devolve null e não tenta assinatura", async () => {
      const { getSubscription, subscribe } = instalarNavegador({
        permissao: "denied",
        assinaturaExistente: fazerAssinatura(),
      });

      await expect(ensureDeviceSubscription()).resolves.toBeNull();
      expect(getSubscription).not.toHaveBeenCalled();
      expect(subscribe).not.toHaveBeenCalled();
    });

    it("com permissão default devolve null (o gesto pertence ao usePushPermission)", async () => {
      const { getSubscription, subscribe } = instalarNavegador({
        permissao: "default",
        assinaturaExistente: fazerAssinatura(),
      });

      await expect(ensureDeviceSubscription()).resolves.toBeNull();
      expect(getSubscription).not.toHaveBeenCalled();
      expect(subscribe).not.toHaveBeenCalled();
    });

    it("sem PushManager global devolve null mesmo com permissão granted e assinatura existente", async () => {
      const { getSubscription } = instalarNavegador({
        comPushManager: false,
        assinaturaExistente: fazerAssinatura(),
      });

      await expect(ensureDeviceSubscription()).resolves.toBeNull();
      expect(getSubscription).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 2. ensureDeviceSubscription — caminho granted
  // -------------------------------------------------------------------------
  describe("2. ensureDeviceSubscription — sob permissão granted", () => {
    it("com assinatura existente devolve o JSON (endpoint + keys) sem subscrever de novo", async () => {
      const { getSubscription, subscribe } = instalarNavegador({
        assinaturaExistente: fazerAssinatura(),
      });

      const resultado = await ensureDeviceSubscription();

      expect(getSubscription).toHaveBeenCalledTimes(1);
      expect(subscribe).not.toHaveBeenCalled();
      expect(resultado).not.toBeNull();
      expect(resultado).toMatchObject({
        endpoint: ENDPOINT,
        keys: { p256dh: P256DH, auth: AUTH },
      });
    });

    it("sem assinatura existente subscreve com userVisibleOnly e applicationServerKey derivada da env NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY", async () => {
      const { subscribe } = instalarNavegador({ assinaturaExistente: null });

      const resultado = await ensureDeviceSubscription();

      expect(subscribe).toHaveBeenCalledTimes(1);
      const opcoes = subscribe.mock.calls[0][0] as {
        userVisibleOnly?: boolean;
        applicationServerKey?: Uint8Array;
      };
      expect(opcoes.userVisibleOnly).toBe(true);
      expect(opcoes.applicationServerKey).toBeInstanceOf(Uint8Array);
      const chaveAplicada = opcoes.applicationServerKey as Uint8Array;
      expect(Array.from(chaveAplicada)).toEqual(
        Array.from(urlBase64ToUint8Array(CHAVE_PUBLICA)),
      );
      expect(resultado).toMatchObject({
        endpoint: NOVO_ENDPOINT,
        keys: { p256dh: P256DH, auth: AUTH },
      });
    });

    it("falha interna em getSubscription devolve null sem lançar", async () => {
      const { getSubscription } = instalarNavegador({
        assinaturaExistente: fazerAssinatura(),
      });
      getSubscription.mockRejectedValueOnce(new Error("getSubscription falhou"));

      await expect(ensureDeviceSubscription()).resolves.toBeNull();
    });

    it("falha interna em subscribe devolve null sem lançar", async () => {
      const { subscribe } = instalarNavegador({ assinaturaExistente: null });
      subscribe.mockRejectedValueOnce(new Error("subscribe falhou"));

      await expect(ensureDeviceSubscription()).resolves.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 3. scheduleRestPush — POST com action schedule; lança em não-2xx
  // -------------------------------------------------------------------------
  describe("3. scheduleRestPush", () => {
    it("faz POST em /api/milon/rest-push com action schedule e o input recebido", async () => {
      await scheduleRestPush(INPUT_AGENDAMENTO);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(ROTA);
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("POST");
      expect(corpoDaChamada(0)).toMatchObject({
        action: "schedule",
        scheduleId: SCHEDULE_ID,
        durationSeconds: 90,
        exerciseName: EXERCICIO,
        subscription: { endpoint: ENDPOINT, keys: { p256dh: P256DH, auth: AUTH } },
      });
    });

    it("lança em resposta não-2xx (500)", async () => {
      fetchMock.mockResolvedValue(
        resposta({ ok: false, status: 500, statusText: "Internal Server Error" }),
      );

      await expect(scheduleRestPush(INPUT_AGENDAMENTO)).rejects.toBeDefined();
    });

    it("lança em resposta não-2xx (400)", async () => {
      fetchMock.mockResolvedValue(
        resposta({ ok: false, status: 400, statusText: "Bad Request" }),
      );

      await expect(scheduleRestPush(INPUT_AGENDAMENTO)).rejects.toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 4. cancelRestPush — POST com action cancel; lança em não-2xx
  // -------------------------------------------------------------------------
  describe("4. cancelRestPush", () => {
    it("faz POST em /api/milon/rest-push com action cancel e o scheduleId", async () => {
      await cancelRestPush(SCHEDULE_ID);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(ROTA);
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("POST");
      expect(corpoDaChamada(0)).toMatchObject({
        action: "cancel",
        scheduleId: SCHEDULE_ID,
      });
    });

    it("lança em resposta não-2xx (400)", async () => {
      fetchMock.mockResolvedValue(
        resposta({ ok: false, status: 400, statusText: "Bad Request" }),
      );

      await expect(cancelRestPush(SCHEDULE_ID)).rejects.toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 5. urlBase64ToUint8Array — regra pura (teste direto)
  // -------------------------------------------------------------------------
  describe("5. urlBase64ToUint8Array (regra pura)", () => {
    it("converte base64url para Uint8Array (chave pública VAPID)", () => {
      const convertida = urlBase64ToUint8Array("AQID");
      expect(convertida).toBeInstanceOf(Uint8Array);
      expect(Array.from(convertida)).toEqual([1, 2, 3]);
    });

    it("aplica o padding implícito da base64url (comprimento não múltiplo de 4)", () => {
      expect(Array.from(urlBase64ToUint8Array("AQIDBA"))).toEqual([1, 2, 3, 4]);
    });

    it("aceita o alfabeto url-safe: '-' no lugar de '+' e '_' no lugar de '/'", () => {
      // "----" = base64 padrão "++++" (bytes FB EF BE); "____" = "////" (FF FF FF).
      expect(Array.from(urlBase64ToUint8Array("----"))).toEqual([251, 239, 190]);
      expect(Array.from(urlBase64ToUint8Array("____"))).toEqual([255, 255, 255]);
      expect(Array.from(urlBase64ToUint8Array("Pz8_"))).toEqual([63, 63, 63]);
    });

    it("é determinística: a mesma entrada produz os mesmos bytes", () => {
      const a = Array.from(urlBase64ToUint8Array(CHAVE_PUBLICA));
      const b = Array.from(urlBase64ToUint8Array(CHAVE_PUBLICA));
      expect(a).toEqual(b);
      expect(a.length).toBeGreaterThan(0);
    });
  });
});
