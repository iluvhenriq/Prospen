import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { repositorioPreCadastros } from "../src/modules/pre-cadastro/repositorio";
import { carregarEnvLocal } from "./carregar-env";

// Lista os pré-cadastros da pré-venda em CSV (nome;email;empresa;data).
// Os dados são pessoais: não compartilhe o arquivo e apague cópias que não
// usar mais. Use só para avisar sobre a abertura e a pré-venda.
//   npm run pre-cadastro:listar > pre-cadastros.csv
function celula(valor: string | null): string {
  const texto = valor ?? "";
  // Neutraliza fórmulas do Excel (=, +, -, @) e escapa aspas.
  const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replaceAll('"', '""')}"`;
}

async function main(): Promise<void> {
  carregarEnvLocal();
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    const linhas = await repositorioPreCadastros(drizzle(pool, { schema })).listar();
    console.log("nome;email;empresa;data");
    for (const linha of linhas) {
      console.log([linha.nome, linha.email, linha.empresa, linha.criadoEm.toISOString()].map(celula).join(";"));
    }
    console.error(`${linhas.length} pré-cadastro(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao listar:", explicarErroBanco(erro));
  process.exit(1);
});
