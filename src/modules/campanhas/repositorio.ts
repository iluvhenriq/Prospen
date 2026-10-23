import { and, asc, count, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import {
  campanhaLeads,
  campanhas,
  leads,
  type Campanha,
  type Lead,
  type SituacaoCampanha,
} from "@/db/schema";
import type { Banco } from "@/db/tipos";

// ÚNICO lugar que consulta as tabelas de campanhas. Mesma regra de leads:
// amarrado a UMA empresa, com o filtro dentro de cada comando, e a empresa
// também faz parte das chaves do banco (não existe ligação entre empresas).

export type DadosCampanha = {
  nome: string;
  objetivo: string | null;
  responsavelId: string | null;
  inicio: string | null;
  fim: string | null;
  custoCentavos: number | null;
};

// Números de uma campanha, todos tirados dos leads dela (etapa e valor).
export type NumerosCampanha = {
  leads: number;
  // Saíram de "Novo": alguém já falou com eles.
  contatados: number;
  ganhos: number;
  perdidos: number;
  // Soma do valor dos ganhos registrados na moeda informada.
  vendidoCentavos: number;
};

export type CampanhaComNumeros = Campanha & NumerosCampanha;

// Quantos leads uma campanha recebe de uma vez (pelo filtro da lista).
export const MAXIMO_POR_ADICAO = 1000;

export function repositorioCampanhas(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioCampanhas exige o identificador da organização.");
  }

  const daOrganizacao = eq(campanhas.organizacaoId, organizacaoId);

  // Agregados dos leads de cada campanha. "moeda" escolhe quais valores somar:
  // venda registrada em outra moeda não entra na soma.
  const numeros = (moeda: string) => ({
    leads: count(campanhaLeads.leadId),
    contatados: sql<number>`count(*) filter (where ${leads.etapa} <> 'novo')`.mapWith(Number),
    ganhos: sql<number>`count(*) filter (where ${leads.etapa} = 'ganho')`.mapWith(Number),
    perdidos: sql<number>`count(*) filter (where ${leads.etapa} = 'perdido')`.mapWith(Number),
    vendidoCentavos: sql<number>`coalesce(sum(${leads.valorVendaCentavos}) filter (where ${leads.etapa} = 'ganho' and ${leads.moedaVenda} = ${moeda}), 0)`.mapWith(Number),
  });

  const comNumeros = (moeda: string) =>
    db
      .select({ ...getTableColumns(campanhas), ...numeros(moeda) })
      .from(campanhas)
      .leftJoin(
        campanhaLeads,
        and(eq(campanhaLeads.campanhaId, campanhas.id), eq(campanhaLeads.organizacaoId, organizacaoId)),
      )
      .leftJoin(leads, and(eq(leads.id, campanhaLeads.leadId), eq(leads.organizacaoId, organizacaoId)))
      .groupBy(campanhas.id)
      .$dynamic();

  async function buscar(id: string): Promise<Campanha | null> {
    const [linha] = await db
      .select()
      .from(campanhas)
      .where(and(daOrganizacao, eq(campanhas.id, id)))
      .limit(1);
    return linha ?? null;
  }

  return {
    // Ativas primeiro, depois as mais novas.
    async listar(moeda: string): Promise<CampanhaComNumeros[]> {
      return comNumeros(moeda)
        .where(daOrganizacao)
        .orderBy(asc(campanhas.situacao), desc(campanhas.criadoEm), desc(campanhas.id));
    },

    async buscarComNumeros(id: string, moeda: string): Promise<CampanhaComNumeros | null> {
      const [linha] = await comNumeros(moeda).where(and(daOrganizacao, eq(campanhas.id, id)));
      return linha ?? null;
    },

    buscar,

    async criar(dados: DadosCampanha, moeda: string, criadoPorId: string | null): Promise<Campanha> {
      const [linha] = await db
        .insert(campanhas)
        .values({
          ...dados,
          moedaCusto: dados.custoCentavos === null ? null : moeda,
          // Depois dos dados, para vencer qualquer valor extra que tenha vindo neles.
          organizacaoId,
          criadoPorId,
        })
        .returning();
      return linha;
    },

    async atualizar(id: string, dados: DadosCampanha, moeda: string): Promise<Campanha | null> {
      const [linha] = await db
        .update(campanhas)
        .set({ ...dados, moedaCusto: dados.custoCentavos === null ? null : moeda })
        .where(and(daOrganizacao, eq(campanhas.id, id)))
        .returning();
      return linha ?? null;
    },

    async mudarSituacao(id: string, situacao: SituacaoCampanha): Promise<boolean> {
      const linhas = await db
        .update(campanhas)
        .set({ situacao })
        .where(and(daOrganizacao, eq(campanhas.id, id)))
        .returning({ id: campanhas.id });
      return linhas.length > 0;
    },

    // Apaga a campanha e a ligação com os leads. Os leads continuam.
    async excluir(id: string): Promise<boolean> {
      const linhas = await db
        .delete(campanhas)
        .where(and(daOrganizacao, eq(campanhas.id, id)))
        .returning({ id: campanhas.id });
      return linhas.length > 0;
    },

    // Coloca leads na campanha. Só entram leads desta empresa (os outros são
    // ignorados, como se não existissem); quem já está é pulado. Devolve
    // quantos entraram, ou nulo se a campanha não existe nesta empresa.
    async adicionarLeads(campanhaId: string, leadIds: string[], adicionadoPorId: string | null): Promise<number | null> {
      if (!(await buscar(campanhaId))) return null;
      const unicos = [...new Set(leadIds)].slice(0, MAXIMO_POR_ADICAO);
      if (unicos.length === 0) return 0;
      const daEmpresa = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.organizacaoId, organizacaoId), inArray(leads.id, unicos)));
      if (daEmpresa.length === 0) return 0;
      const inseridos = await db
        .insert(campanhaLeads)
        .values(daEmpresa.map((lead) => ({ organizacaoId, campanhaId, leadId: lead.id, adicionadoPorId })))
        .onConflictDoNothing()
        .returning({ leadId: campanhaLeads.leadId });
      return inseridos.length;
    },

    async removerLead(campanhaId: string, leadId: string): Promise<boolean> {
      const linhas = await db
        .delete(campanhaLeads)
        .where(
          and(
            eq(campanhaLeads.organizacaoId, organizacaoId),
            eq(campanhaLeads.campanhaId, campanhaId),
            eq(campanhaLeads.leadId, leadId),
          ),
        )
        .returning({ leadId: campanhaLeads.leadId });
      return linhas.length > 0;
    },

    // Leads da campanha, dos adicionados mais recentemente.
    async leadsDaCampanha(campanhaId: string, limite = 200): Promise<Lead[]> {
      const linhas = await db
        .select({ lead: leads })
        .from(campanhaLeads)
        .innerJoin(leads, and(eq(leads.id, campanhaLeads.leadId), eq(leads.organizacaoId, organizacaoId)))
        .where(and(eq(campanhaLeads.organizacaoId, organizacaoId), eq(campanhaLeads.campanhaId, campanhaId)))
        .orderBy(desc(campanhaLeads.adicionadoEm), desc(leads.id))
        .limit(Math.min(Math.max(limite, 1), 500));
      return linhas.map((linha) => linha.lead);
    },

    // Campanhas em que o lead está (página do lead).
    async doLead(leadId: string): Promise<Campanha[]> {
      const linhas = await db
        .select({ campanha: campanhas })
        .from(campanhaLeads)
        .innerJoin(
          campanhas,
          and(eq(campanhas.id, campanhaLeads.campanhaId), eq(campanhas.organizacaoId, organizacaoId)),
        )
        .where(and(eq(campanhaLeads.organizacaoId, organizacaoId), eq(campanhaLeads.leadId, leadId)))
        .orderBy(asc(campanhas.nome));
      return linhas.map((linha) => linha.campanha);
    },
  };
}

export type RepositorioCampanhas = ReturnType<typeof repositorioCampanhas>;
