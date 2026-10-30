import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  createFakePushRepository,
  FakePushRepository,
} from "@/lib/milon/repositories/fakes/fakePushRepository";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-003 (Mílon #06 — Timer de descanso auto + PWA push) —
// consumido pela TASK-004.
// Fonte: plan.md §3 (Tipos novos e Interfaces de repositório — assinaturas
// exatas das sete operações originais do IPushRepository) + tasks.json
// TASK-003 (casos do contract fakes-only) + migração 0017 (push_subscriptions.endpoint
// único; rest_push_schedules com FK em cascata, status
// agendado/enviado/cancelado/erro e sent_at anulável).
//
// 8ª operação (re-review da feature, fix 8eec148 / blocker B2):
// findSubscriptionByEndpoint(endpoint) → linha em domínio ou null. Acrescentada
// AO CONTRATO SEM REMOVER as sete originais — antes esta nota a afirmava coberta
// e o arquivo não a exercitava (grep 0); agora a fake e a lista de operações da
// fonte única incluem a 8ª.
//
// Contrato fakes-only (decisão 57): só o fake em memória é exercitado; o
// repository real é verificado pelas cadeias de query em `db/push.test.ts`
// (mesmo regime das execuções da Mílon #5) e por tsc quando a rota/barrel o
// consomem. Nenhum teste aqui bate no banco real.
//
// O fake lib/milon/repositories/fakes/fakePushRepository.ts ainda NÃO existe:
// este arquivo falha na coleta até Hefesto entregá-lo (Expected: FAIL por
// módulo inexistente — precedente das fakes-only da Mílon #5).
//
// Emenda 2026-10-23 (fix-01-server, Alavanca 3 / DA18 — RED da TASK-016):
// cancelAllRestSchedulesByOwner(email) → Promise<void> — nova operação do
// contrato (contagem vigente: 9ª, após findSubscriptionByEndpoint do B2; o
// plano a chama "oitava" contando só as sete originais). Cancela (status
// cancelado) TODOS os agendamentos do próprio dono que estiverem `agendado`
// no momento da chamada — nunca filtra por id, nunca sem dono; não toca
// terminais (enviado/cancelado/erro) nem agendamentos de outro dono. Assinatura
// e semântica: plan.md §Emenda 2026-10-23 (Alavanca 3/DA18) + tasks.json
// TASK-016 ("devolve void" — decisão registrada pelo Minos: o prompt de
// delegação pedia Promise<number> + standalone, mas o plano/tasks humanamente
// aprovados prevalecem; TASK-017 exige busca por
// cancelAllRestSchedulesByOwnerStandalone == 0, portanto SEM standalone).
//
// Seed no padrão controlado das fakes do módulo (precedente
// WorkoutExecutionSeed):
//   createFakePushRepository(seed?) com
//   seed = { subscriptions?: DevicePushSubscription[];
//            schedules?: RestPushSchedule[] }  (domínio camelCase).
//
// Espelhos estruturais locais (abaixo) reproduzem field-by-field o plan §3
// enquanto a fonte única (lib/milon/types.ts) e o IPushRepository ainda não
// existem: mantêm o `tsc --noEmit` do RED limpo — só Cannot find module nos
// módulos novos —, precedente de types.test.ts ("leitura da fonte por texto
// para manter tsc limpo"). A atribuição tipada de `build` ancora a factory
// real a este contrato em GREEN (assinaturas conferidas em compilação).
// ---------------------------------------------------------------------------

const EMAIL = "push-contrato@hestia.lan";
const OUTRO_EMAIL = "push-contrato-outro@hestia.lan";
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/dispositivo-1";
const OUTRO_ENDPOINT = "https://fcm.googleapis.com/fcm/send/dispositivo-2";
const SUBSCRIPTION_ID = "3f1c8f9e-1a2b-4c5d-8e6f-0a1b2c3d4e5f";
const OUTRO_SUBSCRIPTION_ID = "0b2c4d6e-8f90-4a1b-8c2d-3e4f5a6b7c8d";
const SCHEDULE_ID = "7c2d9b4e-5f60-4a71-9c82-1d2e3f4a5b6c";
const OUTRO_SCHEDULE_ID = "e4f5a6b7-c8d9-4e0f-a1b2-3c4d5e6f7a8b";
// Ids extras do cancel-all (Emenda 2026-10-23, TASK-016): segundas linhas do
// mesmo dono (incl. terminais) e o agendamento criado DEPOIS do cancel-all.
const SEGUNDO_AGENDADO_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const TERMINAL_ENVIADO_ID = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";
const TERMINAL_CANCELADO_ID = "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f";
const TERMINAL_ERRO_ID = "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80";
const NOVO_SCHEDULE_ID = "e5f6a7b8-c9d9-4e1f-2a3b-4c5d6e7f8091";
const FIRE_AT = "2026-10-16T10:01:30.000Z";
const CRIADO_EM = "2026-10-16T10:00:00.000Z";
const ENVIADO_EM = "2026-10-16T10:01:40.000Z";
const P256DH = "p256dh-chave-do-dispositivo";
const AUTH = "auth-segredo-do-dispositivo";

// --- Espelhos do plan §3 (enquanto a fonte única não existe — RED limpo) ---

interface DevicePushSubscriptionMirror {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
  created_by: string;
}

type RestPushScheduleStatusMirror = "agendado" | "enviado" | "cancelado" | "erro";

interface RestPushScheduleMirror {
  id: string;
  subscriptionId: string;
  durationSeconds: number;
  fireAt: string;
  status: RestPushScheduleStatusMirror;
  sentAt: string | null;
  createdAt: string;
  created_by: string;
}

interface UpsertPushSubscriptionInputMirror {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface CreateRestPushScheduleInputMirror {
  id: string;
  subscriptionId: string;
  durationSeconds: number;
  fireAt: string;
}

interface PushSeed {
  subscriptions?: DevicePushSubscriptionMirror[];
  schedules?: RestPushScheduleMirror[];
}

// Contrato das nove operações do IPushRepository no fake (as sete do plan §3
// + findSubscriptionByEndpoint do B2 + cancelAllRestSchedulesByOwner da
// emenda 2026-10-23; sem db: o fake
// em memória segue o regime de IWorkoutExecutionRepository; o repository
// real recebe db: IDatabaseClient nas funções do módulo — plan §3).
interface PushRepositoryContract {
  upsertSubscription(
    input: UpsertPushSubscriptionInputMirror,
    email: string,
  ): Promise<DevicePushSubscriptionMirror>;
  findSubscriptionByEndpoint(
    endpoint: string,
  ): Promise<DevicePushSubscriptionMirror | null>;
  createRestSchedule(
    input: CreateRestPushScheduleInputMirror,
    email: string,
  ): Promise<RestPushScheduleMirror>;
  findRestScheduleById(
    scheduleId: string,
  ): Promise<RestPushScheduleMirror | null>;
  cancelRestSchedule(scheduleId: string, email: string): Promise<boolean>;
  cancelAllRestSchedulesByOwner(email: string): Promise<void>;
  markRestScheduleSent(scheduleId: string): Promise<void>;
  markRestScheduleFailed(scheduleId: string): Promise<void>;
  deleteSubscriptionByEndpoint(endpoint: string): Promise<void>;
}

// Checagem estática da factory: em GREEN o retorno real precisa satisfazer o
// contrato espelhado; em RED o import falha e o valor é any — só Cannot
// find module (sinal RED documentado da TASK-003).
const build: (seed?: PushSeed) => PushRepositoryContract =
  createFakePushRepository;

function makeSubscription(
  overrides: Partial<DevicePushSubscriptionMirror> = {},
): DevicePushSubscriptionMirror {
  return {
    id: SUBSCRIPTION_ID,
    endpoint: ENDPOINT,
    p256dh: P256DH,
    auth: AUTH,
    createdAt: CRIADO_EM,
    created_by: EMAIL,
    ...overrides,
  };
}

function makeSchedule(
  overrides: Partial<RestPushScheduleMirror> = {},
): RestPushScheduleMirror {
  return {
    id: SCHEDULE_ID,
    subscriptionId: SUBSCRIPTION_ID,
    durationSeconds: 90,
    fireAt: FIRE_AT,
    status: "agendado",
    sentAt: null,
    createdAt: CRIADO_EM,
    created_by: EMAIL,
    ...overrides,
  };
}

function makeUpsertInput(
  overrides: Partial<UpsertPushSubscriptionInputMirror> = {},
): UpsertPushSubscriptionInputMirror {
  return {
    endpoint: ENDPOINT,
    p256dh: P256DH,
    auth: AUTH,
    ...overrides,
  };
}

function makeCreateInput(
  overrides: Partial<CreateRestPushScheduleInputMirror> = {},
): CreateRestPushScheduleInputMirror {
  return {
    id: SCHEDULE_ID,
    subscriptionId: SUBSCRIPTION_ID,
    durationSeconds: 90,
    fireAt: FIRE_AT,
    ...overrides,
  };
}

describe("IPushRepository contract (fakes-only, decisão 57): fake em memória", () => {
  let repo: PushRepositoryContract;

  beforeEach(() => {
    repo = build();
  });

  it("exporta a classe FakePushRepository e a factory no padrão das fakes do módulo", () => {
    expect(typeof FakePushRepository).toBe("function");
    expect(typeof createFakePushRepository).toBe("function");
  });

  // -------------------------------------------------------------------------
  // upsertSubscription — upsert por conflito no endpoint (endpoint único da
  // 0017): reinscrição do mesmo dispositivo atualiza chaves e autoria ao dono
  // da sessão corrente (plan §3).
  // -------------------------------------------------------------------------
  describe("upsertSubscription", () => {
    it("cria a assinatura do dispositivo com a autoria do email informado", async () => {
      const sub = await repo.upsertSubscription(makeUpsertInput(), EMAIL);

      expect(sub.id).toBeDefined();
      expect(sub.endpoint).toBe(ENDPOINT);
      expect(sub.p256dh).toBe(P256DH);
      expect(sub.auth).toBe(AUTH);
      expect(typeof sub.createdAt).toBe("string");
      expect(sub.created_by).toBe(EMAIL);
    });

    it("reinscrição do mesmo endpoint faz upsert por conflito: atualiza chaves e autoria SEM trocar o id", async () => {
      const seeded = build({
        subscriptions: [
          makeSubscription({
            p256dh: "p256dh-antiga",
            auth: "auth-antiga",
            created_by: OUTRO_EMAIL,
          }),
        ],
      });

      const sub = await seeded.upsertSubscription(makeUpsertInput(), EMAIL);

      expect(sub.id).toBe(SUBSCRIPTION_ID);
      expect(sub).toMatchObject({
        p256dh: P256DH,
        auth: AUTH,
        created_by: EMAIL,
      });

      // Segunda reinscrição segue idempotente (mesmo id, sem duplicar linha).
      const deNovo = await seeded.upsertSubscription(
        makeUpsertInput({ p256dh: "p256dh-terceira" }),
        EMAIL,
      );
      expect(deNovo.id).toBe(SUBSCRIPTION_ID);
      expect(deNovo.p256dh).toBe("p256dh-terceira");
    });

    it("endpoint diferente cria OUTRA assinatura (o conflito é por endpoint)", async () => {
      const seeded = build({ subscriptions: [makeSubscription()] });

      const outra = await seeded.upsertSubscription(
        makeUpsertInput({ endpoint: OUTRO_ENDPOINT }),
        EMAIL,
      );

      expect(outra.id).not.toBe(SUBSCRIPTION_ID);
      expect(outra.endpoint).toBe(OUTRO_ENDPOINT);
      expect(outra.created_by).toBe(EMAIL);
    });
  });

  // -------------------------------------------------------------------------
  // findSubscriptionByEndpoint — 8ª operação (B2 / DA2): devolve a assinatura
  // já gravada para o endpoint informado (a rota usa para recusar 403 antes do
  // upsert) ou nulo quando o endpoint ainda não tem dono.
  // -------------------------------------------------------------------------
  describe("findSubscriptionByEndpoint", () => {
    it("devolve a linha do endpoint em domínio camelCase", async () => {
      const seeded = build({
        subscriptions: [makeSubscription()],
        schedules: [makeSchedule()],
      });

      const found = await seeded.findSubscriptionByEndpoint(ENDPOINT);

      expect(found).toEqual({
        id: SUBSCRIPTION_ID,
        endpoint: ENDPOINT,
        p256dh: P256DH,
        auth: AUTH,
        createdAt: CRIADO_EM,
        created_by: EMAIL,
      });
    });

    it("devolve nulo para endpoint sem assinatura cadastrada", async () => {
      const seeded = build({ subscriptions: [makeSubscription()] });

      await expect(
        seeded.findSubscriptionByEndpoint("https://fcm.googleapis.com/fcm/send/sem-cadastro"),
      ).resolves.toBeNull();
      await expect(
        seeded.findSubscriptionByEndpoint(OUTRO_ENDPOINT),
      ).resolves.toBeNull();
    });

    it("a leitura nao altera a assinatura existente (a rota decide o 403 sem escrever)", async () => {
      const seeded = build({ subscriptions: [makeSubscription()] });

      await seeded.findSubscriptionByEndpoint(ENDPOINT);

      const alheia = await seeded.findSubscriptionByEndpoint(ENDPOINT);
      expect(alheia?.created_by).toBe(EMAIL);
      expect(alheia?.p256dh).toBe(P256DH);
      expect(alheia?.id).toBe(SUBSCRIPTION_ID);
    });
  });

  // -------------------------------------------------------------------------
  // createRestSchedule — INSERT com o id gerado no cliente (DA3: cancelável
  // durante a espera da rota), duração e instante informados, status inicial
  // agendado (plan §3 + migração 0017).
  // -------------------------------------------------------------------------
  describe("createRestSchedule", () => {
    it("persiste com o id vindo do input, durationSeconds e fireAt informados e status agendado", async () => {
      const schedule = await repo.createRestSchedule(makeCreateInput(), EMAIL);

      expect(schedule).toEqual({
        id: SCHEDULE_ID,
        subscriptionId: SUBSCRIPTION_ID,
        durationSeconds: 90,
        fireAt: FIRE_AT,
        status: "agendado",
        sentAt: null,
        createdAt: expect.any(String),
        created_by: EMAIL,
      });
    });

    it("o agendamento criado fica localizável pelo id do cliente", async () => {
      await repo.createRestSchedule(makeCreateInput(), EMAIL);

      const found = await repo.findRestScheduleById(SCHEDULE_ID);

      expect(found).toMatchObject({
        id: SCHEDULE_ID,
        subscriptionId: SUBSCRIPTION_ID,
        status: "agendado",
        created_by: EMAIL,
      });
    });
  });

  // -------------------------------------------------------------------------
  // findRestScheduleById — linha do domínio ou nulo (re-leitura de status da
  // rota antes de enviar — DA9).
  // -------------------------------------------------------------------------
  describe("findRestScheduleById", () => {
    it("devolve a linha em domínio camelCase", async () => {
      const seeded = build({ schedules: [makeSchedule()] });

      const found = await seeded.findRestScheduleById(SCHEDULE_ID);

      expect(found).toEqual({
        id: SCHEDULE_ID,
        subscriptionId: SUBSCRIPTION_ID,
        durationSeconds: 90,
        fireAt: FIRE_AT,
        status: "agendado",
        sentAt: null,
        createdAt: CRIADO_EM,
        created_by: EMAIL,
      });
    });

    it("devolve nulo para id inexistente", async () => {
      const seeded = build({ schedules: [makeSchedule()] });

      await expect(
        seeded.findRestScheduleById("00000000-0000-4000-8000-000000000000"),
      ).resolves.toBeNull();
      await expect(
        seeded.findRestScheduleById(OUTRO_SCHEDULE_ID),
      ).resolves.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // cancelRestSchedule — true somente para linha do PRÓPRIO dono ainda com
  // status agendado; alheio, inexistente ou terminal devolve false e nunca
  // erro (guarda de dono na aplicação, precedente das execuções — plan §3).
  // -------------------------------------------------------------------------
  describe("cancelRestSchedule", () => {
    it("devolve true para o agendamento do próprio dono ainda agendado e o status vira cancelado", async () => {
      const seeded = build({ schedules: [makeSchedule()] });

      await expect(
        seeded.cancelRestSchedule(SCHEDULE_ID, EMAIL),
      ).resolves.toBe(true);

      const found = await seeded.findRestScheduleById(SCHEDULE_ID);
      expect(found?.status).toBe("cancelado");

      // Cancelar de novo nunca duplica efeito: a linha já é terminal.
      await expect(
        seeded.cancelRestSchedule(SCHEDULE_ID, EMAIL),
      ).resolves.toBe(false);
      expect((await seeded.findRestScheduleById(SCHEDULE_ID))?.status).toBe(
        "cancelado",
      );
    });

    it("devolve false para agendamento de outro dono e a linha alheia permanece agendado", async () => {
      const seeded = build({
        schedules: [makeSchedule({ created_by: OUTRO_EMAIL })],
      });

      await expect(
        seeded.cancelRestSchedule(SCHEDULE_ID, EMAIL),
      ).resolves.toBe(false);

      const alheio = await seeded.findRestScheduleById(SCHEDULE_ID);
      expect(alheio?.status).toBe("agendado");
      expect(alheio?.created_by).toBe(OUTRO_EMAIL);
    });

    it("devolve false para agendamento inexistente sem lançar", async () => {
      const seeded = build({ schedules: [makeSchedule()] });

      await expect(
        seeded.cancelRestSchedule("00000000-0000-4000-8000-000000000000", EMAIL),
      ).resolves.toBe(false);
    });

    it("devolve false para estado terminal (enviado, cancelado, erro) sem alterar a linha", async () => {
      for (const terminal of ["enviado", "cancelado", "erro"] as const) {
        const seeded = build({
          schedules: [
            makeSchedule({
              status: terminal,
              sentAt: terminal === "enviado" ? ENVIADO_EM : null,
            }),
          ],
        });

        await expect(
          seeded.cancelRestSchedule(SCHEDULE_ID, EMAIL),
        ).resolves.toBe(false);

        const found = await seeded.findRestScheduleById(SCHEDULE_ID);
        expect(found?.status).toBe(terminal);
        expect(found?.sentAt).toBe(terminal === "enviado" ? ENVIADO_EM : null);
      }
    });
  });

  // -------------------------------------------------------------------------
  // cancelAllRestSchedulesByOwner — Emenda 2026-10-23 (Alavanca 3 / DA18,
  // TASK-016): cancel-all por dono no INSERT. Muda para cancelado TODOS os
  // agendamentos do próprio dono existentes no momento da chamada e só
  // esses (sem filtro por id); terminais do mesmo dono e agendamentos de
  // outro dono ficam intactos; devolve void (plan §Emenda + tasks.json).
  // Invariante resultante: no máximo 1 agendado por created_by.
  // -------------------------------------------------------------------------
  describe("cancelAllRestSchedulesByOwner", () => {
    it("devolve void e cancela TODOS os agendamentos do proprio dono no estado agendado", async () => {
      const seeded = build({
        schedules: [
          makeSchedule(),
          makeSchedule({ id: SEGUNDO_AGENDADO_ID }),
        ],
      });

      await expect(
        seeded.cancelAllRestSchedulesByOwner(EMAIL),
      ).resolves.toBeUndefined();

      await expect(seeded.findRestScheduleById(SCHEDULE_ID)).resolves.toMatchObject(
        { status: "cancelado", created_by: EMAIL },
      );
      await expect(
        seeded.findRestScheduleById(SEGUNDO_AGENDADO_ID),
      ).resolves.toMatchObject({ status: "cancelado", created_by: EMAIL });
    });

    it("preserva terminais do mesmo dono e agendamento agendado de outro dono (seed multi-dono, quatro status)", async () => {
      const seeded = build({
        schedules: [
          // Dono EMAIL: um agendado (cancela) + os três terminais (ficam).
          makeSchedule(),
          makeSchedule({
            id: TERMINAL_ENVIADO_ID,
            status: "enviado",
            sentAt: ENVIADO_EM,
          }),
          makeSchedule({ id: TERMINAL_CANCELADO_ID, status: "cancelado" }),
          makeSchedule({ id: TERMINAL_ERRO_ID, status: "erro" }),
          // OUTRO_EMAIL agendado: linha alheia (fica agendado).
          makeSchedule({ id: OUTRO_SCHEDULE_ID, created_by: OUTRO_EMAIL }),
        ],
      });

      await expect(
        seeded.cancelAllRestSchedulesByOwner(EMAIL),
      ).resolves.toBeUndefined();

      await expect(seeded.findRestScheduleById(SCHEDULE_ID)).resolves.toMatchObject(
        { status: "cancelado" },
      );
      await expect(
        seeded.findRestScheduleById(TERMINAL_ENVIADO_ID),
      ).resolves.toMatchObject({ status: "enviado", sentAt: ENVIADO_EM });
      await expect(
        seeded.findRestScheduleById(TERMINAL_CANCELADO_ID),
      ).resolves.toMatchObject({ status: "cancelado" });
      await expect(seeded.findRestScheduleById(TERMINAL_ERRO_ID)).resolves.toMatchObject(
        { status: "erro" },
      );
      await expect(
        seeded.findRestScheduleById(OUTRO_SCHEDULE_ID),
      ).resolves.toMatchObject({ status: "agendado", created_by: OUTRO_EMAIL });
    });

    it("dono sem nenhum agendado nao tem efeito colateral (nem nos terminais, nem nos alheios)", async () => {
      const seeded = build({
        schedules: [
          makeSchedule({ status: "enviado", sentAt: ENVIADO_EM }),
          makeSchedule({ id: OUTRO_SCHEDULE_ID, created_by: OUTRO_EMAIL }),
        ],
      });

      await expect(
        seeded.cancelAllRestSchedulesByOwner(EMAIL),
      ).resolves.toBeUndefined();

      await expect(seeded.findRestScheduleById(SCHEDULE_ID)).resolves.toMatchObject(
        { status: "enviado", sentAt: ENVIADO_EM },
      );
      await expect(
        seeded.findRestScheduleById(OUTRO_SCHEDULE_ID),
      ).resolves.toMatchObject({ status: "agendado", created_by: OUTRO_EMAIL });
    });

    it("um createRestSchedule feito DEPOIS da chamada permanece agendado (o cancel-all so afeta o que ja existia)", async () => {
      const seeded = build({ schedules: [makeSchedule()] });

      await seeded.cancelAllRestSchedulesByOwner(EMAIL);

      const novo = await seeded.createRestSchedule(
        makeCreateInput({ id: NOVO_SCHEDULE_ID }),
        EMAIL,
      );
      expect(novo.status).toBe("agendado");
      await expect(
        seeded.findRestScheduleById(NOVO_SCHEDULE_ID),
      ).resolves.toMatchObject({ status: "agendado", created_by: EMAIL });

      // A linha anterior segue cancelada — a ordem cancel-all → INSERT da
      // rota (TASK-020) garante que o recém-criado sobrevive.
      await expect(seeded.findRestScheduleById(SCHEDULE_ID)).resolves.toMatchObject(
        { status: "cancelado" },
      );
    });
  });

  // -------------------------------------------------------------------------
  // markRestScheduleSent / markRestScheduleFailed — desfechos do envio
  // (plan §3: enviado + sent_at preenchido; erro só com status).
  // -------------------------------------------------------------------------
  describe("markRestScheduleSent", () => {
    it("define enviado e preenche sent_at", async () => {
      const seeded = build({ schedules: [makeSchedule()] });

      await expect(
        seeded.markRestScheduleSent(SCHEDULE_ID),
      ).resolves.toBeUndefined();

      const found = await seeded.findRestScheduleById(SCHEDULE_ID);
      expect(found?.status).toBe("enviado");
      expect(found?.sentAt).toEqual(expect.any(String));
      expect(found?.sentAt).not.toBeNull();
    });
  });

  describe("markRestScheduleFailed", () => {
    it("define erro sem preencher sent_at", async () => {
      const seeded = build({ schedules: [makeSchedule()] });

      await expect(
        seeded.markRestScheduleFailed(SCHEDULE_ID),
      ).resolves.toBeUndefined();

      const found = await seeded.findRestScheduleById(SCHEDULE_ID);
      expect(found?.status).toBe("erro");
      expect(found?.sentAt).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // deleteSubscriptionByEndpoint — remove assinatura morta (endpoint devolveu
  // 404/410). Cascata dos agendamentos espelha a FK ON DELETE CASCADE da
  // migração 0017 (mesmo regime da cascata das realizadas no fake de
  // execuções).
  // -------------------------------------------------------------------------
  describe("deleteSubscriptionByEndpoint", () => {
    it("remove a assinatura morta: agendamentos dela caem em cascata e re-upsert do endpoint nasce linha nova", async () => {
      const seeded = build({
        subscriptions: [makeSubscription()],
        schedules: [makeSchedule()],
      });

      await expect(
        seeded.deleteSubscriptionByEndpoint(ENDPOINT),
      ).resolves.toBeUndefined();

      await expect(seeded.findRestScheduleById(SCHEDULE_ID)).resolves.toBeNull();

      // A linha foi removida de fato: o upsert do mesmo endpoint insere uma
      // assinatura nova (id diferente), não atualiza a morta.
      const nova = await seeded.upsertSubscription(makeUpsertInput(), EMAIL);
      expect(nova.id).not.toBe(SUBSCRIPTION_ID);
      expect(nova.endpoint).toBe(ENDPOINT);
    });

    it("não afeta a assinatura de outro endpoint nem os agendamentos dela", async () => {
      const seeded = build({
        subscriptions: [
          makeSubscription(),
          makeSubscription({
            id: OUTRO_SUBSCRIPTION_ID,
            endpoint: OUTRO_ENDPOINT,
          }),
        ],
        schedules: [
          makeSchedule(),
          makeSchedule({
            id: OUTRO_SCHEDULE_ID,
            subscriptionId: OUTRO_SUBSCRIPTION_ID,
          }),
        ],
      });

      await seeded.deleteSubscriptionByEndpoint(ENDPOINT);

      const agendamentoDeFora = await seeded.findRestScheduleById(
        OUTRO_SCHEDULE_ID,
      );
      expect(agendamentoDeFora).toMatchObject({
        id: OUTRO_SCHEDULE_ID,
        subscriptionId: OUTRO_SUBSCRIPTION_ID,
      });

      const viva = await seeded.upsertSubscription(
        makeUpsertInput({ endpoint: OUTRO_ENDPOINT }),
        EMAIL,
      );
      expect(viva.id).toBe(OUTRO_SUBSCRIPTION_ID);
    });

    it("remover endpoint inexistente não lança (idempotente)", async () => {
      const seeded = build({ subscriptions: [makeSubscription()] });

      await expect(
        seeded.deleteSubscriptionByEndpoint(
          "https://fcm.googleapis.com/fcm/send/morto",
        ),
      ).resolves.toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// IPushRepository na fonte única dos contratos (plan §2: "interfaces.ts —
// contrato IPushRepository. Testado pelo contract fakes-only"). Leitura por
// texto para manter o tsc do RED limpo (só Cannot find module nos módulos
// novos) — precedente de types.test.ts; em GREEN a leitura garante que a
// interface foi criada com as nove operações (7 originais do plan §3 + a 8ª
// findSubscriptionByEndpoint do B2 + a 9ª cancelAllRestSchedulesByOwner da
// emenda 2026-10-23 / DA18).
// ---------------------------------------------------------------------------
describe("IPushRepository na fonte única (lib/milon/repositories/interfaces.ts)", () => {
  function fonteInterfaces(): string {
    return fs.readFileSync(
      path.resolve(__dirname, "../../../../lib/milon/repositories/interfaces.ts"),
      "utf8",
    );
  }

  function blocoIpPushRepository(): string {
    const match = /export interface IPushRepository\s*(?:<[^>]*>)?\s*\{([\s\S]*?)\}/.exec(
      fonteInterfaces(),
    );
    return match?.[1] ?? "";
  }

  it("declara a interface IPushRepository exportada", () => {
    expect(fonteInterfaces()).toMatch(/export interface IPushRepository\b/);
  });

  it("expõe as nove operações do contrato de push (7 originais + findSubscriptionByEndpoint + cancelAllRestSchedulesByOwner)", () => {
    const bloco = blocoIpPushRepository();
    const operacoes = [
      "upsertSubscription",
      "findSubscriptionByEndpoint",
      "createRestSchedule",
      "findRestScheduleById",
      "cancelRestSchedule",
      "cancelAllRestSchedulesByOwner",
      "markRestScheduleSent",
      "markRestScheduleFailed",
      "deleteSubscriptionByEndpoint",
    ];
    expect(operacoes).toHaveLength(9);
    for (const operacao of operacoes) {
      expect(bloco).toContain(operacao);
    }
  });
});
