import { execSync, spawn } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CABECALHOS_DE_SEGURANCA, PASTA_DA_PAGINA_ESTATICA } from "../next.config";

// Gera a versão estática da página inicial (modo pré-venda, sem servidor) e,
// com --publicar, manda para https://prospen.pages.dev (Cloudflare Pages,
// projeto "prospen", o mesmo da antiga página de pré-venda dos vídeos).
//   npm run pagina:exportar              (gera em pagina-estatica/)
//   npm run pagina:exportar -- --publicar
// Leva a página inicial, a política de privacidade e os termos. O resto do app
// fica de fora: sem servidor, nada de pré-cadastro, login ou remoção por
// formulário (vira e-mail, veja src/lib/pre-venda.ts).
const PORTA = 3999;
const SAIDA = "pagina-estatica";
const PAGINAS = ["/", "/privacidade", "/termos"];
const env = { ...process.env, MODO_PRE_VENDA: "1", PAGINA_ESTATICA: "1", NODE_ENV: "production" as const };

execSync("npx next build", { stdio: "inherit", env });

const servidor = spawn("npx", ["next", "start", "-p", String(PORTA)], { stdio: "ignore", shell: true, env });
const base = `http://localhost:${PORTA}`;

async function esperarServidor(): Promise<void> {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {
      // ainda ligando
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("O servidor local não respondeu em 60 segundos.");
}

async function baixar(caminho: string, destino: string): Promise<string> {
  const resposta = await fetch(base + caminho);
  if (!resposta.ok) throw new Error(`${caminho}: ${resposta.status}`);
  const conteudo = Buffer.from(await resposta.arrayBuffer());
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, conteudo);
  return conteudo.toString("utf8");
}

async function exportar(): Promise<void> {
  rmSync(SAIDA, { recursive: true, force: true });
  // Arquivos públicos (ícones do manifesto) e, inteiros, os scripts e estilos do build.
  cpSync("public", SAIDA, { recursive: true });
  cpSync(join(PASTA_DA_PAGINA_ESTATICA, "static"), join(SAIDA, "_next", "static"), { recursive: true });

  const arquivos = new Set<string>();
  for (const pagina of PAGINAS) {
    const html = await baixar(pagina, join(SAIDA, pagina === "/" ? "index.html" : `${pagina}.html`));
    // Ícones, manifesto e imagens citados no HTML (o que não é /_next).
    for (const [, endereco] of html.matchAll(/(?:href|src)="(\/(?!\/|_next)[^"#?]*)/g)) {
      if (!PAGINAS.includes(endereco)) arquivos.add(endereco);
    }
  }
  for (const arquivo of arquivos) await baixar(arquivo, join(SAIDA, arquivo));

  // Os mesmos cabeçalhos de segurança do app (next.config.ts).
  const linhas = CABECALHOS_DE_SEGURANCA.map((c) => `  ${c.key}: ${c.value}`).join("\n");
  writeFileSync(join(SAIDA, "_headers"), `/*\n${linhas}\n`);
  console.log(`\nPágina estática em ${SAIDA}/ (${PAGINAS.length} páginas, ${arquivos.size} arquivos extras).`);
}

async function principal(): Promise<number> {
  try {
    await esperarServidor();
    await exportar();
    if (process.argv.includes("--publicar")) {
      execSync(`npx wrangler pages deploy ${SAIDA} --project-name prospen --branch main --commit-dirty=true`, { stdio: "inherit" });
    }
    return 0;
  } catch (erro) {
    console.error(erro instanceof Error ? erro.message : erro);
    return 1;
  } finally {
    // No Windows, o "npx" abre um processo filho: derruba a árvore inteira.
    if (process.platform === "win32" && servidor.pid) execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: "ignore" });
    else servidor.kill();
  }
}
principal().then((codigo) => process.exit(codigo));
