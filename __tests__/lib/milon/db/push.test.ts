import { describe, it, expect } from "vitest";
import type { IDatabaseClient } from "@/lib/shared/database";
import * as dbBarrel from "@/lib/milon/db/push";
import * as pushRepository from "@/lib/milon/repositories/push";
import {
  upsertSubscription,
  createRestSchedule,
  findRestScheduleById,
  cancelRestSchedule,
  markRestScheduleSent,
  markRestScheduleFailed,
  deleteSubscriptionByEndpoint,
  upsertSubscriptionStandalone,
  createRestScheduleStandalone,
  findRestScheduleByIdStandalone,
  cancelRestScheduleStandalone,
  markRestScheduleSentStandalone,
  markRestScheduleFailedStandalone,
  deleteSubscriptionByEndpointStandalone,
} from "@/lib/milon/db/push";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-003 (Mílon #06 — Timer de descanso auto + PWA push) —
// consumido pela TASK-004.
// Fonte: plan.md §3 (funções do repository de push sobre IDatabaseClient +
// standalones no padrão do módulo) + tasks.json TASK-003 (cadeias de query
// exigidas) + migração 0017 (nomes de tabelas e colunas).
//
// Os módulos lib/milon/repositories/push.ts e lib/milon/db/push.ts ainda NÃO
// existem: este arquivo falha na coleta até Hefesto entregá-los (Expected:
// FAIL por módulo inexistente — precedente de db/executions.test.ts na RED).
//
// Cadeias esperadas (só métodos de IDatabaseClient — lib/shared/database.ts):
//   - upsertSubscription: from("push_subscriptions").upsert({ endpoint,
//     p256dh, auth, created_by }, { onConflict: "endpoint" }).select()
//     .single() — endpoint UNIQUE da 0017; reinscrição atualiza chaves/autoria;
//   - createRestSchedule: from("rest_push_schedules").insert({ id (uuid do
//     cliente), subscription_id, duration_seconds, fire_at, status:
//     "agendado", created_by }).select().single();
//   - findRestScheduleById: from("rest_push_schedules").select("*").eq("id")
//     .maybeSingle() — linha em domínio ou null;
//   - cancelRestSchedule: update({ status: "cancelado" }) filtrando eq("id"),
//     eq("created_by") e eq("status", "agendado") com select de retorno —
//     devolve true somente quando uma linha foi efetivamente cancelada;
//   - markRestScheduleSent: update({ status: "enviado", sent_at }) eq("id");
//   - markRestScheduleFailed: update({ status: "erro" }) eq("id") — sem
//     sent_at (nunca enviado);
//   - deleteSubscriptionByEndpoint: delete() de push_subscriptions filtrando
//     eq("endpoint").
// O barrel lib/milon/db/push.ts re-exporta tudo (export *, caminho oficial da
// rota/UI) e espelha os standalones <fn>Standalone (próprio client singleton
// por aba) — mesmo regime de db/executions.test.ts.
// ---------------------------------------------------------------------------

const EMAIL = "barrel-push@hestia.lan";
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/dispositivo-1";
const SUBSCRIPTION_ID = "3f1c8f9e-1a2b-4c5d-8e6f-0a1b2c3d4e5f";
const SCHEDULE_ID = "7c2d9b4e-5f60-4a71-9c82-1d2e3f4a5b6c";
const FIRE_AT = "2026-10-16T10:01:30.000Z";
const CRIADO_EM = "2026-10-16T10:00:00.000Z";
const P256DH = "p256dh-chave-do-dispositivo";
const AUTH = "auth-segredo-do-dispositivo";

// --- Espelhos do plan §3 + colunas da migração 0017 (RED limpo: o tsc só
// precisa apontar Cannot find module nos módulos novos — precedente de
// types.test.ts; em GREEN as chamadas dos nomes importados já ficam tipadas
// contra o repository real). ---

interface PushSubscriptionRowMirror {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  created_by: string;
}

interface DevicePushSubscriptionMirror {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
  created_by: string;
}

interface RestPushScheduleRowMirror {
  id: string;
  subscription_id: string;
  duration_seconds: number;
  fire_at: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  created_by: string;
}

interface RestPushScheduleMirror {
  id: string;
  subscriptionId: string;
  durationSeconds: number;
  fireAt: string;
  status: "agendado" | "enviado" | "cancelado" | "erro";
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

const SUB_ROW: PushSubscriptionRowMirror = {
  id: SUBSCRIPTION_ID,
  endpoint: ENDPOINT,
  p256dh: P256DH,
  auth: AUTH,
  created_at: CRIADO_EM,
  created_by: EMAIL,
};

const SCHED_ROW: RestPushScheduleRowMirror = {
  id: SCHEDULE_ID,
  subscription_id: SUBSCRIPTION_ID,
  duration_seconds: 90,
  fire_at: FIRE_AT,
  status: "agendado",
  sent_at: null,
  created_at: CRIADO_EM,
  created_by: EMAIL,
};

const UPSERT_INPUT: UpsertPushSubscriptionInputMirror = {
  endpoint: ENDPOINT,
  p256dh: P256DH,
  auth: AUTH,
};

const CREATE_INPUT: CreateRestPushScheduleInputMirror = {
  id: SCHEDULE_ID,
  subscriptionId: SUBSCRIPTION_ID,
  durationSeconds: 90,
  fireAt: FIRE_AT,
};

// Domínios esperados (camelCase) após o mapeamento das linhas acima.
const SUB_ESPERADA: DevicePushSubscriptionMirror = {
  id: SUBSCRIPTION_ID,
  endpoint: ENDPOINT,
  p256dh: P256DH,
  auth: AUTH,
  createdAt: CRIADO_EM,
  created_by: EMAIL,
};

const SCHED_ESPERADO: RestPushScheduleMirror = {
  id: SCHEDULE_ID,
  subscriptionId: SUBSCRIPTION_ID,
  durationSeconds: 90,
  fireAt: FIRE_AT,
  status: "agendado",
  sentAt: null,
  createdAt: CRIADO_EM,
  created_by: EMAIL,
};

interface Recorded {
  table?: string;
  upsertPayload?: Record<string, unknown>;
  upsertOptions?: { onConflict?: string };
  insertPayload?: Record<string, unknown>;
  updatePayload?: Record<string, unknown>;
  eqs?: [string, unknown][];
  selects?: number;
}

// Upsert da assinatura: upsert(payload, onConflict endpoint) + select single.
function stubUpsertDb(
  row: PushSubscriptionRowMirror,
  recorded: Recorded,
): IDatabaseClient {
  const singleResult = { data: row, error: null };
  return {
    from: (table: string) => {
      recorded.table = table;
      return {
        upsert: (
          payload: Record<string, unknown>,
          options?: { onConflict?: string },
        ) => {
          recorded.upsertPayload = payload;
          recorded.upsertOptions = options;
          return {
            select: () => {
              recorded.selects = (recorded.selects ?? 0) + 1;
              return {
                single: () => Promise.resolve(singleResult),
                maybeSingle: () => Promise.resolve(singleResult),
                then: (
                  onfulfilled: (value: unknown) => unknown,
                  onrejected?: (reason: unknown) => unknown,
                ) =>
                  Promise.resolve({ data: [row], error: null }).then(
                    onfulfilled,
                    onrejected,
                  ),
              };
            },
          };
        },
      };
    },
  } as unknown as IDatabaseClient;
}

// INSERT do agendamento: insert(payload) + select single.
function stubInsertDb(
  row: RestPushScheduleRowMirror,
  recorded: Recorded,
): IDatabaseClient {
  const singleResult = { data: row, error: null };
  return {
    from: (table: string) => {
      recorded.table = table;
      return {
        insert: (payload: Record<string, unknown>) => {
          recorded.insertPayload = payload;
          return {
            select: () => {
              recorded.selects = (recorded.selects ?? 0) + 1;
              return {
                single: () => Promise.resolve(singleResult),
                maybeSingle: () => Promise.resolve(singleResult),
                then: (
                  onfulfilled: (value: unknown) => unknown,
                  onrejected?: (reason: unknown) => unknown,
                ) =>
                  Promise.resolve({ data: [row], error: null }).then(
                    onfulfilled,
                    onrejected,
                  ),
              };
            },
          };
        },
      };
    },
  } as unknown as IDatabaseClient;
}

// Leitura por id: select + eq("id") + maybeSingle (ou thenable de lista).
function stubFindDb(
  row: RestPushScheduleRowMirror | null,
  recorded: Recorded,
): IDatabaseClient {
  const chain = {
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return chain;
    },
    maybeSingle: () => Promise.resolve({ data: row, error: null }),
    single: () => Promise.resolve({ data: row, error: null }),
    then: (
      onfulfilled: (value: unknown) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) =>
      Promise.resolve({ data: row ? [row] : [], error: null }).then(
        onfulfilled,
        onrejected,
      ),
  };
  return {
    from: (table: string) => {
      recorded.table = table;
      return {
        select: () => {
          recorded.selects = (recorded.selects ?? 0) + 1;
          return chain;
        },
      };
    },
  } as unknown as IDatabaseClient;
}

// UPDATE (envio/cancelamento): update(payload) + filtros eq + select de
// retorno. Sem select() não há retorno de representação — o dado do cancel
// só existe com select (mesmo comportamento do cliente real).
function stubUpdateDb(
  rows: RestPushScheduleRowMirror[],
  recorded: Recorded,
): IDatabaseClient {
  const retorno = () =>
    recorded.selects ? { data: rows, error: null } : { data: null, error: null };
  const chain = {
    update: (payload: Record<string, unknown>): unknown => {
      recorded.updatePayload = payload;
      return chain;
    },
    select: (): unknown => {
      recorded.selects = (recorded.selects ?? 0) + 1;
      return chain;
    },
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return chain;
    },
    maybeSingle: () =>
      Promise.resolve({
        data: recorded.selects ? (rows[0] ?? null) : null,
        error: null,
      }),
    single: () =>
      Promise.resolve({
        data: recorded.selects ? (rows[0] ?? null) : null,
        error: null,
      }),
    then: (
      onfulfilled: (value: unknown) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(retorno()).then(onfulfilled, onrejected),
  };
  return {
    from: (table: string) => {
      recorded.table = table;
      return chain;
    },
  } as unknown as IDatabaseClient;
}

// DELETE da assinatura morta: delete() + eq("endpoint").
function stubDeleteDb(recorded: Recorded): IDatabaseClient {
  const OK = { data: null, error: null };
  const chain = {
    delete: (): unknown => chain,
    eq: (col: string, val: unknown): unknown => {
      (recorded.eqs ??= []).push([col, val]);
      return chain;
    },
    then: (
      onfulfilled: (value: unknown) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(OK).then(onfulfilled, onrejected),
  };
  return {
    from: (table: string) => {
      recorded.table = table;
      return chain;
    },
  } as unknown as IDatabaseClient;
}

describe("lib/milon/db/push (barrel oficial da rota/UI, TASK-003)", () => {
  it("re-exporta o repository (mesmas referências, sem lógica própria)", () => {
    expect(dbBarrel.upsertSubscription).toBe(pushRepository.upsertSubscription);
    expect(dbBarrel.createRestSchedule).toBe(pushRepository.createRestSchedule);
    expect(dbBarrel.findRestScheduleById).toBe(
      pushRepository.findRestScheduleById,
    );
    expect(dbBarrel.cancelRestSchedule).toBe(pushRepository.cancelRestSchedule);
    expect(dbBarrel.markRestScheduleSent).toBe(
      pushRepository.markRestScheduleSent,
    );
    expect(dbBarrel.markRestScheduleFailed).toBe(
      pushRepository.markRestScheduleFailed,
    );
    expect(dbBarrel.deleteSubscriptionByEndpoint).toBe(
      pushRepository.deleteSubscriptionByEndpoint,
    );
  });

  it("expõe os standalones espelhados como funções do barrel", () => {
    expect(typeof upsertSubscriptionStandalone).toBe("function");
    expect(typeof createRestScheduleStandalone).toBe("function");
    expect(typeof findRestScheduleByIdStandalone).toBe("function");
    expect(typeof cancelRestScheduleStandalone).toBe("function");
    expect(typeof markRestScheduleSentStandalone).toBe("function");
    expect(typeof markRestScheduleFailedStandalone).toBe("function");
    expect(typeof deleteSubscriptionByEndpointStandalone).toBe("function");

    expect(dbBarrel.upsertSubscriptionStandalone).toBe(
      pushRepository.upsertSubscriptionStandalone,
    );
    expect(dbBarrel.createRestScheduleStandalone).toBe(
      pushRepository.createRestScheduleStandalone,
    );
    expect(dbBarrel.findRestScheduleByIdStandalone).toBe(
      pushRepository.findRestScheduleByIdStandalone,
    );
    expect(dbBarrel.cancelRestScheduleStandalone).toBe(
      pushRepository.cancelRestScheduleStandalone,
    );
    expect(dbBarrel.markRestScheduleSentStandalone).toBe(
      pushRepository.markRestScheduleSentStandalone,
    );
    expect(dbBarrel.markRestScheduleFailedStandalone).toBe(
      pushRepository.markRestScheduleFailedStandalone,
    );
    expect(dbBarrel.deleteSubscriptionByEndpointStandalone).toBe(
      pushRepository.deleteSubscriptionByEndpointStandalone,
    );
  });

  it("upsert da assinatura em push_subscriptions com conflito no endpoint e autoria da sessão", async () => {
    const recorded: Recorded = {};
    const sub = await upsertSubscription(
      stubUpsertDb(SUB_ROW, recorded),
      UPSERT_INPUT,
      EMAIL,
    );

    expect(recorded.table).toBe("push_subscriptions");
    expect(recorded.upsertPayload).toEqual({
      endpoint: ENDPOINT,
      p256dh: P256DH,
      auth: AUTH,
      created_by: EMAIL,
    });
    expect(recorded.upsertOptions).toEqual({ onConflict: "endpoint" });
    expect(recorded.selects).toBeGreaterThan(0);
    expect(sub).toEqual(SUB_ESPERADA);
  });

  it("cria o agendamento em rest_push_schedules com o id do cliente e status agendado", async () => {
    const recorded: Recorded = {};
    const schedule = await createRestSchedule(
      stubInsertDb(SCHED_ROW, recorded),
      CREATE_INPUT,
      EMAIL,
    );

    expect(recorded.table).toBe("rest_push_schedules");
    expect(recorded.insertPayload).toEqual({
      id: SCHEDULE_ID,
      subscription_id: SUBSCRIPTION_ID,
      duration_seconds: 90,
      fire_at: FIRE_AT,
      status: "agendado",
      created_by: EMAIL,
    });
    expect(recorded.selects).toBeGreaterThan(0);
    expect(schedule).toEqual(SCHED_ESPERADO);
  });

  it("localiza o agendamento por id mapeando para o domínio", async () => {
    const recorded: Recorded = {};
    const found = await findRestScheduleById(
      stubFindDb(SCHED_ROW, recorded),
      SCHEDULE_ID,
    );

    expect(recorded.table).toBe("rest_push_schedules");
    expect(recorded.eqs).toEqual([["id", SCHEDULE_ID]]);
    expect(found).toEqual(SCHED_ESPERADO);
  });

  it("localizar agendamento inexistente devolve null", async () => {
    const recorded: Recorded = {};
    await expect(
      findRestScheduleById(stubFindDb(null, recorded), SCHEDULE_ID),
    ).resolves.toBeNull();
    expect(recorded.table).toBe("rest_push_schedules");
    expect(recorded.eqs).toEqual([["id", SCHEDULE_ID]]);
  });

  it("cancela filtrando id + created_by + status agendado e devolve true quando há efeito", async () => {
    const recorded: Recorded = {};
    const cancelado = await cancelRestSchedule(
      stubUpdateDb([SCHED_ROW], recorded),
      SCHEDULE_ID,
      EMAIL,
    );

    expect(recorded.table).toBe("rest_push_schedules");
    expect(recorded.updatePayload).toEqual({ status: "cancelado" });
    expect(recorded.eqs).toHaveLength(3);
    expect(recorded.eqs).toContainEqual(["id", SCHEDULE_ID]);
    expect(recorded.eqs).toContainEqual(["created_by", EMAIL]);
    expect(recorded.eqs).toContainEqual(["status", "agendado"]);
    expect(cancelado).toBe(true);
  });

  it("cancel devolve false quando nenhuma linha casa o filtro (alheio, inexistente ou terminal)", async () => {
    const recorded: Recorded = {};
    const cancelado = await cancelRestSchedule(
      stubUpdateDb([], recorded),
      SCHEDULE_ID,
      EMAIL,
    );

    expect(recorded.updatePayload).toEqual({ status: "cancelado" });
    expect(recorded.eqs).toHaveLength(3);
    expect(cancelado).toBe(false);
  });

  it("marca enviado com sent_at preenchido", async () => {
    const recorded: Recorded = {};
    await expect(
      markRestScheduleSent(stubUpdateDb([SCHED_ROW], recorded), SCHEDULE_ID),
    ).resolves.toBeUndefined();

    expect(recorded.table).toBe("rest_push_schedules");
    expect(recorded.updatePayload).toEqual({
      status: "enviado",
      sent_at: expect.any(String),
    });
    expect(recorded.eqs).toContainEqual(["id", SCHEDULE_ID]);
  });

  it("marca erro sem tocar em sent_at", async () => {
    const recorded: Recorded = {};
    await expect(
      markRestScheduleFailed(stubUpdateDb([SCHED_ROW], recorded), SCHEDULE_ID),
    ).resolves.toBeUndefined();

    expect(recorded.table).toBe("rest_push_schedules");
    expect(recorded.updatePayload).toEqual({ status: "erro" });
    expect(recorded.updatePayload).not.toHaveProperty("sent_at");
    expect(recorded.eqs).toContainEqual(["id", SCHEDULE_ID]);
  });

  it("remove a assinatura morta por endpoint", async () => {
    const recorded: Recorded = {};
    await expect(
      deleteSubscriptionByEndpoint(stubDeleteDb(recorded), ENDPOINT),
    ).resolves.toBeUndefined();

    expect(recorded.table).toBe("push_subscriptions");
    expect(recorded.eqs).toEqual([["endpoint", ENDPOINT]]);
  });
});
