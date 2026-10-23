/**
 * Contrato RED — Mílon #06 Timer de descanso auto + PWA push (TASK-005):
 * `lib/milon/hooks/useRestTimer.ts` (ainda INEXISTENTE).
 *
 * Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/spec.md`
 * (§3 início automático, substituição, encerramentos, falha nunca bloqueia;
 * §5 critérios 1, 3, 4, 5, 10) + `plan.md` §3 (Hook useRestTimer — contrato
 * textual: retorno, start, duração capturada, substituição, cancel,
 * dismiss, unmount) + `tasks.json` TASK-005 (acceptanceCriteria — fonte da
 * cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/hooks/useRestTimer` ainda não existe — Expected: FAIL com
 * falha de coleta "Cannot find module" (acceptanceCriteria 1 da TASK-005).
 * Hefesto fará GREEN (TASK-006) apenas com o contrato descrito no plano —
 * sem inventar APIs.
 *
 * EMENDA 2026-10-23 (fix-01-server, Alavanca 1/DA16 — TASK-018 RED): o
 * contrato do `start` ganha a ancoragem do push no clique — `t0 =
 * Date.now()` como primeira instrução do caminho válido (após o no-op de
 * `restSeconds` nulo/zero, antes de limpar/cancelar o agendamento anterior e
 * antes de `ensureDeviceSubscription()`) e `elapsed = Date.now() − t0`
 * (inteiro ms, ≥ 0) no corpo do POST de `schedule`, medido NO MOMENTO do
 * disparo (a latência da assinatura entra no campo). Fake timers com `Date`
 * faked (default do Vitest 2) + `vi.setSystemTime`/`vi.advanceTimersByTime`
 * tornam a latência observável de forma determinística. Casos da seção 10
 * escritos ANTES da TASK-019: Expected: FAIL — `corpo.elapsed === undefined`
 * onde se espera o número medido (o cancel e o no-op permanecem sem
 * `elapsed`/sem POST — invariantes já verdes, preservadas aqui).
 *
 * Padrão espelhado de `__tests__/lib/milon/hooks/useWorkoutExecution.test.ts`
 * (renderHook + act, fake timers para o setInterval de 1 s) + verificação de
 * ambiente do precedente jsdom: `crypto.randomUUID` é espiado com
 * `mockImplementation` (a chamada real tem brand check de `this`);
 * `navigator.serviceWorker` é definido por `Object.defineProperty`
 * (configurável) e removido no afterEach; `Notification`/`PushManager`/`fetch`
 * via `vi.stubGlobal` + `vi.unstubAllGlobals`.
 *
 * ESTRATÉGIA DE OBSERVAÇÃO (sem mock do módulo cliente): o teste NÃO mocka
 * `@/lib/milon/rest-push-client` — a cadeia real hook → helpers → `fetch`
 * global é exercitada, exatamente como o critério manda ("agenda via fetch
 * com action schedule"). O `fetch` global é o único transporte observado; o
 * navegador é simulado com permissão `granted` e assinatura existente para
 * que `ensureDeviceSubscription()` devolva material de inscrição.
 *
 * Dreno de microtarefas (`for await Promise.resolve()` dentro de `act`):
 * `start` é síncrono (retorna void) e agenda fire-and-forget — a cadeia
 * assíncrona do agendamento precisa de ticks de microtarefa, não de relógio
 * (fake timers não avançam microtarefas).
 *
 * CONTRATO CONSUMIDO (plan.md §3 — hook useRestTimer):
 * - retorno: `{ active, remainingSeconds, originWorkoutId, exerciseName,
 *   finished, start, cancel, dismiss }`;
 * - `start(input { workoutId, entryId, exerciseName, restSeconds })`: no-op
 *   quando `restSeconds` não é maior que zero; caso contrário substitui o
 *   timer anterior (intervalo limpo + `cancelRestPush` fire-and-forget do
 *   scheduleId anterior), gera `scheduleId` com `crypto.randomUUID()`,
 *   agenda via `scheduleRestPush` fire-and-forget (POST na rota com action
 *   `schedule`), grava `originWorkoutId`/`exerciseName`/`remainingSeconds` e
 *   inicia `setInterval` de 1000 ms; a duração é SEMPRE a capturada na
 *   chamada (nada relê `restSeconds`);
 * - EMENDA 2026-10-23 (DA16, TASK-018): o `start` captura `t0 = Date.now()`
 *   no início do caminho válido e o POST de `schedule` carrega
 *   `elapsed = Date.now() − t0` (inteiro ms, ≥ 0) no instante do disparo — a
 *   latência de `ensureDeviceSubscription` (e de qualquer espera anterior ao
 *   fetch) conta no campo; `elapsed` NÃO aparece no `cancel` (exclusivo do
 *   `schedule`);
 * - ao alcançar zero: para o intervalo, `active = false`,
 *   `remainingSeconds = 0`, `finished = true` (origem/exercício preservados
 *   para o alerta);
 * - `cancel`: para o intervalo, cancela no servidor o `scheduleId` corrente
 *   (fire-and-forget) e zera TODO o estado (`finished` incluído);
 * - `dismiss`: somente `finished = false`;
 * - falha de rede ou resposta não-2xx nunca propaga (marcação/camada visual
 *   nunca ficam reféns de push — spec critério 10);
 * - unmount limpa o intervalo (a página não desmonta na troca de treino; a
 *   limpeza é do ciclo de vida do hook).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRestTimer } from "@/lib/milon/hooks/useRestTimer";

// ---------------------------------------------------------------------------
// Constantes do contrato
// ---------------------------------------------------------------------------

const WORKOUT_ID = "w-1";
const ENTRY_ID = "ent-1";
const OUTRA_ENTRY_ID = "ent-2";
const EXERCICIO = "Supino reto";
const OUTRO_EXERCICIO = "Agachamento livre";
const ROTA = "/api/milon/rest-push";
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/dispositivo-1";
const P256DH = "p256dh-chave-do-dispositivo";
const AUTH = "auth-segredo-do-dispositivo";
// base64url sem `+`/`/`/`=` (entrada válida para urlBase64ToUint8Array).
const CHAVE_PUBLICA = "AQIDBAUGBwgJCgsMDQ4PEA";

// Ids fixos devolvidos pelo espião de crypto.randomUUID, na ordem dos starts.
const UUID_1 = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";
const UUID_3 = "33333333-3333-4333-8333-333333333333";

interface StartRestTimerInput {
  workoutId: string;
  entryId: string;
  exerciseName: string;
  restSeconds: number | null;
}

// ---------------------------------------------------------------------------
// Fetch global observado (o transporte do agendamento/cancelamento)
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();

function resposta(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ scheduleId: UUID_1, status: "agendado" }),
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
// Ambiente de navegador com push (permissão granted + assinatura existente)
// ---------------------------------------------------------------------------

function fazerAssinatura() {
  return {
    endpoint: ENDPOINT,
    keys: { p256dh: P256DH, auth: AUTH },
    toJSON: () => ({
      endpoint: ENDPOINT,
      keys: { p256dh: P256DH, auth: AUTH },
    }),
  };
}

/**
 * Instala o cenário mínimo em que `ensureDeviceSubscription()` tem material:
 * permissão granted, PushManager global, serviceWorker com registration
 * dotada de pushManager (caminhos `ready` e `getRegistration` cobertos — o
 * contrato não congela qual caminho o helper usa) e assinatura existente.
 */
function instalarNavegadorComPush(): {
  getSubscription: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
} {
  vi.stubGlobal("Notification", { permission: "granted" });
  vi.stubGlobal("PushManager", class PushManager {});
  const assinatura = fazerAssinatura();
  const getSubscription = vi.fn(async () => assinatura);
  const subscribe = vi.fn(async () => assinatura);
  const registration = { pushManager: { getSubscription, subscribe } };
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      ready: Promise.resolve(registration),
      getRegistration: async () => registration,
      register: async () => registration,
    },
  });
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY = CHAVE_PUBLICA;
  return { getSubscription, subscribe };
}

/**
 * Variante com assinatura LENTA (Emenda 2026-10-23 — DA16, TASK-018): o
 * `getSubscription` só resolve depois de `atrasoMs` de relógio fake
 * (`setTimeout`). É a latência física entre o clique e o POST de `schedule` —
 * exatamente o intervalo que o campo `elapsed` precisa medir no corpo.
 */
function instalarNavegadorComAssinaturaLenta(atrasoMs: number): void {
  vi.stubGlobal("Notification", { permission: "granted" });
  vi.stubGlobal("PushManager", class PushManager {});
  const assinatura = fazerAssinatura();
  const getSubscription = vi.fn(
    () =>
      new Promise<ReturnType<typeof fazerAssinatura>>((resolve) => {
        setTimeout(() => resolve(assinatura), atrasoMs);
      }),
  );
  const subscribe = vi.fn(async () => assinatura);
  const registration = { pushManager: { getSubscription, subscribe } };
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      ready: Promise.resolve(registration),
      getRegistration: async () => registration,
      register: async () => registration,
    },
  });
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY = CHAVE_PUBLICA;
}

// ---------------------------------------------------------------------------
// Helpers de atuação (fake timers + dreno de microtarefas dentro de act)
// ---------------------------------------------------------------------------

async function drenarMicrotarefas(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

/** Executa `start` e drena a cadeia fire-and-forget do agendamento. */
async function iniciar(
  result: { current: { start: unknown } },
  input: StartRestTimerInput,
): Promise<void> {
  await act(async () => {
    (result.current.start as (i: StartRestTimerInput) => void)(input);
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

/**
 * Executa `start` com latência controlada entre o clique e o POST (DA16):
 * drena a cadeia até `ensureDeviceSubscription` ficar pendurada na assinatura
 * lenta, avança o relógio fake em `latenciaMs` (o `setTimeout` da assinatura
 * resolve e `Date.now()` anda exatamente o mesmo tanto) e drena até o
 * `fetch` de `schedule` — o `elapsed` medido tem de ser `latenciaMs`.
 */
async function iniciarComLatencia(
  result: { current: { start: unknown } },
  input: StartRestTimerInput,
  latenciaMs: number,
): Promise<void> {
  await act(async () => {
    (result.current.start as (i: StartRestTimerInput) => void)(input);
    for (let i = 0; i < 20; i++) await Promise.resolve();
    vi.advanceTimersByTime(latenciaMs);
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

/** Executa uma operação síncrona do hook (cancel/dismiss) e drena. */
async function agir(operacao: () => void): Promise<void> {
  await act(async () => {
    operacao();
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

async function avancar(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

function entrada(overrides: Partial<StartRestTimerInput> = {}): StartRestTimerInput {
  return {
    workoutId: WORKOUT_ID,
    entryId: ENTRY_ID,
    exerciseName: EXERCICIO,
    restSeconds: 90,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Ciclo de vida do arquivo
// ---------------------------------------------------------------------------

let randomUUIDSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(resposta());
  vi.stubGlobal("fetch", fetchMock);
  randomUUIDSpy = vi
    .spyOn(globalThis.crypto, "randomUUID")
    .mockImplementationOnce(() => UUID_1)
    .mockImplementationOnce(() => UUID_2)
    .mockImplementationOnce(() => UUID_3)
    .mockImplementation(() => UUID_3);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).serviceWorker;
  delete process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
});

// ---------------------------------------------------------------------------

describe("Mílon #06 — useRestTimer (contrato RED, TASK-005)", () => {
  // -------------------------------------------------------------------------
  // 1. Contrato do retorno + estado inicial
  // -------------------------------------------------------------------------
  describe("1. Contrato do retorno e estado inicial", () => {
    it("expõe active/remainingSeconds/originWorkoutId/exerciseName/finished/start/cancel/dismiss", () => {
      const { result } = renderHook(() => useRestTimer());

      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBeNull();
      expect(result.current.originWorkoutId).toBeNull();
      expect(result.current.exerciseName).toBeNull();
      expect(result.current.finished).toBe(false);
      expect(typeof result.current.start).toBe("function");
      expect(typeof result.current.cancel).toBe("function");
      expect(typeof result.current.dismiss).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Start com restSeconds > 0 (spec critério 1)
  // -------------------------------------------------------------------------
  describe("2. Start com restSeconds positivo (início automático)", () => {
    it("Dada permissão granted com assinatura, Quando start com restSeconds maior que zero, Então define o estado e agenda via POST action schedule com scheduleId novo e durationSeconds capturado", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 90 }));

      // Estado da contagem em memória.
      expect(result.current.active).toBe(true);
      expect(result.current.finished).toBe(false);
      expect(result.current.remainingSeconds).toBe(90);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(EXERCICIO);

      // Um único POST na rota de push, com o contrato de corpo do plan §3.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(ROTA);
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("POST");
      const corpo = corpoDaChamada(0);
      expect(corpo.action).toBe("schedule");
      expect(corpo.scheduleId).toBe(UUID_1);
      expect(corpo.durationSeconds).toBe(90);
      expect(corpo.exerciseName).toBe(EXERCICIO);
      expect(corpo.subscription).toMatchObject({
        endpoint: ENDPOINT,
        keys: { p256dh: P256DH, auth: AUTH },
      });

      // scheduleId vem de crypto.randomUUID (DA3) — espião consumido.
      expect(randomUUIDSpy).toHaveBeenCalled();

      // setInterval de 1 s vivo.
      expect(vi.getTimerCount()).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // 3. No-op com restSeconds zero ou nulo (spec critério 3)
  // -------------------------------------------------------------------------
  describe("3. Start sem descanso é no-op", () => {
    it("Dado restSeconds zero, Quando start, Então nenhum fetch, nenhum intervalo e o estado permanece limpo", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 0 }));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBeNull();
      expect(result.current.originWorkoutId).toBeNull();
      expect(result.current.exerciseName).toBeNull();
      expect(result.current.finished).toBe(false);
    });

    it("Dado restSeconds nulo, Quando start, Então mesmo no-op (sem fetch, sem intervalo, estado limpo)", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: null }));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBeNull();
      expect(result.current.originWorkoutId).toBeNull();
      expect(result.current.finished).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Substituição por nova marcação (spec critério 4, decisão 2)
  // -------------------------------------------------------------------------
  describe("4. Substituição do timer em curso", () => {
    it("Dado um timer rodando, Quando start de novo, Então o agendamento anterior é cancelado (action cancel com o scheduleId anterior) antes de agendar o novo", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 90 }));
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await iniciar(
        result,
        entrada({
          entryId: OUTRA_ENTRY_ID,
          exerciseName: OUTRO_EXERCICIO,
          restSeconds: 60,
        }),
      );

      // schedule(id1) → cancel(id1) → schedule(id2): a ordem importa.
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(corpoDaChamada(0)).toMatchObject({
        action: "schedule",
        scheduleId: UUID_1,
        durationSeconds: 90,
      });
      expect(corpoDaChamada(1)).toMatchObject({
        action: "cancel",
        scheduleId: UUID_1,
      });
      expect(corpoDaChamada(2)).toMatchObject({
        action: "schedule",
        scheduleId: UUID_2,
        durationSeconds: 60,
        exerciseName: OUTRO_EXERCICIO,
      });

      // Estado reflete a nova marcação com a duração dela.
      expect(result.current.active).toBe(true);
      expect(result.current.remainingSeconds).toBe(60);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(OUTRO_EXERCICIO);

      // Só um intervalo vivo (o anterior foi limpo na substituição).
      expect(vi.getTimerCount()).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Contagem até o fim (spec critério 1 — camada visual)
  // -------------------------------------------------------------------------
  describe("5. Zerar a contagem", () => {
    it("Dada contagem rodando, Quando alcança zero, Então a contagem para: active falso, finished verdadeiro e remainingSeconds zero", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 2 }));
      expect(result.current.remainingSeconds).toBe(2);

      await avancar(1000);
      expect(result.current.remainingSeconds).toBe(1);
      expect(result.current.active).toBe(true);
      expect(result.current.finished).toBe(false);

      await avancar(1000);
      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.active).toBe(false);
      expect(result.current.finished).toBe(true);

      // Intervalo parado no fim; origem/exercício preservados para o alerta.
      expect(vi.getTimerCount()).toBe(0);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(EXERCICIO);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Cancel (encerramento silencioso — spec critérios 6 e 8)
  // -------------------------------------------------------------------------
  describe("6. Cancel", () => {
    it("Dado timer rodando, Quando cancel, Então cancela no servidor o scheduleId corrente e zera todo o estado", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());
      await iniciar(result, entrada({ restSeconds: 90 }));

      await agir(() => result.current.cancel());

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe("POST");
      expect(corpoDaChamada(1)).toMatchObject({
        action: "cancel",
        scheduleId: UUID_1,
      });

      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBeNull();
      expect(result.current.originWorkoutId).toBeNull();
      expect(result.current.exerciseName).toBeNull();
      expect(result.current.finished).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("Dado o alerta de fim pendente, Quando cancel, Então finished também é zerado e o agendamento corrente é cancelado", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());
      await iniciar(result, entrada({ restSeconds: 1 }));
      await avancar(1000);
      expect(result.current.finished).toBe(true);

      await agir(() => result.current.cancel());

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(corpoDaChamada(1)).toMatchObject({
        action: "cancel",
        scheduleId: UUID_1,
      });
      expect(result.current.finished).toBe(false);
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBeNull();
      expect(result.current.originWorkoutId).toBeNull();
      expect(result.current.exerciseName).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 7. Dismiss (spec critério 9 — descartar e continuar)
  // -------------------------------------------------------------------------
  describe("7. Dismiss", () => {
    it("Dado o alerta de fim, Quando dismiss, Então somente finished é limpo (estado e agendamento intactos)", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());
      await iniciar(result, entrada({ restSeconds: 1 }));
      await avancar(1000);
      expect(result.current.finished).toBe(true);

      await agir(() => result.current.dismiss());

      expect(result.current.finished).toBe(false);
      // Nada mais muda: a contagem já zerou e a origem permanece para a tela.
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(EXERCICIO);
      // Descartar é local: nenhum POST novo.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Falha de push nunca propaga (spec critério 10)
  // -------------------------------------------------------------------------
  describe("8. Rejeição/não-2xx nunca propaga", () => {
    it("Dado agendamento com rede rejeitada, Quando start, Então nenhuma exceção escapa e a contagem visual segue até o fim", async () => {
      instalarNavegadorComPush();
      fetchMock.mockRejectedValue(new Error("rede indisponível"));
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        expect(() =>
          result.current.start(entrada({ restSeconds: 3 })),
        ).not.toThrow();
      });
      await drenarMicrotarefas();

      // A contagem visual é independente do push.
      expect(result.current.active).toBe(true);
      expect(result.current.remainingSeconds).toBe(3);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);

      await avancar(3000);
      expect(result.current.finished).toBe(true);
      expect(result.current.remainingSeconds).toBe(0);
    });

    it("Dado agendamento com resposta não-2xx, Quando start, Então nenhuma exceção escapa e a contagem segue", async () => {
      instalarNavegadorComPush();
      fetchMock.mockResolvedValue(
        resposta({ ok: false, status: 500, statusText: "Internal Server Error" }),
      );
      const { result } = renderHook(() => useRestTimer());

      await act(async () => {
        expect(() =>
          result.current.start(entrada({ restSeconds: 2 })),
        ).not.toThrow();
      });
      await drenarMicrotarefas();

      expect(result.current.active).toBe(true);
      expect(result.current.remainingSeconds).toBe(2);

      await avancar(2000);
      expect(result.current.finished).toBe(true);
    });

    it("Dado cancel com falha de rede, Quando cancel, Então nenhuma exceção escapa e o estado ainda zera", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());
      await iniciar(result, entrada({ restSeconds: 90 }));

      fetchMock.mockRejectedValueOnce(new Error("rede indisponível"));
      await agir(() => {
        expect(() => result.current.cancel()).not.toThrow();
      });

      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBeNull();
      expect(result.current.originWorkoutId).toBeNull();
      expect(result.current.finished).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("Dado cancel com resposta não-2xx, Quando cancel, Então nenhuma exceção escapa e o estado ainda zera", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());
      await iniciar(result, entrada({ restSeconds: 90 }));

      fetchMock.mockResolvedValueOnce(
        resposta({ ok: false, status: 400, statusText: "Bad Request" }),
      );
      await agir(() => {
        expect(() => result.current.cancel()).not.toThrow();
      });

      expect(corpoDaChamada(1)).toMatchObject({
        action: "cancel",
        scheduleId: UUID_1,
      });
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBeNull();
      expect(result.current.finished).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Unmount limpa o intervalo
  // -------------------------------------------------------------------------
  describe("9. Unmount", () => {
    it("Dada contagem rodando, Quando o hook desmonta, Então o intervalo é cancelado (nenhum tick posterior)", async () => {
      instalarNavegadorComPush();
      const { result, unmount } = renderHook(() => useRestTimer());
      await iniciar(result, entrada({ restSeconds: 90 }));
      expect(vi.getTimerCount()).toBe(1);

      unmount();

      expect(vi.getTimerCount()).toBe(0);
      expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 10. Emenda 2026-10-23 — elapsed ancorado ao clique (TASK-018 RED)
  // -------------------------------------------------------------------------
  describe("10. Emenda 2026-10-23 — elapsed ancorado ao clique (DA16, TASK-018 RED)", () => {
    it("Dado relógio congelado (zero latência entre clique e POST), Quando start, Então o corpo de schedule carrega elapsed === 0 — sempre enviado, inteiro e nunca negativo", async () => {
      instalarNavegadorComPush();
      vi.setSystemTime(new Date("2026-10-23T12:00:00.000Z"));
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 90 }));

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const corpo = corpoDaChamada(0);
      expect(corpo.action).toBe("schedule");
      // RED (TASK-018): o hook ainda não envia `elapsed` — undefined ≠ 0.
      expect(corpo.elapsed).toBe(0);
      expect(Number.isInteger(corpo.elapsed as number)).toBe(true);
      expect(corpo.elapsed as number).toBeGreaterThanOrEqual(0);
    });

    // A latência da assinatura (tempo entre clique e POST) tem de entrar no
    // campo — t0 é capturado ANTES de ensureDeviceSubscription (DA16).
    for (const latenciaMs of [700, 2000, 2500]) {
      it(`Dado a assinatura de push resolvendo ${latenciaMs} ms depois do clique, Quando o POST de schedule sai, Então o corpo carrega elapsed === ${latenciaMs}`, async () => {
        instalarNavegadorComAssinaturaLenta(latenciaMs);
        const { result } = renderHook(() => useRestTimer());

        await iniciarComLatencia(result, entrada({ restSeconds: 90 }), latenciaMs);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe(ROTA);
        const corpo = corpoDaChamada(0);
        expect(corpo.action).toBe("schedule");
        // RED (TASK-018): o corpo ainda não traz a medição t0→POST.
        expect(corpo.elapsed).toBe(latenciaMs);
        expect(Number.isInteger(corpo.elapsed as number)).toBe(true);
      });
    }

    it("Dado um timer anterior em curso, Quando nova marcação substitui, Então o elapsed do novo POST conta do novo clique (t0 antes do cancel anterior e da assinatura), não do primeiro", async () => {
      instalarNavegadorComAssinaturaLenta(700);
      const { result } = renderHook(() => useRestTimer());

      // Primeiro agendamento completa com 700 ms de latência.
      await iniciarComLatencia(result, entrada({ restSeconds: 90 }), 700);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // 5 s de relógio entre as duas marcações (contagem segue correndo).
      await avancar(5000);

      // Substituição: cancel do anterior + novo schedule (outras 700 ms).
      await iniciarComLatencia(
        result,
        entrada({
          entryId: OUTRA_ENTRY_ID,
          exerciseName: OUTRO_EXERCICIO,
          restSeconds: 60,
        }),
        700,
      );

      // Ordem: schedule(id1) → cancel(id1) → schedule(id2).
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(corpoDaChamada(1)).toMatchObject({
        action: "cancel",
        scheduleId: UUID_1,
      });
      // O cancel segue sem elapsed (campo exclusivo do schedule) — e o novo
      // POST mede 700 ms, não 700 + 5000 + 700: t0 é o do segundo start.
      expect("elapsed" in corpoDaChamada(1)).toBe(false);
      expect(corpoDaChamada(2).elapsed).toBe(700);
    });

    it("Dado restSeconds zero ou nulo com o relógio avançando, Quando start e depois cancel/dismiss, Então nenhum POST sai (sem schedule, sem cancel) e o caminho permanece no-op", async () => {
      instalarNavegadorComPush();
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 0 }));
      await iniciar(result, entrada({ restSeconds: null }));
      await avancar(800);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);

      await agir(() => {
        result.current.cancel();
        result.current.dismiss();
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBeNull();
      expect(result.current.finished).toBe(false);
    });
  });
});
