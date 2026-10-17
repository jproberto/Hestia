// Fake em memória de IPushRepository p/ contracts (fakes-only, decisão 57).
// Espelha as regras do repository real: upsert por conflito no endpoint
// (reinscrição atualiza chaves e autoria sem trocar o id), agendamento com o
// id vindo do cliente e status inicial agendado, cancelamento somente do
// próprio dono ainda agendado (alheio/inexistente/terminal devolve false e
// nunca erro) e cascata da exclusão da assinatura sobre os agendamentos
// (FK ON DELETE CASCADE da migração 0017).
import type { IPushRepository } from "../interfaces";
import type {
  CreateRestPushScheduleInput,
  DevicePushSubscription,
  RestPushSchedule,
  UpsertPushSubscriptionInput,
} from "../../types";

export interface PushSeed {
  subscriptions?: DevicePushSubscription[];
  schedules?: RestPushSchedule[];
}

export class FakePushRepository implements IPushRepository {
  private subscriptions = new Map<string, DevicePushSubscription>();
  private schedules = new Map<string, RestPushSchedule>();
  private seq = 0;

  constructor(seed: PushSeed = {}) {
    this.seed(seed);
  }

  seed(seed: PushSeed = {}): void {
    this.subscriptions.clear();
    this.schedules.clear();
    for (const subscription of seed.subscriptions ?? []) {
      this.subscriptions.set(subscription.id, { ...subscription });
    }
    for (const schedule of seed.schedules ?? []) {
      this.schedules.set(schedule.id, { ...schedule });
    }
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-fake-${this.seq}`;
  }

  async upsertSubscription(
    input: UpsertPushSubscriptionInput,
    email: string,
  ): Promise<DevicePushSubscription> {
    const existente = [...this.subscriptions.values()].find(
      (subscription) => subscription.endpoint === input.endpoint,
    );
    if (existente) {
      const atualizada: DevicePushSubscription = {
        ...existente,
        p256dh: input.p256dh,
        auth: input.auth,
        created_by: email,
      };
      this.subscriptions.set(atualizada.id, atualizada);
      return { ...atualizada };
    }

    const nova: DevicePushSubscription = {
      id: this.nextId("push-sub"),
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      createdAt: new Date().toISOString(),
      created_by: email,
    };
    this.subscriptions.set(nova.id, nova);
    return { ...nova };
  }

  async createRestSchedule(
    input: CreateRestPushScheduleInput,
    email: string,
  ): Promise<RestPushSchedule> {
    const schedule: RestPushSchedule = {
      id: input.id,
      subscriptionId: input.subscriptionId,
      durationSeconds: input.durationSeconds,
      fireAt: input.fireAt,
      status: "agendado",
      sentAt: null,
      createdAt: new Date().toISOString(),
      created_by: email,
    };
    this.schedules.set(schedule.id, schedule);
    return { ...schedule };
  }

  async findRestScheduleById(
    scheduleId: string,
  ): Promise<RestPushSchedule | null> {
    const schedule = this.schedules.get(scheduleId);
    return schedule ? { ...schedule } : null;
  }

  async cancelRestSchedule(
    scheduleId: string,
    email: string,
  ): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (
      !schedule ||
      schedule.created_by !== email ||
      schedule.status !== "agendado"
    ) {
      return false;
    }
    const cancelado: RestPushSchedule = { ...schedule, status: "cancelado" };
    this.schedules.set(scheduleId, cancelado);
    return true;
  }

  async markRestScheduleSent(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return;
    this.schedules.set(scheduleId, {
      ...schedule,
      status: "enviado",
      sentAt: new Date().toISOString(),
    });
  }

  async markRestScheduleFailed(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return;
    this.schedules.set(scheduleId, { ...schedule, status: "erro" });
  }

  async deleteSubscriptionByEndpoint(endpoint: string): Promise<void> {
    const alvo = [...this.subscriptions.values()].find(
      (subscription) => subscription.endpoint === endpoint,
    );
    if (!alvo) return;
    this.subscriptions.delete(alvo.id);
    for (const [id, schedule] of this.schedules) {
      if (schedule.subscriptionId === alvo.id) this.schedules.delete(id);
    }
  }
}

export function createFakePushRepository(
  seed: PushSeed = {},
): FakePushRepository {
  return new FakePushRepository(seed);
}
