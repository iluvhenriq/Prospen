import "server-only";
import { getDb } from "@/db/client";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { montarPainel, type Painel } from "./indicadores";

export const DIAS_DE_LEADS_NOVOS = 30;

// Números do painel da empresa atual. Só dados reais: se não há leads, é zero.
export async function obterResumo(contexto: Contexto): Promise<Painel> {
  const leads = repositorioLeads(getDb(), contexto.organizacao.id);
  const desde = new Date(Date.now() - DIAS_DE_LEADS_NOVOS * 24 * 60 * 60 * 1000);
  return montarPainel(await leads.indicadores(desde));
}
