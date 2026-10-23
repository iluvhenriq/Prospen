import { Etiqueta } from "@/components/ui/etiqueta";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { Faixa, Motivo } from "@/modules/pontuacao/regras";

const VARIANTE = { alta: "musgo", media: "roxo", baixa: "neutra" } as const;

// Faixa de prioridade do lead. O título (passar o mouse) mostra os pontos e os
// motivos: pontuação sem explicação o vendedor não usa.
export function SeloPontuacao({ pontos, faixa, motivos }: { pontos: number; faixa: Faixa; motivos: Motivo[] }) {
  const t = ptBR.pontuacao;
  return (
    <Etiqueta variante={VARIANTE[faixa]} title={`${t.pontos(pontos)}: ${textoDosMotivos(motivos)}`}>
      {t.faixas[faixa]}
    </Etiqueta>
  );
}

export function textoDosMotivos(motivos: Motivo[]): string {
  if (motivos.length === 0) return ptBR.pontuacao.semMotivos;
  return motivos.map((motivo) => ptBR.pontuacao.motivos[motivo]).join(", ");
}
