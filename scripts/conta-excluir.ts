import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { excluirConta } from "../src/modules/contas/titular";
import { carregarEnvLocal } from "./carregar-env";

// Pedido do titular (LGPD, art. 18, VI): apaga a conta e as empresas em que a
// pessoa era a única integrante, com todos os dados delas. NÃO TEM VOLTA.
// Confira a identidade de quem pediu antes. Sem --confirmar, não apaga nada.
//   npm run conta:excluir -- pessoa@empresa.com.br --confirmar
async function main(): Promise<void> {
  carregarEnvLocal();
  const email = process.argv[2];
  const confirmado = process.argv.includes("--confirmar");
  if (!email || !email.includes("@")) throw new Error("Use: npm run conta:excluir -- e-mail-da-conta --confirmar");
  if (!confirmado) {
    console.log("Nada foi apagado. A exclusão não tem volta: rode de novo com --confirmar.");
    return;
  }
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    const resultado = await excluirConta(drizzle(pool, { schema }), email);
    if (!resultado.ok) {
      console.error("Nenhuma conta com este e-mail.");
      process.exit(2);
    }
    console.log("Conta apagada.");
    console.log(`Empresas apagadas com todos os dados: ${resultado.empresasApagadas.join(", ") || "nenhuma"}.`);
    console.log(`Empresas mantidas (têm outras pessoas): ${resultado.empresasMantidas.join(", ") || "nenhuma"}.`);
    console.log("Os registros de acesso ficam até completar 6 meses (Marco Civil) e somem sozinhos.");
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao excluir:", explicarErroBanco(erro));
  process.exit(1);
});
