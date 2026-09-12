import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
