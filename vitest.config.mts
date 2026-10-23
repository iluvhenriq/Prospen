import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Os testes de banco rodam as migrações no PGlite, que fica lento com o
    // computador ocupado. Uma falha intermitente apareceu com o padrão (5 s).
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
