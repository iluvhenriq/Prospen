import { and, count, eq, sql } from "drizzle-orm";
import { planoEmpresa, usoMensal } from "@/db/schema";
import type { Banco } from "@/db/tipos";
import { PLANO_PADRAO, planoValido, type Plano } from "./planos";

export type PlanoDaEmpresa = { plano: Plano; fundador: boolean; gravado: boolean };

// Vagas de fundador já usadas, em todas as empresas (o total é público na
// página inicial; nenhuma empresa é identificada).
export async function fundadoresUsados(db: Banco): Promise<number> {
  const [linha] = await db.select({ total: count() }).from(planoEmpresa).where(eq(planoEmpresa.fundador, true));
  return linha?.total ?? 0;
}

// ÚNICO lugar que consulta o plano e o uso mensal. Amarrado a UMA empresa.
export function repositorioPlano(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioPlano exige o identificador da organização.");
  }

  const daOrganizacao = eq(planoEmpresa.organizacaoId, organizacaoId);
  const doMes = (mes: string) => and(eq(usoMensal.organizacaoId, organizacaoId), eq(usoMensal.mes, mes));

  return {
    // Sem linha (ou valor desconhecido), vale o plano padrão.
    async obter(): Promise<PlanoDaEmpresa> {
      const [linha] = await db.select().from(planoEmpresa).where(daOrganizacao).limit(1);
      if (!linha || !planoValido(linha.plano)) return { plano: PLANO_PADRAO, fundador: false, gravado: false };
      return { plano: linha.plano, fundador: linha.fundador, gravado: true };
    },

    // Só o script `plano:definir` chama, depois de conferir o pagamento.
    async definir(plano: Plano, fundador: boolean): Promise<void> {
      await db
        .insert(planoEmpresa)
        .values({ organizacaoId, plano, fundador })
        .onConflictDoUpdate({ target: planoEmpresa.organizacaoId, set: { plano, fundador } });
    },

    async empresasSalvasNoMes(mes: string): Promise<number> {
      const [linha] = await db.select({ total: usoMensal.empresasSalvas }).from(usoMensal).where(doMes(mes)).limit(1);
      return linha?.total ?? 0;
    },

    // Dentro de uma transação: trava a linha do mês até o fim dela, para duas
    // pessoas da mesma empresa salvando ao mesmo tempo não passarem do limite.
    async travarMes(mes: string): Promise<number> {
      await db.insert(usoMensal).values({ organizacaoId, mes }).onConflictDoNothing();
      const [linha] = await db
        .select({ total: usoMensal.empresasSalvas })
        .from(usoMensal)
        .where(doMes(mes))
        .for("update");
      return linha?.total ?? 0;
    },

    async somarAoMes(mes: string, quantidade: number): Promise<void> {
      if (quantidade <= 0) return;
      await db
        .update(usoMensal)
        .set({ empresasSalvas: sql`${usoMensal.empresasSalvas} + ${quantidade}` })
        .where(doMes(mes));
    },
  };
}
