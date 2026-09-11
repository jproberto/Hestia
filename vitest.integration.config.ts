import { defineConfig } from "vitest/config";
import path from "path";

// Suite de integração (item 8): contracts contra Supabase real efêmero.
// Roda SÓ no CI via `npm run test:integration` — sem setupFiles para que
// os mocks globais da suite unitária (Supabase, next/navigation) não vazem.
export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/integration/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
