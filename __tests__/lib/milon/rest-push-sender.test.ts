/**
 * Contrato RED — Mílon #06 Timer de descanso auto + PWA push (TASK-007):
 * `lib/milon/rest-push-sender.ts` (ainda INEXISTENTE) — módulo de envio do
 * servidor: `getRestPushVapidDetails` e `sendRestEndPush` sobre `web-push`.
 *
 * Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/spec.md`
 * (§3 push de servidor VAPID) + `plan.md` §3 (Sender — assinaturas e
 * semânticas exatas, payload congelado, TTL 300) + `tasks.json` TASK-007
 * (acceptanceCriteria "Caso RED do sender" — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/rest-push-sender` ainda não existe — Expected: FAIL com
 * falha de coleta "Cannot find module" (acceptanceCriteria 1 da TASK-007).
 * Hefesto fará GREEN (TASK-008) apenas com o contrato descrito no plano —
 * sem inventar APIs.
 *
 * MOCK: `web-push` via `vi.hoisted` + factory — o handle do mock vem do
 * hoisted justamente para o `tsc --noEmit` do RED acusar SOMENTE o
 * Cannot find module deste módulo-alvo (o pacote e `@types/web-push` entram
 * na TASK-008; um import estático de "web-push" aqui acrescentaria um erro
 * de tipo não previsto no sinal RED).
 *
 * Env vars manipuladas no `process.env` global do setup (`WEB_PUSH_SUBJECT`,
 * `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` — DA8); padrão de
 * manipulação idêntico ao de `__tests__/lib/milon/rest-push-client.test.ts`.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — Sender):
 * - `getRestPushVapidDetails(): { subject, publicKey, privateKey } | null` —
 *   lê as três env vars; `null` se qualquer uma faltar;
 * - `sendRestEndPush(subscription: DevicePushSubscription, payload:
 *   { title, body, url }): Promise<void>` — `sendNotification` com os VAPID
 *   details e TTL de 300 segundos; em falha lança erro com a propriedade
 *   `statusCode` legível (a rota decide remoção de assinatura em 404/410).
 *
 * A composição do payload (título/corpo/url a partir de `exerciseName`) é da
 * rota (contrato da rota — `__tests__/app/api/milon/rest-push/route.test.ts`);
 * aqui o payload congelado é repassado adiante como JSON sem paráfrase.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getRestPushVapidDetails,
  sendRestEndPush,
} from "@/lib/milon/rest-push-sender";
import type { DevicePushSubscription } from "@/lib/milon/types";

// ---------------------------------------------------------------------------
// Mock de `web-push` sem import do pacote (vi.hoisted — ver cabeçalho)
// ---------------------------------------------------------------------------

const { sendNotificationMock } = vi.hoisted(() => ({
  sendNotificationMock: vi.fn(),
}));

vi.mock("web-push", () => ({
  default: { sendNotification: sendNotificationMock },
  sendNotification: sendNotificationMock,
}));

// ---------------------------------------------------------------------------
// Constantes do contrato
// ---------------------------------------------------------------------------

const SUBJECT = "mailto:dono@hestia.lan";
const VAPID_PUBLIC = "chave-publica-vapid";
const VAPID_PRIVATE = "chave-privada-vapid";

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/dispositivo-1";
const P256DH = "p256dh-chave-do-dispositivo";
const AUTH = "auth-segredo-do-dispositivo";

const ASSINATURA: DevicePushSubscription = {
  id: "3f1c8f9e-1a2b-4c5d-8e6f-0a1b2c3d4e5f",
  endpoint: ENDPOINT,
  p256dh: P256DH,
  auth: AUTH,
  createdAt: "2026-10-18T12:00:00.000Z",
  created_by: "dono-sessao@hestia.lan",
};

const PAYLOAD = {
  title: "Descanso terminado",
  body: "Descanso de Supino reto terminou.",
  url: "/milon/today",
};

function instalarVapidCompleto() {
  process.env.WEB_PUSH_SUBJECT = SUBJECT;
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY = VAPID_PUBLIC;
  process.env.WEB_PUSH_PRIVATE_KEY = VAPID_PRIVATE;
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

function erroComStatus(statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(`WebPushError ${statusCode}`), {
    statusCode,
  });
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  sendNotificationMock.mockResolvedValue({});
  instalarVapidCompleto();
});

afterEach(() => {
  delete process.env.WEB_PUSH_SUBJECT;
  delete process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  delete process.env.WEB_PUSH_PRIVATE_KEY;
});

// ---------------------------------------------------------------------------

describe("Mílon #06 — rest-push-sender (contrato RED, TASK-007)", () => {
  // -------------------------------------------------------------------------
  // 1. getRestPushVapidDetails — env vars (DA8)
  // -------------------------------------------------------------------------
  describe("1. getRestPushVapidDetails", () => {
    it("lê WEB_PUSH_SUBJECT, NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY e WEB_PUSH_PRIVATE_KEY", () => {
      expect(getRestPushVapidDetails()).toEqual({
        subject: SUBJECT,
        publicKey: VAPID_PUBLIC,
        privateKey: VAPID_PRIVATE,
      });
    });

    it.each([
      "WEB_PUSH_SUBJECT",
      "NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY",
      "WEB_PUSH_PRIVATE_KEY",
    ])("devolve null se %s faltar", (variavel) => {
      delete process.env[variavel];

      expect(getRestPushVapidDetails()).toBeNull();
    });

    it("devolve null com o ambiente vazio (nenhuma das três presente)", () => {
      delete process.env.WEB_PUSH_SUBJECT;
      delete process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
      delete process.env.WEB_PUSH_PRIVATE_KEY;

      expect(getRestPushVapidDetails()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 2. sendRestEndPush — envio com VAPID details e TTL 300 (plan §3)
  // -------------------------------------------------------------------------
  describe("2. sendRestEndPush", () => {
    it("chama sendNotification com a assinatura do dispositivo, o payload como JSON e TTL 300 + vapidDetails", async () => {
      await sendRestEndPush(ASSINATURA, PAYLOAD);

      expect(sendNotificationMock).toHaveBeenCalledTimes(1);
      const chamada = chamadaSend(0);
      expect(chamada[0]).toMatchObject({
        endpoint: ENDPOINT,
        keys: { p256dh: P256DH, auth: AUTH },
      });
      expect(JSON.parse(chamada[1])).toEqual(PAYLOAD);
      expect(chamada[2]).toMatchObject({
        TTL: 300,
        vapidDetails: {
          subject: SUBJECT,
          publicKey: VAPID_PUBLIC,
          privateKey: VAPID_PRIVATE,
        },
      });
    });

    it("propaga erro do web-push com statusCode legível (410 — a rota remove a assinatura morta)", async () => {
      sendNotificationMock.mockRejectedValue(erroComStatus(410));

      await expect(sendRestEndPush(ASSINATURA, PAYLOAD)).rejects.toMatchObject({
        statusCode: 410,
      });
    });

    it("propaga erro do web-push com statusCode legível (404)", async () => {
      sendNotificationMock.mockRejectedValue(erroComStatus(404));

      await expect(sendRestEndPush(ASSINATURA, PAYLOAD)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
