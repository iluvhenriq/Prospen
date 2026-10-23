import "server-only";
import { getDb } from "@/db/client";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { repositorioLeads } from "@/modules/leads/repositorio";

export type ResumoPainel = {
  totalLeads: number;
};

// Números do painel da empresa atual. Só dados reais: se não há leads, é zero.
export async function obterResumo(contexto: Contexto): Promise<ResumoPainel> {
  const leads = repositorioLeads(getDb(), contexto.organizacao.id);
  return { totalLeads: await leads.contar() };
}
