import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { gravarCnaesDaPasta } from "../src/modules/base-cnpj/importacao";
import { repositorioBaseCnpj } from "../src/modules/base-cnpj/repositorio";
import { carregarEnvLocal } from "./carregar-env";

// Grava as atividades, recalcula a pontuação e registra um estado JÁ
// carregado (cidades e mês), sem importar de novo. Serve para cargas feitas
// antes de uma mudança nas regras de pontuação ou na tela de busca.
// A importação normal já faz tudo isso sozinha no final.
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
    // Mesmo caminho do fim da importação: copia o estado para a tabela
    // temporária e o regrava de uma vez, já com a pontuação.
    console.log("Recalculando a pontuação...");
    await repositorio.prepararCarga();
    try {
      await repositorio.copiarEstadoParaCarga(uf);
      await repositorio.removerIndicesDeBusca();
      try {
        await repositorio.concluirCarga(uf);
      } finally {
        console.log("Recriando os índices de busca...");
        await repositorio.recriarIndicesDeBusca();
      }
    } finally {
      await repositorio.descartarCarga();
    }
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
