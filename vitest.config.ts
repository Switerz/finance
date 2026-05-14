import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "lib/formatters/**",
        "lib/imports/normalize.ts",
        "lib/validations/**",
        "lib/queries/**",
        "lib/actions/**"
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
});
