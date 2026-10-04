import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { redirect } from "next/navigation";
import MilonRootPage from "@/app/milon/page";

/**
 * Contrato — Mílon #4 Treino do Dia (TASK-003, mudança aprovada na
 * spec §6): a raiz do módulo `/milon` vira ponto neutro que redireciona
 * para a aba padrão `/milon/today` (antes `/milon/programs`); a biblioteca
 * e os Programas não aparecem nesse caminho direto (a biblioteca migrou
 * para `/milon/exercises`, coberta pelo espelho em
 * `__tests__/app/milon/exercises/page.test.tsx`).
 *
 * Reescrito a partir do contrato TASK-012/TASK-017 (destino antigo):
 * as expectativas de destino foram substituídas — Expected: FAIL até
 * Hefesto trocar o redirect (nenhum arquivo de produção alterado por
 * este teste).
 *
 * O mock de `next/navigation` reproduz a semântica do `redirect` real do
 * Next: registra a chamada e lança (NEXT_REDIRECT) — por isso o render é
 * envolvido em try/catch: o que se afirma é a chamada registrada e o DOM
 * final, não o lançamento em si.
 *
 * POR QUE o contrato é "chamado com o destino" e NÃO "exatamente 1 vez":
 * em produção o `redirect` real é interceptado pelo router do Next fora do
 * render, e o componente só roda uma vez. Em jsdom não existe esse
 * interceptor: o lançamento vira erro de render e o React, ao continuar
 * fazendo flush do trabalho (act + renderer de desenvolvimento), re-invoca o
 * componente. Medido neste setup com uma página pura (sem guarda de teste):
 *   - mock que lança   -> 5 invocações
 *   - mock silencioso  -> 1 invocação
 * Ou seja, a QUANTIDADE de invocações é artefato do renderer/jsdom, não da
 * página — não pode ser parte do contrato. O que a spec exige é que a rota
 * dispare `redirect("/milon/today")` (pelo menos uma vez) e que nenhuma
 * chamada vá para outro destino; é exatamente o que se assegura abaixo.
 * Poder de detecção preservado: sem `redirect(...)` na página o spy fica com
 * 0 chamadas e as duas primeiras asserções falham; com destino trocado, a
 * última falha.
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

/** Renderiza a rota raiz tolerando o lançamento do redirect durante o render. */
function renderRootRoute() {
  try {
    render(<MilonRootPage />);
  } catch (err) {
    // Esperado: `redirect()` lança durante o render (comportamento do Next).
    void err;
  }
}

describe("Rota raiz /milon — redirect server-side para /milon/today (Mílon #4, TASK-003)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("acessar /milon chama redirect('/milon/today')", () => {
    renderRootRoute();

    expect(mockedRedirect).toHaveBeenCalled();
    expect(mockedRedirect).toHaveBeenCalledWith("/milon/today");
    // Destino único: nenhuma invocação para fora de /milon/today.
    expect(mockedRedirect.mock.calls.every((args) => args[0] === "/milon/today")).toBe(true);
  });

  it("a biblioteca não aparece no caminho da raiz (sem 'Novo exercício' nem título)", () => {
    renderRootRoute();

    expect(screen.queryByText(/biblioteca de exercícios/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /novo exercício/i })).not.toBeInTheDocument();
  });

  it("os Programas não aparecem no caminho direto da raiz (só o redirect)", () => {
    renderRootRoute();

    expect(screen.queryByText(/ficha verão/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /novo programa/i })).not.toBeInTheDocument();
  });
});

/** Fonte da rota raiz (mesmo padrão de leitura do MascotProvider.test.tsx). */
function rootPageSource(): string {
  return fs.readFileSync(path.resolve(__dirname, "../../../app/milon/page.tsx"), "utf8");
}

describe("TASK-012 — contrato estático de app/milon/page.tsx (server component)", () => {
  it("não contém 'use client' (é server component)", () => {
    expect(rootPageSource()).not.toMatch(/['"]use client['"]/);
  });

  it("não compõe a biblioteca: 0 ocorrências dos tokens da tela antiga", () => {
    const source = rootPageSource();
    expect(source).not.toContain("Biblioteca de exercícios");
    expect(source).not.toContain("useExercises");
    expect(source).not.toContain("ExerciseList");
    expect(source).not.toContain("ExerciseModal");
  });
});

describe("TASK-003 — raiz redireciona para o Treino do Dia (fonte)", () => {
  it("a fonte redireciona para /milon/today", () => {
    expect(rootPageSource()).toContain("/milon/today");
  });

  it("busca por /milon/programs em app/milon/page.tsx retorna 0 em código vivo", () => {
    expect(rootPageSource().split("/milon/programs").length - 1).toBe(0);
  });
});
