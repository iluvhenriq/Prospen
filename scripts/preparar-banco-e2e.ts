import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { urlDoBancoE2E } from "../e2e/ambiente";
import { explicarErroBanco } from "../src/lib/erros-banco";

// Apaga e recria o banco dos testes de navegador e aplica as migrações.
// Roda sozinho no começo de `npm run test:e2e`. Por segurança, só aceita
// bancos cujo nome termina em _e2e.
async function main(): Promise<void> {
  const url = new URL(urlDoBancoE2E());
  const nome = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*_e2e$/.test(nome)) {
    throw new Error(`Nome de banco inesperado para os testes: "${nome}". Nada foi apagado.`);
  }

  // Conecta no banco padrão do PostgreSQL para poder apagar e criar o de testes.
  const padrao = new URL(url);
  padrao.pathname = "/postgres";
  const administrador = new Pool({ connectionString: padrao.toString() });
  try {
    await administrador.query(`drop database if exists "${nome}" with (force)`);
    await administrador.query(`create database "${nome}"`);
  } finally {
    await administrador.end();
  }

  const pool = new Pool({ connectionString: url.toString() });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./src/db/migrations" });
  } finally {
    await pool.end();
  }
  console.log(`Banco "${nome}" pronto para os testes de navegador.`);
}

main().catch((erro: unknown) => {
  console.error("Falha ao preparar o banco dos testes:", explicarErroBanco(erro));
  process.exit(1);
});
