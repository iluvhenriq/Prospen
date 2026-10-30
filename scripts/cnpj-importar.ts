import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { importarEstados, UFS_DO_BRASIL } from "../src/modules/base-cnpj/importacao";
import { repositorioBaseCnpj } from "../src/modules/base-cnpj/repositorio";
import { carregarEnvLocal } from "./carregar-env";

// Carrega estados da base pública de CNPJ no banco, a partir dos arquivos
// baixados com `npm run cnpj:baixar`.
//   npm run cnpj:importar -- 2026-10 SP
//   npm run cnpj:importar -- 2026-10 RJ,MG
//   npm run cnpj:importar -- 2026-10 BR      (o Brasil todo numa leitura só)
// Pode ser rodado de novo: apaga os estados e carrega outra vez.
async function main(): Promise<void> {
  carregarEnvLocal();
  const [mes, ufsInformadas] = process.argv.slice(2);
  const texto = (ufsInformadas ?? "").toUpperCase();
  const ufs = texto === "BR" ? [...UFS_DO_BRASIL] : [...new Set(texto.split(",").map((uf) => uf.trim()))];
  const desconhecidas = ufs.filter((uf) => !(UFS_DO_BRASIL as readonly string[]).includes(uf));
  if (!/^\d{4}-\d{2}$/.test(mes ?? "") || ufs.length === 0 || desconhecidas.length > 0) {
    throw new Error(
      "Use: npm run cnpj:importar -- AAAA-MM UF (exemplos: 2026-10 SP, 2026-10 RJ,MG ou 2026-10 BR)" +
        (desconhecidas.length > 0 && texto ? `. Estado desconhecido: ${desconhecidas.join(", ")}` : ""),
    );
  }
  const pasta = join(process.env.CNPJ_PASTA_DADOS || "D:\\prospen-dados\\cnpj", mes);

  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    const repositorio = repositorioBaseCnpj(drizzle(pool, { schema }));
    console.log(`Importando ${ufs.length === UFS_DO_BRASIL.length ? "o Brasil todo" : ufs.join(", ")}, mês ${mes}, de ${pasta}`);
    const resumo = await importarEstados({ repositorio, pasta, mes, ufs, avisar: console.log });
    console.log("Concluído:", resumo);
    const porEstado = await repositorio.contarPorEstado(ufs);
    for (const uf of ufs) console.log(`  ${uf}: ${porEstado.get(uf) ?? 0} estabelecimentos no banco.`);
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha na importação:", explicarErroBanco(erro));
  process.exit(1);
});
