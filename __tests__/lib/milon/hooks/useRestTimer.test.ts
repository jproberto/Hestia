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
 * EMENDA 2 — 2026-10-23 (supressão da notificação com aba ativa, DA21/DA23 —
 * TASK-023 RED): no tick onde `remainingSeconds` chega a 0, o estado visual
 * é consolidado PRIMEIRO (`finished` verdadeiro, `active` falso,
 * `remainingSeconds` 0, `originWorkoutId`/`exerciseName` mantidos) e DEPOIS
 * `document.visibilityState` é lido no instante do tick: com `visible`, o
 * cancel do agendamento é disparado fire-and-forget (reusando
 * `cancelRestPush`) e `scheduleIdRef` é limpo no mesmo tick (semântica nova
 * "cancela mantendo o alerta visual", diferente do `cancel()` completo);
 * com `hidden`/outro valor, nenhum cancel. Casos da seção 11 escritos ANTES
 * da TASK-024: Expected: FAIL — hoje o zero não emite `action: "cancel"` e a
 * visibilidade não é lida. Invariantes preservados e verdes:
 * `visibilitychange` (grep 0 — sem listener), push indisponível sem POST,
 * `dismiss`, `cancel()` completo, no-op de `start` e substituição. Padrão
 * DA24: `document.visibilityState` stubado com `Object.defineProperty`
 * configurable + getter contabilizador, restaurado no `afterEach` (mesmo
 * estilo do `navigator.serviceWorker`); o arquivo roda por padrão com
 * `"hidden"` (mundo pré-Emenda 2) para as regressões não dependerem do novo
 * cancel no zero — os casos da Emenda 2 stubam o valor explicitamente.
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
import fs from "node:fs";
import path from "node:path";
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

/** Corpo de todos os POSTs feitos até aqui (o `fetch` é o transporte observado). */
function acoesDosPosts(): Record<string, unknown>[] {
  return fetchMock.mock.calls.map((_, indice) => corpoDaChamada(indice));
}

// ---------------------------------------------------------------------------
// Visibilidade da aba (Emenda 2 — DA21/DA24)
// ---------------------------------------------------------------------------

// Valor corrente devolvido pelo getter e contador de leituras: o contrato
// exige que a visibilidade seja lida NO INSTANTE do tick de zero (não no
// `start`, não cacheada) — o contador torna essa leitura observável.
let visibilidadeAtual = "visible";
let leiturasVisibilidade = 0;

/**
 * Stub de `document.visibilityState` via `Object.defineProperty` configurable
 * (padrão do `navigator.serviceWorker` do arquivo): o getter devolve o valor
 * corrente e conta as leituras. Restaurado no `afterEach` com
 * `Reflect.deleteProperty` (o getter do prototype do jsdom volta a valer).
 */
function definirVisibilidade(valor: string): void {
  visibilidadeAtual = valor;
  leiturasVisibilidade = 0;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => {
      leiturasVisibilidade += 1;
      return visibilidadeAtual;
    },
  });
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
  // Padrão do arquivo: aba OCULTA (mundo pré-Emenda 2 — o zero não cancela),
  // para as regressões das seções 1–10 não dependerem do novo comportamento.
  // Os casos da Emenda 2 stubam o valor explicitamente no teste.
  definirVisibilidade("hidden");
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
  // Restaura o visibilityState original do jsdom (getter do prototype).
  Reflect.deleteProperty(document, "visibilityState");
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

  // -------------------------------------------------------------------------
  // 11. Emenda 2 — visibilidade no tick de zero (DA21/DA23 — TASK-023 RED)
  // -------------------------------------------------------------------------
  describe("11. Emenda 2 — supressão por visibilidade no tick de zero (TASK-023 RED)", () => {
    it("Dado o descanso com a aba visível no zero, Quando a contagem zera, Então um POST action cancel sai com o scheduleId da sessão e o estado visual é preservado (não é o cancel() completo)", async () => {
      instalarNavegadorComPush();
      definirVisibilidade("visible");
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 2 }));
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await avancar(1000);
      await avancar(1000); // tick de zero
      await drenarMicrotarefas();

      // RED (TASK-023): o cancel por visibilidade no zero ainda não existe —
      // hoje só o POST de schedule da sessão foi emitido.
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const cancelamento = corpoDaChamada(1);
      expect(cancelamento).toMatchObject({ action: "cancel" });
      // Mesmo id do schedule da sessão (critério 4) — o id gerado no start.
      expect(cancelamento.scheduleId).toBe(corpoDaChamada(0).scheduleId);
      expect(cancelamento.scheduleId).toBe(UUID_1);

      // Estado visual consolidado e preservado (critério 5): o alerta
      // "Descanso terminado" permanece e origem/exercício NÃO são limpos —
      // diferente do cancel() completo, que zera tudo.
      expect(result.current.finished).toBe(true);
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(EXERCICIO);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("Dado o descanso com a aba oculta (hidden) no zero, Quando a contagem zera, Então a visibilidade é lida no instante do tick, NENHUM POST cancel sai e o estado visual é idêntico", async () => {
      instalarNavegadorComPush();
      definirVisibilidade("hidden");
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 2 }));
      await avancar(1000);

      leiturasVisibilidade = 0; // só a leitura do tick de zero interessa
      await avancar(1000); // tick de zero
      await drenarMicrotarefas();

      // RED (DA21): a decisão lê `document.visibilityState` NO TICK —
      // hoje nada lê (o contador fica em zero).
      expect(leiturasVisibilidade).toBeGreaterThan(0);

      // Nenhum cancel em toda a sessão (nenhum POST action cancel).
      expect(acoesDosPosts().map((corpo) => corpo.action)).not.toContain("cancel");

      // Estado visual idêntico ao caso visible (critério 7).
      expect(result.current.finished).toBe(true);
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(EXERCICIO);
    });

    it("Dado o descanso com outro valor de visibilidade (prerender) no zero, Quando a contagem zera, Então a visibilidade é lida no instante, NENHUM POST cancel sai e o estado visual é idêntico", async () => {
      instalarNavegadorComPush();
      definirVisibilidade("prerender");
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 2 }));
      await avancar(1000);

      leiturasVisibilidade = 0; // só a leitura do tick de zero interessa
      await avancar(1000); // tick de zero
      await drenarMicrotarefas();

      // RED (DA21): qualquer valor diferente de "visible" é decidido no tick —
      // para isso a visibilidade precisa ser LIDA nele.
      expect(leiturasVisibilidade).toBeGreaterThan(0);

      expect(acoesDosPosts().map((corpo) => corpo.action)).not.toContain("cancel");

      expect(result.current.finished).toBe(true);
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(EXERCICIO);
    });

    it("Dado a aba oculta no start e visível antes do zero, Quando a contagem zera, Então o cancel é disparado (a visibilidade é lida no instante do tick, não cacheada no início do hook)", async () => {
      instalarNavegadorComPush();
      definirVisibilidade("hidden");
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 2 }));
      // Só vira visível entre o start e o zero: um valor cacheado no início
      // (hidden) não poderia decidir aqui.
      visibilidadeAtual = "visible";
      await avancar(1000);
      await avancar(1000);
      await drenarMicrotarefas();

      // RED (TASK-023): hoje ninguém cancela no zero.
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(corpoDaChamada(1)).toMatchObject({
        action: "cancel",
        scheduleId: UUID_1,
      });
      expect(result.current.finished).toBe(true);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
    });

    it("Dado a aba visível no start e oculta antes do zero, Quando a contagem zera, Então NENHUM cancel sai (a decisão é do instante do zero)", async () => {
      instalarNavegadorComPush();
      definirVisibilidade("visible");
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 2 }));
      // Oculta só entre o start e o zero: um valor cacheado no início
      // (visible) cancelaria por engano aqui.
      visibilidadeAtual = "hidden";
      await avancar(1000);
      await avancar(1000);
      await drenarMicrotarefas();

      expect(acoesDosPosts().map((corpo) => corpo.action)).not.toContain("cancel");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.current.finished).toBe(true);
    });

    it("Preservado — push indisponível desde o start: NENHUM POST (schedule) e a contagem visual segue até o fim", async () => {
      definirVisibilidade("hidden");
      // Sem Notification/service worker/PushManager: assegura dispositivo
      // devolve null e nada de rede acontece (contrato já homologado).
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 2 }));
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.active).toBe(true);
      expect(result.current.remainingSeconds).toBe(2);

      await avancar(2000);
      expect(result.current.finished).toBe(true);
      expect(result.current.remainingSeconds).toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("Dado start sem nenhuma sessão de agendamento (push indisponível), Quando o tick zera com a aba visível, Então o branch é no-op: NENHUM POST e nada lança (scheduleIdRef nulo — DA23)", async () => {
      definirVisibilidade("visible");
      const { result } = renderHook(() => useRestTimer());

      await iniciar(result, entrada({ restSeconds: 1 }));
      expect(fetchMock).not.toHaveBeenCalled();

      // No-op sem exceção (critério 8): avançar até o zero não pode lançar
      // nem emitir POST — não há agendamento a cancelar.
      await avancar(1000);
      await drenarMicrotarefas();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.finished).toBe(true);
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(EXERCICIO);
    });

    it("Dado o POST de cancel do zero rejeitando (rede), Quando a contagem zera, Então a rejeição é engolida pelo .catch e o estado visual segue intacto", async () => {
      instalarNavegadorComPush();
      definirVisibilidade("visible");
      const { result } = renderHook(() => useRestTimer());
      await iniciar(result, entrada({ restSeconds: 2 }));

      fetchMock.mockRejectedValueOnce(new Error("rede indisponível no zero"));

      await avancar(1000);
      await avancar(1000); // tick de zero
      await drenarMicrotarefas();

      // RED (TASK-023): o cancel do zero não é emitido hoje.
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(corpoDaChamada(1)).toMatchObject({
        action: "cancel",
        scheduleId: UUID_1,
      });
      // A rejeição não quebra a contagem: sem unhandled rejection (`.catch`
      // vazio do fire-and-forget) e o alerta visual permanece.
      expect(result.current.finished).toBe(true);
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(EXERCICIO);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("Dado o cancel do zero visível, Quando um novo descanso inicia, Então o start não cancela o id antigo e o cancel do segundo zero usa o id novo (scheduleIdRef limpo — DA23)", async () => {
      instalarNavegadorComPush();
      definirVisibilidade("visible");
      const { result } = renderHook(() => useRestTimer());

      // 1º descanso (UUID_1) até o zero visível.
      await iniciar(result, entrada({ restSeconds: 2 }));
      await avancar(1000);
      await avancar(1000);
      await drenarMicrotarefas();

      // RED (TASK-023): o cancel do zero ainda não existe.
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(corpoDaChamada(1)).toMatchObject({
        action: "cancel",
        scheduleId: UUID_1,
      });

      // 2º descanso (UUID_2): com o ref limpo, o start NÃO cancela o id
      // antigo (sem o cancel-anterior de substituição).
      await iniciar(
        result,
        entrada({
          entryId: OUTRA_ENTRY_ID,
          exerciseName: OUTRO_EXERCICIO,
          restSeconds: 1,
        }),
      );
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(corpoDaChamada(2)).toMatchObject({
        action: "schedule",
        scheduleId: UUID_2,
      });
      const idsCancelados = acoesDosPosts()
        .map((corpo) => ({ acao: corpo.action, id: corpo.scheduleId }))
        .filter((post) => post.acao === "cancel")
        .map((post) => post.id);
      expect(idsCancelados).toEqual([UUID_1]); // só o do zero; nada no start2

      // Zero do 2º descanso: o cancel usa o id NOVO, nunca o antigo.
      await avancar(1000);
      await drenarMicrotarefas();
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(corpoDaChamada(3)).toMatchObject({
        action: "cancel",
        scheduleId: UUID_2,
      });
      expect(corpoDaChamada(3).scheduleId).not.toBe(UUID_1);
    });

    it("Dado o tick de zero visível, Quando o POST de cancel é disparado, Então o intervalo já está parado e a visibilidade já foi lida (estado consolidado antes da rede — DA21)", async () => {
      instalarNavegadorComPush();
      definirVisibilidade("visible");
      const { result } = renderHook(() => useRestTimer());
      await iniciar(result, entrada({ restSeconds: 2 }));

      // Captura o mundo NO INSTANTE do POST (o fetch é invocado dentro do
      // callback do tick): a consolidação visual tem de ter acontecido antes.
      const captura: {
        momento: { intervalosVivos: number; visibilidadeLida: boolean } | null;
      } = { momento: null };
      fetchMock.mockImplementation(async () => {
        captura.momento = {
          intervalosVivos: vi.getTimerCount(),
          visibilidadeLida: leiturasVisibilidade > 0,
        };
        return resposta();
      });

      await avancar(1000);
      leiturasVisibilidade = 0; // só a leitura do tick de zero interessa
      await avancar(1000); // tick de zero
      await drenarMicrotarefas();

      // RED (TASK-023): sem cancel no zero não há o que capturar.
      expect(captura.momento).not.toBeNull();
      // Intervalo já parado no momento da rede (consolidação ANTES da rede —
      // em React o `finished` só materializa no render seguinte ao tick, então
      // a ordem é observada pelos efeitos síncronos do callback).
      expect(captura.momento?.intervalosVivos).toBe(0);
      // A visibilidade foi lida antes de disparar o POST (estado → visibilidade → rede).
      expect(captura.momento?.visibilidadeLida).toBe(true);
      // Estado visual completo consolidado ao fim do tick.
      expect(result.current.finished).toBe(true);
      expect(result.current.active).toBe(false);
      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.originWorkoutId).toBe(WORKOUT_ID);
      expect(result.current.exerciseName).toBe(EXERCICIO);
    });

    it("Busca por visibilitychange em lib/milon/hooks/useRestTimer.ts retorna 0 (decisão exclusiva do tick, sem listener — DA21)", () => {
      const fonte = fs.readFileSync(
        path.resolve(__dirname, "../../../../lib/milon/hooks/useRestTimer.ts"),
        "utf8",
      );
      expect(fonte.match(/visibilitychange/g) ?? []).toHaveLength(0);
    });
  });
});
