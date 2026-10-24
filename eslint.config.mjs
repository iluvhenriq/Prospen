import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Relatório e resultados gerados pelos testes de navegador.
    "e2e-relatorio/**",
    "e2e-resultados/**",
    // Capturas, registros e roteiros do teste manual com o Playwright MCP.
    ".playwright-mcp/**",
  ]),
]);

export default eslintConfig;
