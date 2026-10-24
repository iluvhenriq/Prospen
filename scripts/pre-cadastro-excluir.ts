import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { repositorioPreCadastros } from "../src/modules/pre-cadastro/repositorio";
import { carregarEnvLocal } from "./carregar-env";

// Pedido para sair da lista de pré-cadastro (LGPD, art. 18). Confira que o
// pedido veio do próprio e-mail.
//   npm run pre-cadastro:excluir -- pessoa@empresa.com.br
async function main(): Promise<void> {
  carregarEnvLocal();
  const email = process.argv[2];
  if (!email || !email.includes("@")) throw new Error("Use: npm run pre-cadastro:excluir -- e-mail");
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    const apagou = await repositorioPreCadastros(drizzle(pool, { schema })).excluir(email);
    console.log(apagou ? "Pré-cadastro apagado." : "Nenhum pré-cadastro com este e-mail.");
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao excluir:", explicarErroBanco(erro));
  process.exit(1);
});
