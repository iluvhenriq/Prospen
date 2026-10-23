import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { gravarCnaesDaPasta } from "../src/modules/base-cnpj/importacao";
import { repositorioBaseCnpj } from "../src/modules/base-cnpj/repositorio";
import { carregarEnvLocal } from "./carregar-env";

// Grava as atividades e registra um estado JÁ carregado (cidades e mês), sem
// importar de novo. Serve para cargas feitas antes da tela de busca (SP, 5c).
// A importação normal já faz isso sozinha no final.
//   npm run cnpj:registrar -- 2026-10 SP
async function main(): Promise<void> {
  carregarEnvLocal();
  const [mes, ufInformada] = process.argv.slice(2);
  const uf = (ufInformada ?? "").toUpperCase();
  if (!/^\d{4}-\d{2}$/.test(mes ?? "") || !/^[A-Z]{2}$/.test(uf)) {
    throw new Error("Use: npm run cnpj:registrar -- AAAA-MM UF (exemplo: 2026-10 SP)");
  }
  const pasta = join(process.env.CNPJ_PASTA_DADOS || "D:\\prospen-dados\\cnpj", mes);
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    const repositorio = repositorioBaseCnpj(drizzle(pool, { schema }));
    await gravarCnaesDaPasta(repositorio, pasta);
    await repositorio.registrarCarga(uf, mes);
    console.log(`Registrado: ${uf}, mês ${mes}, ${await repositorio.contarEstabelecimentos(uf)} estabelecimentos.`);
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao registrar:", explicarErroBanco(erro));
  process.exit(1);
});
