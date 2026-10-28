import { and, count, desc, eq, inArray, max } from "drizzle-orm";
import { contatos, leads, user, type CanalContato, type Contato, type ResultadoContato } from "@/db/schema";
import type { Banco } from "@/db/tipos";

// ÚNICO lugar que consulta a tabela de contatos (tentativas de contato com um
// lead). Amarrado a UMA empresa; a empresa também faz parte da chave do banco,
// que recusa um contato apontando para o lead de outra empresa.

export type ContatoComAutor = Contato & { autorNome: string | null };
export type ResumoDeContatos = { tentativas: number; ultimo: Date };

export function repositorioContatos(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioContatos exige o identificador da organização.");
  }

  const daOrganizacao = eq(contatos.organizacaoId, organizacaoId);

  return {
    // Contatos de um lead, do mais recente para o mais antigo.
    async listar(leadId: string, limite = 50): Promise<ContatoComAutor[]> {
      const linhas = await db
        .select({ contato: contatos, autorNome: user.name })
        .from(contatos)
        .leftJoin(user, eq(user.id, contatos.autorId))
        .where(and(daOrganizacao, eq(contatos.leadId, leadId)))
        .orderBy(desc(contatos.criadoEm), desc(contatos.id))
        .limit(Math.min(Math.max(limite, 1), 200));
      return linhas.map(({ contato, autorNome }) => ({ ...contato, autorNome }));
    },

    // Devolve nulo se o lead não existir NESTA empresa.
    async registrar(
      leadId: string,
      canal: CanalContato,
      resultado: ResultadoContato,
      autorId: string | null,
    ): Promise<Contato | null> {
      const [lead] = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.organizacaoId, organizacaoId), eq(leads.id, leadId)))
        .limit(1);
      if (!lead) return null;

      const [linha] = await db
        .insert(contatos)
        .values({ organizacaoId, leadId, canal, resultado, autorId })
        .returning();
      return linha;
    },

    // Quantas tentativas e quando foi a última, para as listas de leads.
    async resumo(leadIds: string[]): Promise<Map<string, ResumoDeContatos>> {
      const resultado = new Map<string, ResumoDeContatos>();
      if (leadIds.length === 0) return resultado;
      const linhas = await db
        .select({ leadId: contatos.leadId, tentativas: count(), ultimo: max(contatos.criadoEm) })
        .from(contatos)
        .where(and(daOrganizacao, inArray(contatos.leadId, leadIds)))
        .groupBy(contatos.leadId);
      for (const linha of linhas) {
        if (linha.ultimo) resultado.set(linha.leadId, { tentativas: linha.tentativas, ultimo: linha.ultimo });
      }
      return resultado;
    },
  };
}

export type RepositorioContatos = ReturnType<typeof repositorioContatos>;
