import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { repositorioBaseCnpj } from "../src/modules/base-cnpj/repositorio";
import { carregarEnvLocal } from "./carregar-env";

// Mede, na base carregada, o tempo das consultas de recém-abertas (etapa 9e).
// Só leitura. Uso: npx tsx scripts/medir-recentes.ts
async function main(): Promise<void> {
  carregarEnvLocal();
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  const base = repositorioBaseCnpj(drizzle(pool, { schema }));
  const desde = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const medir = async (nome: string, consulta: () => Promise<unknown[]>) => {
    const inicio = performance.now();
    const linhas = await consulta();
    console.log(`${nome}: ${linhas.length} linhas em ${Math.round(performance.now() - inicio)} ms`);
  };
  try {
    const padaria = (await base.atividadesPorPalavras("padaria")).map((a) => a.codigo);
    const municipios = await base.municipiosDoEstado("SP");
    const capital = municipios.find((m) => m.nome === "SAO PAULO")?.codigo;
    const franca = municipios.find((m) => m.nome === "FRANCA")?.codigo;
    for (let rodada = 1; rodada <= 2; rodada += 1) {
      console.log(`--- rodada ${rodada}`);
      await medir("contar: padaria em SP", () => base.cnpjsAbertosDesde({ uf: "SP", atividades: padaria, semMei: true }, desde, 501));
      await medir("contar: tudo na capital", () => base.cnpjsAbertosDesde({ uf: "SP", municipio: capital, semMei: true }, desde, 501));
      await medir("contar: tudo em Franca", () => base.cnpjsAbertosDesde({ uf: "SP", municipio: franca, semMei: true }, desde, 501));
      await medir("busca: recentes em SP inteiro", () => base.buscar({ uf: "SP", semMei: true, abertasDesde: desde }, null, 51));
      await medir("busca: padaria recentes em SP", () => base.buscar({ uf: "SP", atividades: padaria, semMei: true, abertasDesde: desde }, null, 51));
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
