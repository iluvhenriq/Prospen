import { ETAPAS_FUNIL, type EtapaFunil, type MotivoPerda } from "@/modules/leads/tipos";
import type { IndicadoresDosLeads } from "@/modules/leads/repositorio";

// Contas do painel a partir das contagens do banco. Funções puras: nenhum
// número é estimado ou preenchido; sem dado, o resultado é zero ou nulo.

export const ETAPAS_EM_ANDAMENTO: EtapaFunil[] = ["novo", "contatado", "em_conversa", "proposta"];

export type Painel = {
  total: number;
  novos: number;
  emAndamento: number;
  ganhos: number;
  perdidos: number;
  // Ganhos sobre encerrados (ganhos + perdidos), de 0 a 100. Nulo sem nenhum encerrado.
  taxaDeConversao: number | null;
  funil: { etapa: EtapaFunil; total: number }[];
  motivos: { motivo: MotivoPerda | null; total: number }[];
  origens: { origem: string; total: number }[];
  // Por moeda. "ticketMedio" considera só as vendas com valor informado.
  vendas: { moeda: string; centavos: number; vendas: number; ticketMedioCentavos: number }[];
  ganhosSemValor: number;
};

export function montarPainel(dados: IndicadoresDosLeads): Painel {
  const naEtapa = (etapa: EtapaFunil) => dados.porEtapa[etapa] ?? 0;
  const ganhos = naEtapa("ganho");
  const perdidos = naEtapa("perdido");
  const encerrados = ganhos + perdidos;
  const vendas = dados.vendas.map((venda) => ({
    ...venda,
    ticketMedioCentavos: venda.vendas > 0 ? Math.round(venda.centavos / venda.vendas) : 0,
  }));

  return {
    total: ETAPAS_FUNIL.reduce((soma, etapa) => soma + naEtapa(etapa), 0),
    novos: dados.novos,
    emAndamento: ETAPAS_EM_ANDAMENTO.reduce((soma, etapa) => soma + naEtapa(etapa), 0),
    ganhos,
    perdidos,
    taxaDeConversao: encerrados > 0 ? Math.round((ganhos / encerrados) * 100) : null,
    funil: ETAPAS_FUNIL.map((etapa) => ({ etapa, total: naEtapa(etapa) })),
    // Do mais frequente ao menos; "sem motivo" sempre por último.
    motivos: [...dados.porMotivo].sort((a, b) =>
      a.motivo === null ? 1 : b.motivo === null ? -1 : b.total - a.total,
    ),
    origens: Object.entries(dados.porOrigem)
      .map(([origem, total]) => ({ origem, total: total ?? 0 }))
      .filter((linha) => linha.total > 0)
      .sort((a, b) => b.total - a.total),
    vendas,
    ganhosSemValor: Math.max(0, ganhos - vendas.reduce((soma, venda) => soma + venda.vendas, 0)),
  };
}
