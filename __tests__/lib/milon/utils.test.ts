import { describe, it, expect } from "vitest";
import { exampleUtil } from "@/lib/milon/utils";

describe("Milon module - utils", () => {
  it("exampleUtil responde", () => {
    expect(exampleUtil()).toContain("Mílon");
  });
});
