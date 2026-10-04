import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { MilonLayout } from "@/components/milon/MilonLayout";

/**
 * Contrato — Mílon #4 Treino do Dia (TASK-003, mudança aprovada na
 * spec §6): `milonNavItems` com exatamente 3 abas — Treino do Dia
 * (`/milon/today`) primeiro, seguida de Programas e Exercícios — e marca
 * de aba ativa acompanhando o destino atual (sempre exatamente uma).
 *
 * Reescrito a partir do contrato Patch v3 (2 abas): as expectativas
 * antigas (2 links, Exercícios+Programas) foram substituídas — Expected:
 * FAIL até Hefesto adicionar a aba (nenhum arquivo de produção alterado
 * por este teste).
 */

// next/navigation mockado por arquivo para travar a marca de aba ativa
// (ModuleLayout deriva `aria-current` do pathname — acesso direto por
// endereço, sem clique anterior, spec §5-03).
const mockUsePathname = vi.hoisted(() => vi.fn(() => "/"));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

describe("MilonLayout", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/");
  });

  it("should render layout without crashing", () => {
    render(
      <MilonLayout pageTitle="Test" pageSubtitle="Subtitle">
        <div>Children</div>
      </MilonLayout>
    );
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
    expect(screen.getByText("Children")).toBeInTheDocument();
  });

  // Mílon #4 (Treino do Dia) — TASK-003 / critérios: milonNavItems com
  // exatamente 3 abas passadas ao ModuleLayout. Spec §5-02 (três itens,
  // nesta ordem: Treino do Dia, Programas, Exercícios) + §5-03 (marca
  // acompanha o destino atual, sempre exatamente uma aba ativa).
  describe("barra de navegação do módulo (TASK-003)", () => {
    const renderLayout = () =>
      render(
        <MilonLayout pageTitle="Test" pageSubtitle="Subtitle">
          <div>Children</div>
        </MilonLayout>
      );

    const navLinks = () => {
      const nav = screen.getByRole("navigation", {
        name: "Navegação do módulo Mílon",
      });
      return within(nav).getAllByRole("link");
    };

    it("exibe exatamente 3 links na navegação do módulo, sem itens extras", () => {
      renderLayout();

      expect(navLinks()).toHaveLength(3);
    });

    it("ordem exata: Treino do Dia → Programas → Exercícios, com hrefs exatos", () => {
      renderLayout();

      const links = navLinks();
      expect(links.map((link) => link.textContent)).toEqual([
        "Treino do Dia",
        "Programas",
        "Exercícios",
      ]);
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        "/milon/today",
        "/milon/programs",
        "/milon/exercises",
      ]);
    });

    it("cada link é navegável com rótulo e rota exatos", () => {
      renderLayout();

      const nav = screen.getByRole("navigation", {
        name: "Navegação do módulo Mílon",
      });
      const treinoDoDia = within(nav).getByRole("link", {
        name: "Treino do Dia",
      });
      const programas = within(nav).getByRole("link", { name: "Programas" });
      const exercicios = within(nav).getByRole("link", {
        name: "Exercícios",
      });

      expect(treinoDoDia).toHaveAttribute("href", "/milon/today");
      expect(programas).toHaveAttribute("href", "/milon/programs");
      expect(exercicios).toHaveAttribute("href", "/milon/exercises");
    });

    it("a marca acompanha o destino atual: exatamente uma aba ativa por destino", () => {
      const destinos = [
        { pathname: "/milon/today", ativa: "Treino do Dia" },
        { pathname: "/milon/programs", ativa: "Programas" },
        { pathname: "/milon/exercises", ativa: "Exercícios" },
      ] as const;

      for (const { pathname, ativa } of destinos) {
        mockUsePathname.mockReturnValue(pathname);
        const { unmount } = renderLayout();

        const links = navLinks();
        const ativas = links.filter(
          (link) => link.getAttribute("aria-current") === "page",
        );
        expect(ativas).toHaveLength(1);
        expect(ativas[0].textContent).toBe(ativa);

        unmount();
        cleanup();
      }
    });

    it("acesso direto ao Treino do Dia marca a primeira aba sem clique anterior", () => {
      mockUsePathname.mockReturnValue("/milon/today");
      renderLayout();

      const nav = screen.getByRole("navigation", {
        name: "Navegação do módulo Mílon",
      });
      expect(
        within(nav).getByRole("link", { name: "Treino do Dia" }),
      ).toHaveAttribute("aria-current", "page");
    });
  });
});

/** Fonte do layout (raiz = 3 níveis acima de __tests__/components/milon). */
function milonLayoutSource(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../components/milon/MilonLayout.tsx"),
    "utf8",
  );
}

describe("TASK-003 — MilonLayout com 3 abas (fonte)", () => {
  it("o layout declara a aba Treino do Dia (/milon/today)", () => {
    expect(milonLayoutSource()).toContain("/milon/today");
  });

  it("Treino do Dia é a primeira aba (ordem Treino do Dia → Programas → Exercícios)", () => {
    const source = milonLayoutSource();
    expect(source.indexOf("Treino do Dia")).toBeGreaterThanOrEqual(0);
    expect(source.indexOf("Treino do Dia")).toBeLessThan(
      source.indexOf("Programas"),
    );
    expect(source.indexOf("Programas")).toBeLessThan(
      source.indexOf("Exercícios"),
    );
  });
});
