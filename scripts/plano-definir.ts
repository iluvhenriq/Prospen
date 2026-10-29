import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { EMPRESAS_SEM_PAGAMENTO, PLANOS, planoValido, REGRAS, VAGAS_DE_FUNDADOR } from "../src/modules/planos/planos";
import { fundadoresUsados, repositorioPlano } from "../src/modules/planos/repositorio";
import { carregarEnvLocal } from "./carregar-env";

// Libera o plano de uma empresa depois de conferir o pagamento (liberação
// manual, decisão de 28/10/2026). A empresa é a do DONO com este e-mail.
//   npm run plano:definir -- dono@empresa.com.br            (só mostra o plano atual)
//   npm run plano:definir -- dono@empresa.com.br grande
//   npm run plano:definir -- dono@empresa.com.br medio --fundador
async function main(): Promise<void> {
  carregarEnvLocal();
  const [email, plano, ...resto] = process.argv.slice(2);
  if (!email || !email.includes("@")) {
    throw new Error(`Use: npm run plano:definir -- e-mail-do-dono [${PLANOS.join("|")}] [--fundador]`);
  }
  if (plano !== undefined && !planoValido(plano)) throw new Error(`Plano desconhecido. Use: ${PLANOS.join(", ")}.`);
  const fundador = resto.includes("--fundador");

  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    const db = drizzle(pool, { schema });
    const [empresa] = await db
      .select({ id: schema.organization.id, nome: schema.organization.name })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
      .where(and(eq(schema.user.email, email.trim().toLowerCase()), eq(schema.member.role, "owner")))
      .limit(1);
    if (!empresa) {
      console.error("Nenhuma empresa tem um dono com este e-mail.");
      process.exit(2);
    }

    const repositorio = repositorioPlano(db, empresa.id);
    const atual = await repositorio.obter();
    console.log(`${empresa.nome}: plano ${atual.plano}${atual.gravado ? "" : ` (padrão, nada gravado: ${EMPRESAS_SEM_PAGAMENTO} empresas/mês até liberar)`}${atual.fundador ? ", fundador" : ""}.`);
    if (plano === undefined) return;

    if (fundador && !atual.fundador) {
      if ((await fundadoresUsados(db)) >= VAGAS_DE_FUNDADOR) {
        throw new Error(`As ${VAGAS_DE_FUNDADOR} vagas de fundador já foram usadas.`);
      }
    }
    // Quem já é fundador continua fundador ao trocar de plano.
    await repositorio.definir(plano, fundador || atual.fundador);
    const regras = REGRAS[plano];
    console.log(
      `Agora: plano ${plano}${fundador || atual.fundador ? ", fundador" : ""}. ` +
        `R$ ${(regras.precoCentavos / 100).toFixed(2).replace(".", ",")}/mês, ${regras.usuarios} usuário(s), ` +
        `${regras.empresasPorMes === null ? "sem limite mensal" : `${regras.empresasPorMes} empresas/mês`}.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao definir o plano:", erro instanceof Error && !("code" in erro) ? erro.message : explicarErroBanco(erro));
  process.exit(1);
});
