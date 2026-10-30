// Acesso a dados de push do fim de descanso via IDatabaseClient (nunca do
// pacote Supabase diretamente — o adapter vive só em lib/shared).
// Regras de persistência vivem aqui (upsert por conflito no endpoint único da
// 0017, agendamento com id gerado no cliente e status inicial agendado,
// cancelamento filtrando dono + status — Mílon #06).
// UI/rota consomem via lib/milon/db/push.
import type { IDatabaseClient } from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type {
  CreateRestPushScheduleInput,
  DevicePushSubscription,
  PushSubscriptionRow,
  RestPushSchedule,
  RestPushScheduleRow,
  RestPushScheduleStatus,
  UpsertPushSubscriptionInput,
} from "../types";

function toSubscriptionDomain(row: PushSubscriptionRow): DevicePushSubscription {
  return {
    id: row.id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    createdAt: row.created_at,
    created_by: row.created_by,
  };
}

function toScheduleDomain(row: RestPushScheduleRow): RestPushSchedule {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    durationSeconds: row.duration_seconds,
    fireAt: row.fire_at,
    // A coluna é texto com CHECK dos quatro valores (migração 0017).
    status: row.status as RestPushScheduleStatus,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    created_by: row.created_by,
  };
}

// Upsert por conflito no endpoint: reinscrição do mesmo dispositivo atualiza
// chaves e autoria ao dono da sessão corrente, sem trocar o id.
export async function upsertSubscription(
  db: IDatabaseClient,
  input: UpsertPushSubscriptionInput,
  email: string,
): Promise<DevicePushSubscription> {
  const { data, error } = await db
    .from<PushSubscriptionRow>("push_subscriptions")
    .upsert(
      {
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        created_by: email,
      },
      { onConflict: "endpoint" },
    )
    .select()
    .single();

  if (error) throw error;
  if (!data)
    throw new Error("Falha ao salvar assinatura de push: sem retorno do banco.");
  return toSubscriptionDomain(data);
}

// Leitura da assinatura já gravada por endpoint (checagem de propriedade
// antes do upsert — blocker B2 / DA2: uma sessão não pode reatribuir
// created_by de linha alheia nem receber o push do descanso do outro dono).
export async function findSubscriptionByEndpoint(
  db: IDatabaseClient,
  endpoint: string,
): Promise<DevicePushSubscription | null> {
  const { data, error } = await db
    .from<PushSubscriptionRow>("push_subscriptions")
    .select("*")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (error) throw error;
  return data ? toSubscriptionDomain(data) : null;
}

// INSERT com o id gerado no cliente (DA3: cancelável durante a espera da
// rota) e status inicial agendado.
export async function createRestSchedule(
  db: IDatabaseClient,
  input: CreateRestPushScheduleInput,
  email: string,
): Promise<RestPushSchedule> {
  const { data, error } = await db
    .from<RestPushScheduleRow>("rest_push_schedules")
    .insert({
      id: input.id,
      subscription_id: input.subscriptionId,
      duration_seconds: input.durationSeconds,
      fire_at: input.fireAt,
      status: "agendado",
      created_by: email,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data)
    throw new Error(
      "Falha ao criar agendamento de push: sem retorno do banco.",
    );
  return toScheduleDomain(data);
}

export async function findRestScheduleById(
  db: IDatabaseClient,
  scheduleId: string,
): Promise<RestPushSchedule | null> {
  const { data, error } = await db
    .from<RestPushScheduleRow>("rest_push_schedules")
    .select("*")
    .eq("id", scheduleId)
    .maybeSingle();

  if (error) throw error;
  return data ? toScheduleDomain(data) : null;
}

// Cancelamento só do próprio dono e só enquanto agendado: linha alheia,
// inexistente ou já terminal devolve false e nunca erro (guarda de dono na
// aplicação, precedente das execuções).
export async function cancelRestSchedule(
  db: IDatabaseClient,
  scheduleId: string,
  email: string,
): Promise<boolean> {
  const { data, error } = await db
    .from<RestPushScheduleRow>("rest_push_schedules")
    .update({ status: "cancelado" })
    .eq("id", scheduleId)
    .eq("created_by", email)
    .eq("status", "agendado")
    .select();

  if (error) throw error;
  return (data ?? []).length > 0;
}

// Cancel-all por dono (Emenda 2026-10-23, Alavanca 3/DA18): cancela TODOS os
// agendamentos do próprio dono ainda `agendado` no momento da chamada — nunca
// por id, nunca sem dono; terminais (enviado/cancelado/erro) e agendamentos de
// outro dono ficam intactos. Chamado antes de createRestSchedule em todo
// schedule (invariante: no máximo 1 agendado por created_by).
export async function cancelAllRestSchedulesByOwner(
  db: IDatabaseClient,
  email: string,
): Promise<void> {
  const { error } = await db
    .from<RestPushScheduleRow>("rest_push_schedules")
    .update({ status: "cancelado" })
    .eq("created_by", email)
    .eq("status", "agendado");

  if (error) throw error;
}

export async function markRestScheduleSent(
  db: IDatabaseClient,
  scheduleId: string,
): Promise<void> {
  const { error } = await db
    .from<RestPushScheduleRow>("rest_push_schedules")
    .update({ status: "enviado", sent_at: new Date().toISOString() })
    .eq("id", scheduleId);

  if (error) throw error;
}

export async function markRestScheduleFailed(
  db: IDatabaseClient,
  scheduleId: string,
): Promise<void> {
  const { error } = await db
    .from<RestPushScheduleRow>("rest_push_schedules")
    .update({ status: "erro" })
    .eq("id", scheduleId);

  if (error) throw error;
}

// Assinatura morta (o endpoint devolveu 404/410); os agendamentos dela caem
// em cascata pela FK ON DELETE CASCADE da migração 0017.
export async function deleteSubscriptionByEndpoint(
  db: IDatabaseClient,
  endpoint: string,
): Promise<void> {
  const { error } = await db
    .from<PushSubscriptionRow>("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) throw error;
}

// Standalones p/ consumers de browser (criam o próprio client, singleton por aba).
export async function upsertSubscriptionStandalone(
  input: UpsertPushSubscriptionInput,
  email: string,
): Promise<DevicePushSubscription> {
  return upsertSubscription(createBrowserDatabaseClient(), input, email);
}

export async function createRestScheduleStandalone(
  input: CreateRestPushScheduleInput,
  email: string,
): Promise<RestPushSchedule> {
  return createRestSchedule(createBrowserDatabaseClient(), input, email);
}

export async function findRestScheduleByIdStandalone(
  scheduleId: string,
): Promise<RestPushSchedule | null> {
  return findRestScheduleById(createBrowserDatabaseClient(), scheduleId);
}

export async function cancelRestScheduleStandalone(
  scheduleId: string,
  email: string,
): Promise<boolean> {
  return cancelRestSchedule(createBrowserDatabaseClient(), scheduleId, email);
}

export async function markRestScheduleSentStandalone(
  scheduleId: string,
): Promise<void> {
  return markRestScheduleSent(createBrowserDatabaseClient(), scheduleId);
}

export async function markRestScheduleFailedStandalone(
  scheduleId: string,
): Promise<void> {
  return markRestScheduleFailed(createBrowserDatabaseClient(), scheduleId);
}

export async function deleteSubscriptionByEndpointStandalone(
  endpoint: string,
): Promise<void> {
  return deleteSubscriptionByEndpoint(createBrowserDatabaseClient(), endpoint);
}
