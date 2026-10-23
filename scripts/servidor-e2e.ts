import { execSync, spawn } from "node:child_process";
import { PORTA_E2E } from "../e2e/ambiente";

// Sobe o servidor dos testes de navegador, chamado pelo playwright.config.ts:
// 1. recria o banco de testes e aplica as migrações;
// 2. gera a versão de produção;
// 3. liga o servidor na porta dos testes.
// Tudo num script só, em ordem: se uma parte falhar, as seguintes não rodam.
function rodar(comando: string): void {
  execSync(comando, { stdio: "inherit" });
}

rodar("npx tsx scripts/preparar-banco-e2e.ts");
rodar("npx next build");

const servidor = spawn("npx", ["next", "start", "-p", String(PORTA_E2E)], {
  stdio: "inherit",
  shell: true,
});
servidor.on("exit", (codigo) => process.exit(codigo ?? 0));
