import { describe, it, expect, vi, beforeEach } from "vitest";

// Usa o módulo REAL (não o mock central do setup.ts).
vi.unmock("@/lib/shared/supabaseClient");

// Usa o módulo REAL (não mockado): o setup global já define
// NEXT_PUBLIC_SUPABASE_URL/ANON_KEY p/ localhost, e a construção do client
// não faz rede — só a identidade do singleton é assertada aqui.
describe("createBrowserDatabaseClient (singleton por aba, task 47)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("retorna a mesma instância dentro da sessão", async () => {
    const { createBrowserDatabaseClient } = await import("@/lib/shared/supabaseClient");
    expect(createBrowserDatabaseClient()).toBe(createBrowserDatabaseClient());
  });
});
