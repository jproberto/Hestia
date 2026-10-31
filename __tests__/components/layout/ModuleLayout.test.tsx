import { render, screen, within, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import { usePathname } from "next/navigation";

/**
 * Contrato RED — TASK-015 (Patch v3, navegação em abas).
 *
 * Derivado de: spec.md P4 (CA-P3-05, CA-P3-06, CA-P3-07) + P3 (R8–R10) +
 * tasks.json TASK-015 acceptanceCriteria + plan.md
 * (`isActive = pathname === item.href || pathname.startsWith(item.href + '/')`,
 * estilo ativo `border-b-2 font-semibold` na cor do módulo, D12 transversal).
 *
 * Este teste DEVE falhar antes da implementação de Hefesto (RED): hoje o
 * ModuleLayout não marca aria-current nem estilo de aba ativa.
 */

// Padrão do repo (ver __tests__/app/pluto/months/page.test.tsx e
// __tests__/app/dashboard/page.test.tsx): mock local sobrescreve o mock
// global de __tests__/setup.ts e devolve o pathname por teste.
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockUsePathname = usePathname as Mock;

// navItems espelham components/milon/MilonLayout.tsx (TASK-014, D10)
const milonNavItems = [
  { href: "/milon/exercises", label: "Exercícios" },
  { href: "/milon/programs", label: "Programas" },
];

// navItems espelham components/layout/PlutoLayout.tsx (D12 — transversal)
const plutoNavItems = [
  { href: "/pluto/budget", label: "Orçamento Anual" },
  { href: "/pluto/months", label: "Meses e Períodos" },
  { href: "/pluto/transactions", label: "Lançamentos" },
];

function renderModuleLayout({
  navItems,
  pathname,
  moduleName = "Mílon",
  color = "#B7602B",
}: {
  navItems: { href: string; label: string }[];
  pathname: string;
  moduleName?: string;
  color?: string;
}) {
  mockUsePathname.mockReturnValue(pathname);
  return render(
    <ModuleLayout
      mascot="/mascots/test.png"
      moduleName={moduleName}
      color={color}
      navItems={navItems}
      pageTitle="Título da página"
    >
      <div>Children</div>
    </ModuleLayout>
  );
}

function getNav(): HTMLElement {
  return screen.getByRole("navigation");
}

/** Links da nav do módulo com aria-current="page" (a "aba ativa"). */
function activeLinks(): HTMLElement[] {
  return within(getNav())
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page");
}

/** R8 / AC "exatamente um link tem aria-current='page' em qualquer momento". */
function expectExactlyOneActiveLink(): HTMLElement[] {
  const active = activeLinks();
  expect(active).toHaveLength(1);
  return active;
}

describe("ModuleLayout — aba ativa derivada da URL (TASK-015)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Mílon (CA-P3-05 / CA-P3-06)", () => {
    it("em /milon/exercises, Exercícios tem aria-current='page' + estilo ativo e Programas não", () => {
      renderModuleLayout({ navItems: milonNavItems, pathname: "/milon/exercises" });

      const exercicios = screen.getByRole("link", { name: "Exercícios" });
      const programas = screen.getByRole("link", { name: "Programas" });

      expect(exercicios).toHaveAttribute("aria-current", "page");
      expect(exercicios).toHaveClass("border-b-2");
      expect(exercicios).toHaveClass("font-semibold");

      expect(programas).not.toHaveAttribute("aria-current", "page");
      expect(programas).not.toHaveClass("border-b-2");
    });

    it("em /milon/programs, Programas é a única aba ativa (URL direta, sem clique anterior)", () => {
      renderModuleLayout({ navItems: milonNavItems, pathname: "/milon/programs" });

      const programas = screen.getByRole("link", { name: "Programas" });
      const exercicios = screen.getByRole("link", { name: "Exercícios" });

      const active = expectExactlyOneActiveLink();
      expect(active[0]).toBe(programas);
      expect(programas).toHaveClass("border-b-2");
      expect(programas).toHaveClass("font-semibold");
      expect(exercicios).not.toHaveAttribute("aria-current", "page");
    });

    it("em /milon/exercises, exatamente um link da nav fica com aria-current='page'", () => {
      renderModuleLayout({ navItems: milonNavItems, pathname: "/milon/exercises" });

      const active = expectExactlyOneActiveLink();
      expect(active[0]).toBe(screen.getByRole("link", { name: "Exercícios" }));
    });

    it("match por prefixo + '/': pathname /milon/exercises/abc mantém Exercícios ativa", () => {
      // AC do tasks.json: "match exato ou prefixo + '/'".
      renderModuleLayout({ navItems: milonNavItems, pathname: "/milon/exercises/abc" });

      const active = expectExactlyOneActiveLink();
      expect(active[0]).toBe(screen.getByRole("link", { name: "Exercícios" }));
    });
  });

  describe("Pluto — transversal, sem código condicional por módulo (CA-P3-07 / D12)", () => {
    it.each([
      ["/pluto/budget", "Orçamento Anual"],
      ["/pluto/months", "Meses e Períodos"],
      ["/pluto/transactions", "Lançamentos"],
    ])("em %s, o link %s é o único ativo, pela mesma regra do Mílon", (pathname, activeLabel) => {
      renderModuleLayout({
        navItems: plutoNavItems,
        pathname,
        moduleName: "Pluto",
        color: "#35472D",
      });

      const active = expectExactlyOneActiveLink();
      expect(active[0]).toBe(screen.getByRole("link", { name: activeLabel }));
      expect(active[0]).toHaveClass("border-b-2");
      expect(active[0]).toHaveClass("font-semibold");

      for (const item of plutoNavItems) {
        const link = screen.getByRole("link", { name: item.label });
        if (item.label === activeLabel) continue;
        expect(link).not.toHaveAttribute("aria-current", "page");
        expect(link).not.toHaveClass("border-b-2");
      }
    });
  });

  describe("acessibilidade (AC: tecnologia assistiva identifica a página atual)", () => {
    it("a aba ativa é identificável por tecnologia assistiva via aria-current='page'", () => {
      renderModuleLayout({ navItems: milonNavItems, pathname: "/milon/exercises" });

      const current = within(getNav()).getByRole("link", {
        current: "page",
      });
      expect(current).toHaveTextContent("Exercícios");
    });
  });
});
