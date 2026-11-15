import fs from "fs";
import path from "path";
import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";

/**
 * Contrato RED — Pluto 12 Navegação e Extrato, T2 (adição 1: ponto neutro
 * `/pluto` + card da home). Fontes: `.agents/modules/pluto/12-navegacao-extrato/`
 * `tasks.json` T2 (acceptanceCriteria — fonte da cobertura), `spec.md`
 * adição 1 (cenários 22–24, R9) e `plan.md` §Contratos (D12c/D12d) +
 * §Tasks T2.
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `app/pluto/page.tsx` ainda não existe — Expected: FAIL com
 * "Cannot find module '@/app/pluto/page'" nos casos comportamentais e
 * ENOENT na leitura de fonte (nenhum arquivo de produção alterado).
 * Hefesto fará GREEN criando a página (T3) e trocando o href do card.
 *
 * Padrão espelhado de `__tests__/app/milon/page.test.tsx` (mesmo contrato
 * de raiz-ponto-neutro): mock de `next/navigation` com `redirect` que
 * registra a chamada e lança (semântica NEXT_REDIRECT), render da rota
 * envolvido em try/catch e contrato estático da fonte via
 * `fs.readFileSync`.
 *
 * POR QUE o import da página é DINÂMICO com especificador em variável:
 * um `import PlutoRootPage from "@/app/pluto/page"` literal gera TS2307
 * no `npx tsc --noEmit` enquanto o arquivo não existe (medido — e o gate
 * da T2 exige tsc limpo); `// @ts-expect-error` passaria a sobrar
 * (TS2578) depois do GREEN, quebrando o tsc da T3 sem que este arquivo
 * possa ser tocado lá. Com especificador em variável o TS não resolve o
 * módulo (mesmo truque documentado em
 * `__tests__/lib/pluto/migration-0019-execution.test.ts`, linhas 185–204)
 * e a falha fica em runtime — que é exatamente o RED esperado: o import
 * falha porque o arquivo ainda não existe.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
}));

const mockedRedirect = redirect as unknown as Mock;

/** Especificador em variável (ver cabeçalho): evita TS2307 no tsc no RED. */
const PLUTO_ROOT_PAGE_ID = "@/app/pluto/page";

type PlutoRootPageModule = { default?: ComponentType };

/** Carrega a rota raiz — lança "Cannot find module" enquanto não existir (RED). */
async function loadPlutoRootPage(): Promise<ComponentType> {
  const mod = (await import(/* @vite-ignore */ PLUTO_ROOT_PAGE_ID)) as PlutoRootPageModule;
  if (typeof mod.default !== "function") {
    throw new Error("app/pluto/page.tsx sem export default (T3 GREEN pendente)");
  }
  return mod.default;
}

/** Renderiza a rota raiz tolerando o lançamento do redirect durante o render. */
async function renderRootRoute() {
  const PlutoRootPage = await loadPlutoRootPage();
  try {
    render(<PlutoRootPage />);
  } catch (err) {
    // Esperado: `redirect()` lança durante o render (comportamento do Next).
    void err;
  }
}

describe("Rota raiz /pluto — redirect server-side para /pluto/transactions (Pluto 12, T2)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("acessar /pluto chama redirect('/pluto/transactions')", async () => {
    await renderRootRoute();

    expect(mockedRedirect).toHaveBeenCalled();
    expect(mockedRedirect).toHaveBeenCalledWith("/pluto/transactions");
    // Destino único: nenhuma invocação para fora de /pluto/transactions.
    expect(mockedRedirect.mock.calls.every((args) => args[0] === "/pluto/transactions")).toBe(true);
  });
});

/** Fonte da rota raiz (mesmo padrão de leitura de __tests__/app/milon/page.test.tsx). */
function rootPageSource(): string {
  return fs.readFileSync(path.resolve(__dirname, "../../../app/pluto/page.tsx"), "utf8");
}

describe("T2 — contrato estático de app/pluto/page.tsx (server component)", () => {
  it("não contém 'use client' (é server component)", () => {
    expect(rootPageSource()).not.toMatch(/['"]use client['"]/);
  });

  it("não compõe conteúdo: 0 ocorrências dos tokens da tela de extrato", () => {
    const source = rootPageSource();
    expect(source).not.toContain("usePlutoData");
    expect(source).not.toContain("AccountCardGrid");
    expect(source).not.toContain("ChecklistCard");
    expect(source).not.toContain("Contas e Cartões");
  });

  it("busca por /pluto/budget em app/pluto/page.tsx retorna 0 em código vivo", () => {
    expect(rootPageSource().split("/pluto/budget").length - 1).toBe(0);
  });
});

describe("T2 — a fonte da raiz redireciona para /pluto/transactions (fonte)", () => {
  it("a fonte contém o destino /pluto/transactions", () => {
    expect(rootPageSource()).toContain("/pluto/transactions");
  });
});
