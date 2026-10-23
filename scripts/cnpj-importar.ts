import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { importarEstado } from "../src/modules/base-cnpj/importacao";
import { repositorioBaseCnpj } from "../src/modules/base-cnpj/repositorio";
import { carregarEnvLocal } from "./carregar-env";

// Carrega um estado da base pública de CNPJ no banco, a partir dos arquivos
// baixados com `npm run cnpj:baixar`.
//   npm run cnpj:importar -- 2026-10 SP
// Pode ser rodado de novo: apaga o estado e carrega outra vez.
async function main(): Promise<void> {
  carregarEnvLocal();
  const [mes, ufInformada] = process.argv.slice(2);
  const uf = (ufInformada ?? "").toUpperCase();
  if (!/^\d{4}-\d{2}$/.test(mes ?? "") || !/^[A-Z]{2}$/.test(uf)) {
    throw new Error("Use: npm run cnpj:importar -- AAAA-MM UF (exemplo: 2026-10 SP)");
  }
  const pasta = join(process.env.CNPJ_PASTA_DADOS || "D:\\prospen-dados\\cnpj", mes);

  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    const repositorio = repositorioBaseCnpj(drizzle(pool, { schema }));
    console.log(`Importando ${uf}, mês ${mes}, de ${pasta}`);
    const resumo = await importarEstado({ repositorio, pasta, mes, uf, avisar: console.log });
    console.log("Concluído:", resumo);
    console.log(`No banco agora: ${await repositorio.contarEstabelecimentos(uf)} estabelecimentos de ${uf}.`);
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha na importação:", explicarErroBanco(erro));
  process.exit(1);
});
