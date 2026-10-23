import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { repositorioBaseCnpj } from "../src/modules/base-cnpj/repositorio";
import { cnpjValido, normalizarCnpj } from "../src/modules/leads/cnpj";
import { carregarEnvLocal } from "./carregar-env";

// Pedido do titular para sair da base pública (LGPD). O CNPJ some da busca
// para todas as empresas e não volta em importações futuras. Leads que alguma
// empresa já criou com ele NÃO são apagados por aqui.
//   npm run cnpj:excluir -- 11.222.333/0001-81
async function main(): Promise<void> {
  carregarEnvLocal();
  const cnpj = normalizarCnpj(process.argv[2]);
  if (!cnpj || !cnpjValido(cnpj)) throw new Error("Use: npm run cnpj:excluir -- CNPJ (com ou sem pontuação)");
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    await repositorioBaseCnpj(drizzle(pool, { schema })).excluirCnpj(cnpj);
    console.log(`CNPJ ${cnpj} na lista de exclusão.`);
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao excluir:", explicarErroBanco(erro));
  process.exit(1);
});
