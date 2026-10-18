import { describe, it, expect } from "vitest";
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
