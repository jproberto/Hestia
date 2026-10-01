import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MilonLayout } from "@/components/milon/MilonLayout";

describe("MilonLayout", () => {
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

  // Patch v3 (navegação) — TASK-014 / critérios: milonNavItems com exatamente
  // 2 abas passadas ao ModuleLayout. CA-P3-04 (exatamente 2 links) +
  // rótulos/rotas exatos (CA-P3-05 / itens 1 e 2 do tasks.json).
  describe("barra de navegação do módulo (TASK-014)", () => {
    const renderLayout = () =>
      render(
        <MilonLayout pageTitle="Test" pageSubtitle="Subtitle">
          <div>Children</div>
        </MilonLayout>
      );

    it("exibe exatamente 2 links na navegação do módulo, sem itens extras", () => {
      renderLayout();

      const nav = screen.getByRole("navigation", {
        name: "Navegação do módulo Mílon",
      });
      const links = within(nav).getAllByRole("link");

      expect(links).toHaveLength(2);
    });

    it("cada link é navegável com rótulo e rota exatos (Exercícios e Programas)", () => {
      renderLayout();

      const nav = screen.getByRole("navigation", {
        name: "Navegação do módulo Mílon",
      });
      const exercicios = within(nav).getByRole("link", { name: "Exercícios" });
      const programas = within(nav).getByRole("link", { name: "Programas" });

      expect(exercicios).toHaveAttribute("href", "/milon/exercises");
      expect(programas).toHaveAttribute("href", "/milon/programs");

      const hrefs = within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"));
      expect(new Set(hrefs)).toEqual(
        new Set(["/milon/exercises", "/milon/programs"])
      );
    });
  });
});
