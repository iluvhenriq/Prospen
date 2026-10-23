import { and, asc, count, eq, getTableColumns, inArray } from "drizzle-orm";
import {
  etiquetas,
  leadEtiquetas,
  leads,
  type CorEtiqueta,
  type Etiqueta,
} from "@/db/schema";
import type { Banco } from "@/db/tipos";
import { normalizarTexto } from "./normalizacao";

// ÚNICO lugar que consulta as tabelas de etiquetas e da ligação com os leads.
// Segue a mesma regra de leads: amarrado a UMA empresa, e a empresa também
// faz parte das chaves do banco, então não existe ligação entre empresas.

export const TAMANHO_MAXIMO_ETIQUETA = 40;

export type EtiquetaComTotal = Etiqueta & { totalLeads: number };

export function repositorioEtiquetas(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioEtiquetas exige o identificador da organização.");
  }

  const daOrganizacao = eq(etiquetas.organizacaoId, organizacaoId);

  async function buscar(id: string): Promise<Etiqueta | null> {
    const [linha] = await db
      .select()
      .from(etiquetas)
      .where(and(daOrganizacao, eq(etiquetas.id, id)))
      .limit(1);
    return linha ?? null;
  }

  return {
    async listar(): Promise<EtiquetaComTotal[]> {
      return db
        .select({ ...getTableColumns(etiquetas), totalLeads: count(leadEtiquetas.leadId) })
        .from(etiquetas)
        .leftJoin(
          leadEtiquetas,
          and(
            eq(leadEtiquetas.etiquetaId, etiquetas.id),
            eq(leadEtiquetas.organizacaoId, organizacaoId),
          ),
        )
        .where(daOrganizacao)
        .groupBy(etiquetas.id)
        .orderBy(asc(etiquetas.nomeNormalizado));
    },

    buscar,

    // Usa a etiqueta de mesmo nome se ela já existir ("Quente" e "quente" são
    // a mesma). Caso contrário, cria. O nome precisa ter de 1 a 40 caracteres.
    async obterOuCriar(
      nome: string,
      cor: CorEtiqueta = "neutra",
    ): Promise<{ etiqueta: Etiqueta; criada: boolean }> {
      const nomeLimpo = nome.replace(/\s+/g, " ").trim();
      const nomeNormalizado = normalizarTexto(nomeLimpo);

      const [nova] = await db
        .insert(etiquetas)
        .values({ organizacaoId, nome: nomeLimpo, nomeNormalizado, cor })
        .onConflictDoNothing()
        .returning();
      if (nova) return { etiqueta: nova, criada: true };

      const [existente] = await db
        .select()
        .from(etiquetas)
        .where(and(daOrganizacao, eq(etiquetas.nomeNormalizado, nomeNormalizado)))
        .limit(1);
      if (!existente) throw new Error("Não foi possível criar a etiqueta.");
      return { etiqueta: existente, criada: false };
    },

    async excluir(id: string): Promise<boolean> {
      const apagadas = await db
        .delete(etiquetas)
        .where(and(daOrganizacao, eq(etiquetas.id, id)))
        .returning({ id: etiquetas.id });
      return apagadas.length > 0;
    },

    // Liga uma etiqueta a um lead. Devolve falso se o lead ou a etiqueta não
    // existirem NESTA empresa. Ligar duas vezes é permitido e não duplica.
    async atribuir(leadId: string, etiquetaId: string): Promise<boolean> {
      const [lead] = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.organizacaoId, organizacaoId), eq(leads.id, leadId)))
        .limit(1);
      const etiqueta = await buscar(etiquetaId);
      if (!lead || !etiqueta) return false;

      await db
        .insert(leadEtiquetas)
        .values({ organizacaoId, leadId, etiquetaId })
        .onConflictDoNothing();
      return true;
    },

    async remover(leadId: string, etiquetaId: string): Promise<boolean> {
      const removidas = await db
        .delete(leadEtiquetas)
        .where(
          and(
            eq(leadEtiquetas.organizacaoId, organizacaoId),
            eq(leadEtiquetas.leadId, leadId),
            eq(leadEtiquetas.etiquetaId, etiquetaId),
          ),
        )
        .returning({ leadId: leadEtiquetas.leadId });
      return removidas.length > 0;
    },

    // Etiquetas de vários leads de uma vez (para a lista), em ordem alfabética.
    async dosLeads(leadIds: string[]): Promise<Map<string, Etiqueta[]>> {
      const mapa = new Map<string, Etiqueta[]>();
      if (leadIds.length === 0) return mapa;

      const linhas = await db
        .select({ leadId: leadEtiquetas.leadId, etiqueta: etiquetas })
        .from(leadEtiquetas)
        .innerJoin(
          etiquetas,
          and(
            eq(etiquetas.id, leadEtiquetas.etiquetaId),
            eq(etiquetas.organizacaoId, organizacaoId),
          ),
        )
        .where(
          and(
            eq(leadEtiquetas.organizacaoId, organizacaoId),
            inArray(leadEtiquetas.leadId, leadIds),
          ),
        )
        .orderBy(asc(etiquetas.nomeNormalizado));

      for (const { leadId, etiqueta } of linhas) {
        mapa.set(leadId, [...(mapa.get(leadId) ?? []), etiqueta]);
      }
      return mapa;
    },
  };
}

export type RepositorioEtiquetas = ReturnType<typeof repositorioEtiquetas>;
