import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic"
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  test: {
    globals: true,
    include: [
      "src/**/*.spec.ts",
      "src/**/*.spec.tsx"
    ],
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"]
  }
});
