import { and, desc, eq } from "drizzle-orm";
import { leads, notas, user, type Nota } from "@/db/schema";
import type { Banco } from "@/db/tipos";

// ÚNICO lugar que consulta a tabela de notas. Amarrado a UMA empresa; a empresa
// também faz parte da chave do banco, que recusa uma nota apontando para o lead
// de outra empresa.

export const TAMANHO_MAXIMO_NOTA = 2000;

export type NotaComAutor = Nota & { autorNome: string | null };

export function repositorioNotas(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioNotas exige o identificador da organização.");
  }

  const daOrganizacao = eq(notas.organizacaoId, organizacaoId);

  return {
    // Notas de um lead, da mais recente para a mais antiga.
    async listar(leadId: string): Promise<NotaComAutor[]> {
      const linhas = await db
        .select({ nota: notas, autorNome: user.name })
        .from(notas)
        .leftJoin(user, eq(user.id, notas.autorId))
        .where(and(daOrganizacao, eq(notas.leadId, leadId)))
        .orderBy(desc(notas.criadoEm), desc(notas.id));
      return linhas.map(({ nota, autorNome }) => ({ ...nota, autorNome }));
    },

    async buscar(id: string): Promise<Nota | null> {
      const [linha] = await db
        .select()
        .from(notas)
        .where(and(daOrganizacao, eq(notas.id, id)))
        .limit(1);
      return linha ?? null;
    },

    // Devolve nulo se o lead não existir NESTA empresa.
    async criar(leadId: string, texto: string, autorId: string | null): Promise<Nota | null> {
      const [lead] = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.organizacaoId, organizacaoId), eq(leads.id, leadId)))
        .limit(1);
      if (!lead) return null;

      const [linha] = await db
        .insert(notas)
        .values({ organizacaoId, leadId, texto: texto.trim(), autorId })
        .returning();
      return linha;
    },

    async excluir(id: string): Promise<boolean> {
      const apagadas = await db
        .delete(notas)
        .where(and(daOrganizacao, eq(notas.id, id)))
        .returning({ id: notas.id });
      return apagadas.length > 0;
    },
  };
}

export type RepositorioNotas = ReturnType<typeof repositorioNotas>;
