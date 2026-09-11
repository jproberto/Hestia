import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables
vi.stubGlobal("process", {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  },
});

// Mock Supabase client
vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "test@example.com" } } }),
      signOut: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: { email: "test@example.com" } }, error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }), single: () => Promise.resolve({ data: null, error: null }) }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

// Mock central do client de banco do browser (task 49/TST-001): todos os
// testes de página/hooks usam este shape com defaults — sem copiar factory.
// Testes que precisam de outro comportamento sobrescrevem via
// vi.mocked(createBrowserDatabaseClient).mockReturnValue/mockReturnValueOnce.
// (__tests__/lib/shared/supabaseClient.test.ts usa o módulo real + vi.unmock.)
vi.mock("@/lib/shared/supabaseClient", () => ({
  createBrowserDatabaseClient: vi.fn(() => ({
    from: () => { throw new Error("use mocked db barrels in tests"); },
    getUserEmail: () => Promise.resolve("teste@hestia.com"),
  })),
}));