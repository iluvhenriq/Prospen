import { Etiqueta } from "@/components/ui/etiqueta";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { EtapaFunil } from "@/modules/leads/tipos";

// Cor de cada etapa: neutra no começo, roxo enquanto a venda anda,
// amarelo na proposta, verde no ganho e vermelho na perda.
const VARIANTE = {
  novo: "neutra",
  contatado: "roxo",
  em_conversa: "roxo",
  proposta: "aviso",
  ganho: "musgo",
  perdido: "erro",
} as const satisfies Record<EtapaFunil, string>;

export function SeloEtapa({ etapa }: { etapa: EtapaFunil }) {
  return <Etiqueta variante={VARIANTE[etapa]}>{ptBR.funil.etapas[etapa]}</Etiqueta>;
}
