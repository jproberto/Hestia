import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MilonExample } from "@/components/milon/MilonExample";

describe("MilonExample", () => {
  it("renderiza o nome", () => {
    render(<MilonExample name="Meu item" />);
    expect(screen.getByText("Meu item")).toBeInTheDocument();
  });
});
