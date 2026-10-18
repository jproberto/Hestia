/**
 * Contrato RED — Mílon #06 Timer de descanso auto + PWA push (TASK-009):
 * `lib/milon/hooks/usePushPermission.ts` (ainda INEXISTENTE).
 *
 * Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/plan.md`
 * §3 "Hook usePushPermission" (retorno e semântica) + §5 DA15 (permissão por
 * gesto, degradação silenciosa, nada bloqueia) + §6 fatos F1/F12 (iOS só em
 * app instalado; sem instalação não há sequer API de notificação) +
 * `tasks.json` TASK-009 (acceptanceCriteria).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/lib/milon/hooks/usePushPermission` ainda não existe — Expected: FAIL
 * com falha de coleta "Cannot find module" (acceptanceCriteria 1 da
 * TASK-009). Hefesto fará GREEN (TASK-010) apenas com o contrato do plano —
 * sem inventar APIs.
 *
 * Padrão espelhado de `__tests__/lib/milon/hooks/useActiveExecution.test.ts`
 * (renderHook) + `useRestTimer.test.ts` (simulação de ambiente com
 * `vi.stubGlobal`/`Object.defineProperty` e limpeza no afterEach).
 *
 * Ambiente: jsdom não implementa `Notification` — o cenário "sem suporte" é
 * o estado limpo; os demais cenários instalam um stub de `Notification` via
 * `vi.stubGlobal` (removido por `vi.unstubAllGlobals`). `matchMedia` é
 * espiado para o `display-mode: standalone`; `navigator.standalone` (iOS
 * Safari) e `navigator.userAgent` são definidos por `Object.defineProperty`
 * (configurável) e removidos no afterEach.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — usePushPermission):
 * - retorno: `supported: boolean` (existe `Notification` no ambiente),
 *   `permission: "default" | "granted" | "denied" | "unsupported"`,
 *   `isStandalone: boolean` (`display-mode: standalone` OU
 *   `navigator.standalone`), `isIOS: boolean` (user agent), `requesting:
 *   boolean`, `requestPermission(): Promise<void>`;
 * - `requestPermission` só faz sentido invocado por gesto do usuário;
 *   define `requesting`, chama a API de permissão, atualiza `permission` e
 *   NUNCA lança (falha vira `denied` ou mantém o estado atual).
 *
 * Convenção de nomes fixada aqui (plan.md descreve os campos sem citar
 * identificadores de tipo — Minos fixa, Hefesto implementa literalmente):
 * o tipo de permissão é a união textual congelada acima; sem `Notification`
 * no ambiente a permissão é `"unsupported"` (valor presente na união do
 * contrato do plano).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePushPermission } from "@/lib/milon/hooks/usePushPermission";

// ---------------------------------------------------------------------------
// Constantes do contrato
// ---------------------------------------------------------------------------

const UA_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

type PushPermission = "default" | "granted" | "denied" | "unsupported";

// (Removido `interface UsePushPermissionReturn` — declaração nunca usada,
// warning de lint da própria feature apontado pelo Argos em review-report.json
// findings[4]. O contrato do retorno é exercitado pelos casos abaixo.)

// ---------------------------------------------------------------------------
// Helpers de ambiente
// ---------------------------------------------------------------------------

/** Instala um stub de `Notification` com permissão e requestPermission dados. */
function instalarNotification(
  permission: PushPermission,
  requestPermission: () => Promise<unknown> = async () => "granted",
): void {
  vi.stubGlobal("Notification", { permission, requestPermission });
}

/** Remove `Notification` do ambiente (sem suporte — F12: sem instalação). */
function removerNotification(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).Notification;
}

function definirUserAgent(ua: string): void {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: ua,
  });
}

function definirNavigatorStandalone(valor: boolean): void {
  Object.defineProperty(window.navigator, "standalone", {
    configurable: true,
    value: valor,
  });
}

/**
 * Simula `window.matchMedia`: responde `matches` verdadeiro somente para a
 * query `display-mode: standalone` (caminho desktop/Android do contrato).
 */
function instalarMatchMedia(standaloneMatches: boolean): void {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("display-mode: standalone")
          ? standaloneMatches
          : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

// ---------------------------------------------------------------------------
// Ciclo de vida do arquivo
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Estado base determinístico: userAgent desktop, sem navigator.standalone,
  // matchMedia sem standalone. Cada teste instala o cenário que precisa.
  definirUserAgent(UA_DESKTOP);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window.navigator as any).standalone;
  instalarMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  removerNotification();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window.navigator as any).standalone;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window.navigator as any).userAgent;
});

// ---------------------------------------------------------------------------

describe("Mílon #06 — usePushPermission (contrato RED, TASK-009)", () => {
  // -------------------------------------------------------------------------
  // 1. supported / permission derivados do ambiente
  // -------------------------------------------------------------------------
  describe("supported e permission derivados do ambiente", () => {
    it("sem Notification no ambiente: supported falso e permission 'unsupported'", () => {
      removerNotification();

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.supported).toBe(false);
      expect(result.current.permission).toBe("unsupported");
    });

    it("com Notification e permissão 'default': supported verdadeiro e permission 'default'", () => {
      instalarNotification("default");

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.supported).toBe(true);
      expect(result.current.permission).toBe("default");
    });

    it("com Notification e permissão 'granted': supported verdadeiro e permission 'granted'", () => {
      instalarNotification("granted");

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.supported).toBe(true);
      expect(result.current.permission).toBe("granted");
    });

    it("com Notification e permissão 'denied': supported verdadeiro e permission 'denied'", () => {
      instalarNotification("denied");

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.supported).toBe(true);
      expect(result.current.permission).toBe("denied");
    });

    it("expõe requesting e requestPermission mesmo sem suporte", () => {
      removerNotification();

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.requesting).toBe(false);
      expect(typeof result.current.requestPermission).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // 2. isStandalone (display-mode standalone OU navigator.standalone)
  // -------------------------------------------------------------------------
  describe("isStandalone derivado do ambiente", () => {
    it("display-mode standalone via matchMedia → isStandalone verdadeiro", () => {
      instalarNotification("default");
      instalarMatchMedia(true);

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.isStandalone).toBe(true);
    });

    it("navigator.standalone verdadeiro (iOS Safari) → isStandalone verdadeiro", () => {
      instalarNotification("default");
      definirNavigatorStandalone(true);

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.isStandalone).toBe(true);
    });

    it("sem display-mode standalone e sem navigator.standalone → isStandalone falso", () => {
      instalarNotification("default");

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.isStandalone).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. isIOS derivado do user agent
  // -------------------------------------------------------------------------
  describe("isIOS derivado do user agent", () => {
    it("user agent de iPhone → isIOS verdadeiro", () => {
      instalarNotification("default");
      definirUserAgent(UA_IPHONE);

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.isIOS).toBe(true);
    });

    it("user agent desktop → isIOS falso", () => {
      instalarNotification("default");

      const { result } = renderHook(() => usePushPermission());

      expect(result.current.isIOS).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. requestPermission: requesting + atualização de permission, nunca lança
  // -------------------------------------------------------------------------
  describe("requestPermission (só por gesto; nunca lança)", () => {
    it("define requesting durante a chamada e atualiza permission com a resposta da API", async () => {
      let resolver!: (valor: string) => void;
      const requestPermission = vi.fn(
        () =>
          new Promise<string>((res) => {
            resolver = res;
          }),
      );
      instalarNotification("default", requestPermission);

      const { result } = renderHook(() => usePushPermission());
      expect(result.current.requesting).toBe(false);

      let promessa!: Promise<void>;
      act(() => {
        promessa = result.current.requestPermission();
      });

      // Durante a espera: requesting ligado, permission ainda a anterior.
      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(result.current.requesting).toBe(true);
      expect(result.current.permission).toBe("default");

      await act(async () => {
        resolver("granted");
        await promessa;
      });

      expect(result.current.requesting).toBe(false);
      expect(result.current.permission).toBe("granted");
    });

    it("resposta 'denied' atualiza permission para denied e desliga requesting", async () => {
      const requestPermission = vi.fn(async () => "denied");
      instalarNotification("default", requestPermission);

      const { result } = renderHook(() => usePushPermission());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(result.current.permission).toBe("denied");
      expect(result.current.requesting).toBe(false);
    });

    it("rejeição da API nunca propaga (resolve sem lançar) e desliga requesting", async () => {
      const requestPermission = vi.fn(async () => {
        throw new Error("permissão indisponível");
      });
      instalarNotification("default", requestPermission);

      const { result } = renderHook(() => usePushPermission());

      await act(async () => {
        // "nunca lança": a promise resolve; nenhuma exceção escapa.
        await expect(result.current.requestPermission()).resolves.toBeUndefined();
      });

      expect(result.current.requesting).toBe(false);
      // Contrato: "falha vira denied/estado atual" — ambos os desfechos são
      // permitidos pelo plano; o teste fixa apenas o conjunto aceitável.
      expect(["denied", "default"]).toContain(result.current.permission);
    });

    it("sem suporte (sem Notification) o requestPermission também nunca lança", async () => {
      removerNotification();

      const { result } = renderHook(() => usePushPermission());

      await act(async () => {
        await expect(result.current.requestPermission()).resolves.toBeUndefined();
      });

      expect(result.current.requesting).toBe(false);
    });
  });
});
