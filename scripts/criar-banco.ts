import { Pool } from "pg";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { lerEnv } from "../src/lib/env";
import { carregarEnvLocal } from "./carregar-env";

// Cria o banco indicado na DATABASE_URL, se ele ainda não existir.
async function main(): Promise<void> {
  carregarEnvLocal();
  const url = new URL(lerEnv().DATABASE_URL);
  const nome = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nome)) {
    throw new Error(
      "O nome do banco na DATABASE_URL deve ter só letras, números e _ (exemplo: prospen).",
    );
  }

  // Conecta no banco padrão do PostgreSQL para poder criar o nosso.
  url.pathname = "/postgres";
  const pool = new Pool({ connectionString: url.toString() });
  try {
    const existe = await pool.query(
      "select 1 from pg_database where datname = $1",
      [nome],
    );
    if (existe.rowCount) {
      console.log(`O banco "${nome}" já existe. Nada a fazer.`);
    } else {
      await pool.query(`create database "${nome}"`);
      console.log(`Banco "${nome}" criado com sucesso.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao criar o banco:", explicarErroBanco(erro));
  process.exit(1);
});
