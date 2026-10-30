import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import PwaRegistration from "@/components/PwaRegistration";

// ---------------------------------------------------------------------------
// Contrato RED — Mílon #06 Timer de descanso auto + PWA push (TASK-013):
// `components/PwaRegistration.tsx` (ainda INEXISTENTE).
//
// Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/plan.md`
// §1 "Mudança 1 — PWA mínimo" (registro via componente client transversal,
// catch vazio, nunca derruba o app) e §3 "Componentes presentacionais" —
// `PwaRegistration` (sem props; no mount registra `/sw.js` quando
// `serviceWorker` existe no `navigator`, com `catch` vazio; renderiza `null`)
// + `tasks.json` TASK-013 (acceptanceCriteria 6).
//
// Escrito ANTES da implementação (outside-in): falha porque
// `@/components/PwaRegistration` ainda não existe — Expected: FAIL com
// falha de coleta "Cannot find module" (acceptanceCriteria 1 da TASK-013).
// Hefesto fará GREEN (TASK-014) apenas com o contrato do plano.
// ---------------------------------------------------------------------------

interface ServiceWorkerRegistrationLike {
  installing?: unknown;
  waiting?: unknown;
  active?: unknown;
}

type RegisterMock = ReturnType<typeof vi.fn>;

function stubServiceWorker(register: RegisterMock | undefined) {
  // jsdom não expõe navigator.serviceWorker; define/remove via
  // defineProperty (sem `delete` — o lib.dom declara o campo como obrigatório).
  if (register) {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
      writable: true,
    });
  } else {
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  }
}

function resolvedRegistration(): Promise<ServiceWorkerRegistrationLike> {
  return Promise.resolve({});
}

describe("Mílon #06 — PwaRegistration (contrato RED, TASK-013)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    stubServiceWorker(undefined);
  });

  it("registra /sw.js via navigator.serviceWorker.register quando o navegador suporta service worker", async () => {
    const register = vi.fn(
      (): Promise<ServiceWorkerRegistrationLike> => resolvedRegistration(),
    );
    stubServiceWorker(register);

    render(<PwaRegistration />);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("não tenta registrar quando navigator.serviceWorker não existe (não lança)", () => {
    stubServiceWorker(undefined);

    expect(() => render(<PwaRegistration />)).not.toThrow();
  });

  it("rejeição do register é engolida pelo catch e não derruba o componente", async () => {
    const register = vi.fn((): Promise<ServiceWorkerRegistrationLike> =>
      Promise.reject(new Error("registro indisponível")),
    );
    stubServiceWorker(register);

    let thrown: unknown;
    try {
      render(<PwaRegistration />);
      // flush dos microticks: a rejeição precisa ser engolida pelo catch
      // vazio do componente, nunca propagar como unhandled rejection.
      await Promise.resolve();
      await Promise.resolve();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeUndefined();
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("renderiza null (não produz markup visível)", () => {
    const register = vi.fn(
      (): Promise<ServiceWorkerRegistrationLike> => resolvedRegistration(),
    );
    stubServiceWorker(register);

    const { container } = render(<PwaRegistration />);

    expect(container).toBeEmptyDOMElement();
  });
});
