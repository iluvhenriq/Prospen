import { defineConfig } from "@playwright/test";
import { URL_E2E, urlDoBancoE2E } from "./e2e/ambiente";

// Testes de navegador: rodam contra a versão de produção (build + start) na
// porta 3100, com um banco só deles. Não atrapalham o `npm run dev` na 3000.
export default defineConfig({
  testDir: "./e2e",
  // Um teste por vez: o servidor limita cadastros por endereço (10 por hora)
  // e cada teste cria as próprias contas.
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  outputDir: "e2e-resultados",
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-relatorio" }]],
  use: {
    baseURL: URL_E2E,
    // Usa o Chrome instalado no computador, sem baixar outro navegador.
    channel: "chrome",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx tsx scripts/servidor-e2e.ts",
    url: `${URL_E2E}/api/saude`,
    // Mostra a saída do servidor (preparo do banco, build), útil quando algo falha.
    stdout: "pipe",
    reuseExistingServer: false,
    timeout: 300_000,
    env: { DATABASE_URL: urlDoBancoE2E(), APP_URL: URL_E2E },
  },
});
