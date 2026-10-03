import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./__tests__/setup.ts",
    // Integração real (item 8) tem config própria — fora da suite unitária.
    exclude: ["**/node_modules/**", "**/dist/**", "__tests__/integration/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "app/**/*.tsx",
        "components/**/*.tsx",
        "lib/**/*.ts",
        "utils/**/*.ts",
      ],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.*",
        "**/*.stories.*",
        "**/storybook-static/**",
        "**/coverage/**",
        "**/__tests__/setup.ts",
        "**/vitest.*.config.ts",
        "**/next.config.ts",
        "**/postcss.config.*",
        "**/tailwind.config.*",
        "**/proxy.ts",
        "app/layout.tsx",
        "app/page.tsx",
        "app/*/layout.tsx",
        "app/login/login-form.tsx",
        "components/layout/BaseLayout.tsx",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});