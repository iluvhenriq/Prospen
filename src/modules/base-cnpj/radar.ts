import type { SinalDaBase, TipoDeSinal } from "@/db/schema";
import type { LeadComCnpj } from "@/modules/leads/repositorio";

// Radar (27/10/2026): o que mudou na Receita sobre as empresas dos leads.
// Regra pura, sem banco: quem chama traz os sinais e os leads da empresa.

// Quantas mudanças o painel mostra.
export const SINAIS_NO_PAINEL = 10;

export type SinalDoLead = {
  id: string;
  tipo: TipoDeSinal;
  // CNPJ do sinal. Em "nova_unidade", é a unidade nova (ainda não é lead).
  cnpj: string;
  antes: string | null;
  depois: string | null;
  mesReferencia: string;
  lead: Pick<LeadComCnpj, "id" | "nome" | "empresa">;
};

// Liga cada sinal ao lead: pelo CNPJ nas mudanças da própria empresa e pela
// raiz (8 primeiros caracteres) nas novas unidades. Nova unidade que já é lead
// não é novidade e sai. Com mais de um lead da mesma raiz, vale o primeiro da
// lista (quem chama manda os mais recentes primeiro). A ordem dos sinais é mantida.
export function cruzarSinaisComLeads(sinais: SinalDaBase[], leads: LeadComCnpj[]): SinalDoLead[] {
  const porCnpj = new Map<string, LeadComCnpj>();
  const porRaiz = new Map<string, LeadComCnpj>();
  for (const lead of leads) {
    porCnpj.set(lead.cnpj, lead);
    const raiz = lead.cnpj.slice(0, 8);
    if (!porRaiz.has(raiz)) porRaiz.set(raiz, lead);
  }

  const resultado: SinalDoLead[] = [];
  for (const sinal of sinais) {
    const lead =
      sinal.tipo === "nova_unidade"
        ? porCnpj.has(sinal.cnpj)
          ? undefined
          : porRaiz.get(sinal.cnpjBasico)
        : porCnpj.get(sinal.cnpj);
    if (!lead) continue;
    resultado.push({
      id: sinal.id,
      tipo: sinal.tipo,
      cnpj: sinal.cnpj,
      antes: sinal.antes,
      depois: sinal.depois,
      mesReferencia: sinal.mesReferencia,
      lead: { id: lead.id, nome: lead.nome, empresa: lead.empresa },
    });
  }
  return resultado;
}
