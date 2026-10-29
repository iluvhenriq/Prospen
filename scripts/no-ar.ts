import { execFileSync, execSync, spawn, type ChildProcess } from "node:child_process";
import { lerEnvEmail } from "../src/lib/env";
import { carregarEnvLocal } from "./carregar-env";

// Coloca o app no ar a partir deste computador, de graça, com o túnel rápido
// da Cloudflare (sem conta e sem domínio). Para os primeiros testes e
// fundadores, enquanto não há servidor contratado.
//   npm run no-ar                  (gera a versão de produção e liga)
//   npm run no-ar -- --sem-build   (liga a última versão gerada)
// Limites: o app só fica no ar com o computador ligado, e o endereço muda a
// cada vez que o comando roda. O banco não fica exposto: só a porta do app.
const PORTA = 3000;
const argumentos = process.argv.slice(2);

carregarEnvLocal();

if (process.env.MODO_PRE_VENDA === "1") {
  console.error("MODO_PRE_VENDA=1 no .env.local: o app ficaria fechado. Tire essa linha antes de colocar no ar.");
  process.exit(1);
}

// Sem SMTP, quem cria conta não recebe o link de confirmação e fica preso.
if (lerEnvEmail().tipo !== "smtp") {
  console.error(
    "O envio de e-mail não está configurado (SMTP_HOST no .env.local). Sem ele, ninguém de fora consegue confirmar a conta.\n" +
      "Passo a passo do Gmail no .env.example.",
  );
  process.exit(1);
}

// O instalador do Windows (winget) nem sempre põe o cloudflared no PATH:
// procura também na pasta onde ele instala.
function acharCloudflared(): string | null {
  const candidatos = ["cloudflared", "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe", "C:\\Program Files\\cloudflared\\cloudflared.exe"];
  for (const candidato of candidatos) {
    try {
      execFileSync(candidato, ["--version"], { stdio: "ignore" });
      return candidato;
    } catch {
      // tenta o próximo
    }
  }
  return null;
}
const cloudflared = acharCloudflared();
if (!cloudflared) {
  console.error("O cloudflared não está instalado. Instale com:\n  winget install --id Cloudflare.cloudflared\nDepois feche e abra o terminal.");
  process.exit(1);
}

if (!argumentos.includes("--sem-build")) execSync("npx next build", { stdio: "inherit" });

let servidor: ChildProcess | null = null;
const tunel = spawn(cloudflared, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${PORTA}`], {
  stdio: ["ignore", "pipe", "pipe"],
});

// O endereço público só aparece na saída do cloudflared. Com ele em mãos, liga
// o app sabendo o próprio endereço (APP_URL vai nos links dos e-mails).
function procurarEndereco(pedaco: Buffer): void {
  const endereco = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(pedaco.toString())?.[0];
  if (!endereco || servidor) return;
  servidor = spawn("npx", ["next", "start", "-p", String(PORTA)], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, APP_URL: endereco, NODE_ENV: "production" },
  });
  servidor.on("exit", (codigo) => encerrar(codigo ?? 0));
  console.log(`\n  PROSPEN no ar: ${endereco}\n  Mande este endereço para quem for testar. Para desligar: Ctrl+C.\n`);
}
tunel.stdout?.on("data", procurarEndereco);
tunel.stderr?.on("data", procurarEndereco);
tunel.on("exit", (codigo) => {
  console.error("O túnel caiu. Rode o comando de novo (o endereço vai mudar).");
  encerrar(codigo ?? 1);
});

function encerrar(codigo: number): void {
  tunel.kill();
  servidor?.kill();
  process.exit(codigo);
}
process.on("SIGINT", () => encerrar(0));
