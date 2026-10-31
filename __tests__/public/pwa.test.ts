import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Contrato RED — Mílon #06 Timer de descanso auto + PWA push (TASK-013):
// ativos do PWA mínimo ainda INEXISTENTES:
// - `public/manifest.webmanifest` (ainda não criado)
// - `public/sw.js` (ainda não criado)
// - alterações de `app/layout.tsx` (arquivo existe, ainda sem metadata PWA
//   nem montagem do PwaRegistration)
//
// Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/plan.md`
// §1 "Mudança 1 — PWA mínimo", §2 "PWA estático" (Create) e §3 "PWA estático"
// (manifest, sw.js, layout — textos congelados) + `tasks.json` TASK-013
// (acceptanceCriteria 2 a 6).
//
// Escrito ANTES da implementação (outside-in): falha porque o manifest e o
// sw.js ainda não existem (`readFileSync` lança ENOENT) e o layout ainda não
// referencia o manifest nem monta o `PwaRegistration` — Expected: FAIL pelo
// motivo certo (acceptanceCriteria 1 da TASK-013). Hefesto fará GREEN
// (TASK-014) apenas com o contrato do plano — sem inventar campos.
//
// Padrão: leitura por fs, mesmo regime de __tests__/lib/milon/migration-*.test.ts.
// ---------------------------------------------------------------------------

const MANIFEST_PATH = path.resolve(
  __dirname,
  "../../public/manifest.webmanifest",
);
const SW_PATH = path.resolve(__dirname, "../../public/sw.js");
const LAYOUT_PATH = path.resolve(__dirname, "../../app/layout.tsx");

interface ManifestIcon {
  src: string;
  sizes?: string;
  type?: string;
}

interface Manifest {
  name?: string;
  short_name?: string;
  display?: string;
  start_url?: string;
  scope?: string;
  theme_color?: string;
  background_color?: string;
  icons?: ManifestIcon[];
}

function loadManifest(): Manifest {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  return JSON.parse(raw) as Manifest;
}

function loadSw(): string {
  return fs.readFileSync(SW_PATH, "utf8");
}

function loadLayout(): string {
  return fs.readFileSync(LAYOUT_PATH, "utf8");
}

/** Conta ocorrências de um padrão (para exigir showNotification em todos os ramos). */
function countMatches(source: string, pattern: RegExp): number {
  return (source.match(pattern) ?? []).length;
}

describe("Mílon #06 TASK-013 — public/manifest.webmanifest (contrato RED)", () => {
  it("é um JSON válido", () => {
    expect(() => loadManifest()).not.toThrow();
  });

  it('define name e short_name como "Héstia"', () => {
    const manifest = loadManifest();
    expect(manifest.name).toBe("Héstia");
    expect(manifest.short_name).toBe("Héstia");
  });

  it("define display como standalone (pré-requisito de instalação iOS, F1)", () => {
    const manifest = loadManifest();
    expect(manifest.display).toBe("standalone");
  });

  it('define start_url e scope como "/"', () => {
    const manifest = loadManifest();
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
  });

  it("define theme_color #111827 e background_color #ffffff (cores congeladas do plan §3)", () => {
    const manifest = loadManifest();
    expect(manifest.theme_color).toBe("#111827");
    expect(manifest.background_color).toBe("#ffffff");
  });

  it("declara ícone /mascots/hestia.png com sizes any e type image/png", () => {
    const manifest = loadManifest();
    const icon = (manifest.icons ?? []).find(
      (entry) => entry.src === "/mascots/hestia.png",
    );
    expect(icon).toBeDefined();
    expect(icon?.type).toBe("image/png");
    expect(icon?.sizes).toBe("any");
  });
});

describe("Mílon #06 TASK-013 — public/sw.js (contrato RED, F2)", () => {
  it("registra addEventListener de push", () => {
    const sw = loadSw();
    expect(sw).toMatch(/addEventListener\s*\(\s*["']push["']/);
  });

  it("chama showNotification em TODOS os ramos do push — regex obrigatória F2 (payload válido e fallback; exibir é requisito, nunca opcional)", () => {
    const sw = loadSw();
    // F2: push recebido sem exibir faz o Safari revogar a permissão — o
    // handler de push precisa exibir em qualquer ramo: o do payload JSON
    // válido e o do payload inválido (fallback genérico). Dois ramos, no
    // mínimo duas chamadas de showNotification.
    const pushRegistrations = countMatches(
      sw,
      /addEventListener\s*\(\s*["']push["']/g,
    );
    expect(pushRegistrations).toBeGreaterThanOrEqual(1);
    const showNotificationCalls = countMatches(sw, /showNotification\s*\(/g);
    expect(showNotificationCalls).toBeGreaterThanOrEqual(2);
  });

  it("faz parse do payload JSON e contém os textos de fallback congelados do plan §3", () => {
    const sw = loadSw();
    expect(sw).toMatch(/JSON\.parse/);
    // Mesmos textos do payload da rota (plan §3 "Textos congelados"):
    // título "Descanso terminado" e corpo de fallback "O descanso terminou."
    expect(sw).toContain("Descanso terminado");
    expect(sw).toContain("O descanso terminou.");
  });

  it("registra notificationclick com openWindow em /milon/today (url padrão do payload)", () => {
    const sw = loadSw();
    expect(sw).toMatch(/addEventListener\s*\(\s*["']notificationclick["']/);
    expect(sw).toMatch(/openWindow\s*\(/);
    expect(sw).toContain("/milon/today");
  });

  it("registra install com skipWaiting", () => {
    const sw = loadSw();
    expect(sw).toMatch(/addEventListener\s*\(\s*["']install["']/);
    expect(sw).toMatch(/skipWaiting\s*\(/);
  });

  it("registra activate com clients.claim", () => {
    const sw = loadSw();
    expect(sw).toMatch(/addEventListener\s*\(\s*["']activate["']/);
    expect(sw).toMatch(/clients\.claim\s*\(/);
  });

  it("NÃO contém handler de fetch (nenhuma interceptação de rede, zero risco de cache stale)", () => {
    const sw = loadSw();
    expect(sw).not.toMatch(/addEventListener\s*\(\s*["']fetch["']/);
    expect(sw).not.toMatch(/\.onfetch\s*=/);
  });
});

// ---------------------------------------------------------------------------
// Contrato COMPORTAMENTAL do notificationclick — blocker B1 da review do Argos
// (review-report.json findings[0], important): o sw.js anterior focava
// qualquer janela existente e NUNCA navegava para data.url, contrariando
// plan.md:33 ("notificationclick (abre/foca /milon/today ou a url do
// payload)"), plan.md:191 ("openWindow em data.url ou /milon/today"), DA11
// (plan.md:233 "notificationclick reabre o Treino do Dia") e o Cenário 4 de
// homologação — exatamente o caso de uso "app aberto em outra página do
// Héstia" da spec §2.
//
// Abordagem (NÃO regex): o `public/sw.js` real é avaliado como script em
// contexto stub — `new Function("self", fonte)(stub)` executa o arquivo e
// captura o handler registrado via `addEventListener`, ou seja, exatamente o
// código que o navegador executaria. O evento de clique é então simulado com
// `clients` mockados e o resultado (navigate/openWindow/focus) é observado.
// ---------------------------------------------------------------------------

type HandlerSw = (event: EventoNotificationClick) => void;

interface EventoNotificationClick {
  notification: { close: ReturnType<typeof vi.fn>; data?: { url?: string } };
  waitUntil: (promessa: Promise<unknown>) => void;
}

interface ClienteJanelaStub {
  url: string;
  focus: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
}

function carregarSwEmContextoStub() {
  const handlers = new Map<string, HandlerSw>();
  const stub = {
    handlers,
    addEventListener: (tipo: string, handler: HandlerSw): void => {
      handlers.set(tipo, handler);
    },
    clients: {
      matchAll: vi.fn(async (): Promise<ClienteJanelaStub[]> => []),
      openWindow: vi.fn(async (url: string): Promise<string> => url),
      claim: vi.fn(async (): Promise<undefined> => undefined),
    },
    registration: {
      showNotification: vi.fn(async (): Promise<string> => "ok"),
    },
    skipWaiting: vi.fn(),
  };
  // O sw.js é JavaScript estático sem import/export: avaliar a fonte real com
  // `self` injetado exercita os handlers de verdade (sem regex).
  const executar = new Function("self", loadSw());
  executar(stub);
  return stub;
}

/** Janela de navegador stub (superfície WindowClient: focus + navigate). */
function janela(url: string): ClienteJanelaStub {
  return {
    url,
    focus: vi.fn(async (): Promise<null> => null),
    navigate: vi.fn(async (alvo: string): Promise<string> => alvo),
  };
}

/**
 * Dispara o `notificationclick` capturado e aguarda as promessas passadas a
 * `event.waitUntil` (é por ali que a navegação/abertura acontece).
 */
async function clicarNaNotificacao(
  stub: ReturnType<typeof carregarSwEmContextoStub>,
  data?: { url?: string },
): Promise<void> {
  const pendencias: Promise<unknown>[] = [];
  const evento: EventoNotificationClick = {
    notification: { close: vi.fn(), data },
    waitUntil: (promessa) => {
      pendencias.push(promessa);
    },
  };
  const handler = stub.handlers.get("notificationclick");
  if (!handler) {
    throw new Error("handler de notificationclick não registrado em public/sw.js");
  }
  handler(evento);
  await Promise.all(pendencias);
}

describe("Mílon #06 — public/sw.js notificationclick (contrato COMPORTAMENTAL, blocker B1)", () => {
  it("com janela existente em OUTRA rota, o clique leva a data.url (navigate ou openWindow) — nunca só focar", async () => {
    const stub = carregarSwEmContextoStub();
    const emOutraRota = janela("/milon/programs");
    stub.clients.matchAll.mockResolvedValue([emOutraRota]);

    await clicarNaNotificacao(stub, { url: "/milon/today" });

    const alvo = "/milon/today";
    const navegouParaAlvo = emOutraRota.navigate.mock.calls.some(
      (chamada) => chamada[0] === alvo,
    );
    const abriuAlvo = stub.clients.openWindow.mock.calls.some(
      (chamada) => chamada[0] === alvo,
    );
    expect(
      navegouParaAlvo || abriuAlvo,
      "o clique na notificação deve levar a data.url (client.navigate ou clients.openWindow), não apenas focar a janela de outra rota",
    ).toBe(true);
  });

  it("com a janela já no alvo /milon/today, foca e NÃO abre janela nova", async () => {
    const stub = carregarSwEmContextoStub();
    const noAlvo = janela("/milon/today");
    stub.clients.matchAll.mockResolvedValue([noAlvo]);

    await clicarNaNotificacao(stub, { url: "/milon/today" });

    expect(noAlvo.focus).toHaveBeenCalledTimes(1);
    expect(stub.clients.openWindow).not.toHaveBeenCalled();
  });

  it("sem janela aberta, openWindow na data.url do payload", async () => {
    const stub = carregarSwEmContextoStub();
    stub.clients.matchAll.mockResolvedValue([]);

    await clicarNaNotificacao(stub, { url: "/milon/programs" });

    expect(stub.clients.openWindow).toHaveBeenCalledTimes(1);
    expect(stub.clients.openWindow).toHaveBeenCalledWith("/milon/programs");
  });

  it("sem janela aberta e sem data.url, openWindow no fallback /milon/today (caminho exato do Treino do Dia)", async () => {
    const stub = carregarSwEmContextoStub();
    stub.clients.matchAll.mockResolvedValue([]);

    await clicarNaNotificacao(stub, undefined);

    expect(stub.clients.openWindow).toHaveBeenCalledTimes(1);
    expect(stub.clients.openWindow).toHaveBeenCalledWith("/milon/today");
  });
});

describe("Mílon #06 TASK-013 — app/layout.tsx (contrato RED, fs)", () => {
  it('referencia /manifest.webmanifest no metadata', () => {
    const layout = loadLayout();
    expect(layout).toContain("/manifest.webmanifest");
  });

  it("declara appleWebApp (capable, título Héstia) no metadata", () => {
    const layout = loadLayout();
    expect(layout).toMatch(/appleWebApp/);
    expect(layout).toMatch(/capable/);
  });

  it('declara icons.apple apontando ao mascote /mascots/hestia.png e themeColor #111827 no viewport', () => {
    const layout = loadLayout();
    expect(layout).toContain("/mascots/hestia.png");
    expect(layout).toMatch(/apple/);
    expect(layout).toMatch(/themeColor/);
    expect(layout).toContain("#111827");
  });

  it("monta <PwaRegistration /> dentro do <body> junto de {children}", () => {
    const layout = loadLayout();
    const body = layout.match(/<body[^>]*>[\s\S]*<\/body>/);
    expect(body).not.toBeNull();
    expect(body?.[0]).toContain("PwaRegistration");
    expect(body?.[0]).toContain("{children}");
  });
});
