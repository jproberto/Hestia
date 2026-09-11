import { describe, it, expect } from "vitest";

describe("Sanity Check", () => {
  it("deve executar testes matemáticos básicos", () => {
    expect(1 + 1).toBe(2);
  });

  it("deve renderizar um elemento virtual no DOM", () => {
    const div = document.createElement("div");
    div.textContent = "Hestia";
    document.body.appendChild(div);
    expect(div).toHaveTextContent("Hestia");
    document.body.removeChild(div);
  });
});
