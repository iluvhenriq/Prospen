import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { exportarDadosDaConta } from "../src/modules/contas/titular";
import { carregarEnvLocal } from "./carregar-env";

// Pedido do titular (LGPD, art. 18, II e V): mostra, em JSON, tudo o que o
// PROSPEN guarda sobre a pessoa como usuária. Confira a identidade de quem
// pediu ANTES de rodar e envie a resposta só para o e-mail da própria conta.
//   npm run conta:exportar -- pessoa@empresa.com.br > dados.json
async function main(): Promise<void> {
  carregarEnvLocal();
  const email = process.argv[2];
  if (!email || !email.includes("@")) throw new Error("Use: npm run conta:exportar -- e-mail-da-conta");
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    const dados = await exportarDadosDaConta(drizzle(pool, { schema }), email);
    if (!dados) {
      console.error("Nenhuma conta com este e-mail.");
      process.exit(2);
    }
    console.log(JSON.stringify(dados, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao exportar:", explicarErroBanco(erro));
  process.exit(1);
});
