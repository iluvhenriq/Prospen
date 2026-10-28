import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { carregarEnvLocal } from "./carregar-env";

// Mede, na base carregada, duas formas de levar o cliente ideal (etapa 9f) para
// a busca: filtrar pelo perfil mantendo a ordem da nota geral (com índice) e
// ordenar por uma nota calculada na hora (sem índice). Só leitura.
// Uso: npx tsx scripts/medir-perfil.ts (--so-filtro mede só a primeira forma)
// Resultado em 28/10/2026, SP: ordenar na hora 30 a 80 s; filtrar 0,1 a 0,6 s
// por cidade ou estado, mas 1,7 a 45 s por atividade (padaria). Nenhuma das
// duas entrou na busca; detalhes em docs/arquitetura.md.
let PORTES = "array['03']";

async function main(): Promise<void> {
  carregarEnvLocal();
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  const db = drizzle(pool, { schema });
  // Exemplo de ajuste: prefere empresas "demais" (médias e grandes) e estabelecidas.
  const ajustada = sql.raw(`(e.pontuacao
    + case emp.porte when '05' then 20 when '01' then -10 else 0 end
    + case when e.data_inicio_atividade < current_date - interval '3 years' then 15 else -10 end)`);
  const medir = async (nome: string, filtro: string) => {
    const inicio = performance.now();
    const resultado = await db.execute(sql`
      select e.cnpj, ${ajustada} as nota
      from base_cnpj_estabelecimentos e
      left join base_cnpj_empresas emp on emp.cnpj_basico = e.cnpj_basico
      where e.uf = 'SP' and ${sql.raw(filtro)}
        and emp.natureza_juridica is distinct from '2135'
      order by nota desc, e.cnpj
      limit 51`);
    console.log(`${nome}: ${resultado.rows.length} linhas em ${Math.round(performance.now() - inicio)} ms`);
  };
  try {
    const padaria = await db.execute(sql`select codigo from base_cnpj_cnaes where descricao ilike '%padaria%'`);
    const codigos = padaria.rows.map((linha) => `'${String(linha.codigo).replace(/'/g, "")}'`).join(",");
    const capital = await db.execute(sql`select codigo from base_cnpj_municipios where nome = 'SAO PAULO' and uf = 'SP'`);
    const codigoCapital = String(capital.rows[0]?.codigo ?? "").replace(/'/g, "");
    const franca = await db.execute(sql`select codigo from base_cnpj_municipios where nome = 'FRANCA' and uf = 'SP'`);
    const codigoFranca = String(franca.rows[0]?.codigo ?? "").replace(/'/g, "");
    // Alternativa: filtrar pelo perfil e manter a ordem da nota geral (com índice).
    const filtrar = async (nome: string, filtro: string) => {
      const inicio = performance.now();
      const resultado = await db.execute(sql`
        select e.cnpj
        from base_cnpj_estabelecimentos e
        left join base_cnpj_empresas emp on emp.cnpj_basico = e.cnpj_basico
        where e.uf = 'SP' and ${sql.raw(filtro)}
          and emp.natureza_juridica is distinct from '2135'
          and emp.porte = any(${sql.raw(PORTES)})
          and e.data_inicio_atividade <= current_date - interval '3 years'
        order by e.pontuacao desc nulls last, e.cnpj
        limit 51`);
      console.log(`filtro ${nome}: ${resultado.rows.length} linhas em ${Math.round(performance.now() - inicio)} ms`);
    };
    for (const porte of ["array['03']", "array['05']", "array['01','03']"]) {
      PORTES = porte;
      for (let rodada = 1; rodada <= 2; rodada += 1) {
        console.log(`--- filtro, portes ${porte}, rodada ${rodada}`);
        await filtrar("padaria em SP", `e.cnae_principal in (${codigos})`);
        await filtrar("tudo em Franca", `e.municipio_codigo = '${codigoFranca}'`);
        await filtrar("tudo na capital", `e.municipio_codigo = '${codigoCapital}'`);
        await filtrar("SP inteiro", "true");
      }
    }
    if (process.argv.includes("--so-filtro")) return;
    for (let rodada = 1; rodada <= 2; rodada += 1) {
      console.log(`--- rodada ${rodada}`);
      await medir("padaria em SP", `e.cnae_principal in (${codigos})`);
      await medir("padaria na capital", `e.cnae_principal in (${codigos}) and e.municipio_codigo = '${codigoCapital}'`);
      await medir("tudo em Franca", `e.municipio_codigo = '${codigoFranca}'`);
      await medir("tudo na capital", `e.municipio_codigo = '${codigoCapital}'`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
