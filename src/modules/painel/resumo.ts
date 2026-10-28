import "server-only";
import { getDb } from "@/db/client";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { hojeNoFuso } from "@/lib/formato";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { obterConfiguracao } from "@/modules/organizacoes/configuracao";
import { aprenderComOsResultados, type Aprendizado } from "./aprendizado";
import { montarPainel, type Painel } from "./indicadores";

export const DIAS_DE_LEADS_NOVOS = 30;

// Números do painel da empresa atual. Só dados reais: se não há leads, é zero.
export async function obterResumo(contexto: Contexto): Promise<Painel> {
  const leads = repositorioLeads(getDb(), contexto.organizacao.id);
  const desde = new Date(Date.now() - DIAS_DE_LEADS_NOVOS * 24 * 60 * 60 * 1000);
  return montarPainel(await leads.indicadores(desde));
}

// O que os negócios encerrados ensinam (etapa 9d). A nota é a de hoje, no
// calendário da empresa, igual à da lista de leads.
export async function obterAprendizado(contexto: Contexto): Promise<Aprendizado> {
  const db = getDb();
  const [encerrados, configuracao] = await Promise.all([
    repositorioLeads(db, contexto.organizacao.id).encerrados(),
    obterConfiguracao(db, contexto.organizacao.id),
  ]);
  const hoje = new Date(`${hojeNoFuso(configuracao.fusoHorario)}T12:00:00Z`);
  return aprenderComOsResultados(encerrados, hoje);
}
