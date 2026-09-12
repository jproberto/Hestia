import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MilonPage from "@/app/milon/page";

describe("Milon module - app", () => {
  it("should render page without crashing", () => {
    render(<MilonPage />);
    expect(screen.getByText(/módulo Mílon criado com sucesso/i)).toBeInTheDocument();
  });
});
