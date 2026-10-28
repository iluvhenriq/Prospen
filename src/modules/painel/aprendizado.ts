import type { MotivoPerda, OrigemLead } from "@/modules/leads/tipos";
import type { LeadEncerrado } from "@/modules/leads/repositorio";
import { pontuar, type ClienteIdeal, type Faixa } from "@/modules/pontuacao/regras";

// Aprendizado com os resultados (etapa 9d, 27/10/2026). Conta pura, sem banco:
// recebe os negócios encerrados (ganhos e perdidos) e devolve o que eles
// ensinam. Regra de ouro: com pouco dado, não há conclusão. Cada grupo só tem
// taxa a partir de MINIMO_POR_GRUPO negócios, e cada número vem com a amostra.

export const MINIMO_POR_GRUPO = 5;

// Diferença mínima (em pontos percentuais) entre a taxa da prioridade alta e a
// da baixa para dizer que a nota "separa bem" quem compra.
export const DIFERENCA_QUE_SEPARA = 10;

// Ganhos e perdidos de um grupo. Taxa de fechamento em %, ou nula com poucos casos.
export type Fechamento<C extends string> = { chave: C; ganhos: number; perdidos: number; taxa: number | null };

export type MotivoPorPorte = { porte: string; motivo: MotivoPerda; vezes: number; perdas: number };

export type Aprendizado = {
  encerrados: number;
  ganhos: number;
  perdidos: number;
  // Quantos negócios encerrados faltam para o primeiro aprendizado (0 = já dá).
  faltam: number;
  porFaixa: Fechamento<Faixa>[];
  // A nota acerta? Compara alta com baixa. "neutra": diferença pequena, sem julgamento.
  nota: { alta: number; baixa: number; avaliacao: "separa" | "nao_separa" | "neutra" } | null;
  porOrigem: Fechamento<OrigemLead>[];
  // A origem que mais fecha, só se houver ao menos duas comparáveis e uma na frente.
  melhorOrigem: Fechamento<OrigemLead> | null;
  motivoPorPorte: MotivoPorPorte[];
  // Perdas por "sem resposta" com uma tentativa de contato ou nenhuma.
  insistencia: { poucasTentativas: number; semResposta: number } | null;
  // Média de tentativas de contato nos negócios ganhos (uma casa decimal).
  tentativasNosGanhos: number | null;
};

const FAIXAS: Faixa[] = ["alta", "media", "baixa"];

function fechamento<C extends string>(chave: C, ganhos: number, perdidos: number): Fechamento<C> {
  const total = ganhos + perdidos;
  return { chave, ganhos, perdidos, taxa: total >= MINIMO_POR_GRUPO ? Math.round((ganhos / total) * 100) : null };
}

function agrupar<C extends string>(linhas: LeadEncerrado[], chaveDe: (linha: LeadEncerrado) => C): Map<C, { ganhos: number; perdidos: number }> {
  const grupos = new Map<C, { ganhos: number; perdidos: number }>();
  for (const linha of linhas) {
    const chave = chaveDe(linha);
    const grupo = grupos.get(chave) ?? { ganhos: 0, perdidos: 0 };
    if (linha.etapa === "ganho") grupo.ganhos += 1;
    else grupo.perdidos += 1;
    grupos.set(chave, grupo);
  }
  return grupos;
}

// "hoje" entra como parâmetro: a nota depende da idade da empresa.
export function aprenderComOsResultados(
  linhas: LeadEncerrado[],
  hoje: Date = new Date(),
  perfil: ClienteIdeal | null = null,
): Aprendizado {
  const ganhos = linhas.filter((linha) => linha.etapa === "ganho");
  const perdidos = linhas.filter((linha) => linha.etapa === "perdido");

  // A nota de hoje de cada negócio (a mesma conta da lista de leads, com o cliente ideal).
  const porFaixaBruto = agrupar(linhas, (linha) => pontuar(linha, hoje, perfil).faixa);
  const porFaixa = FAIXAS.map((faixa) => {
    const grupo = porFaixaBruto.get(faixa) ?? { ganhos: 0, perdidos: 0 };
    return fechamento(faixa, grupo.ganhos, grupo.perdidos);
  });

  const alta = porFaixa[0].taxa;
  const baixa = porFaixa[2].taxa;
  const nota =
    alta !== null && baixa !== null
      ? {
          alta,
          baixa,
          avaliacao: (alta >= baixa + DIFERENCA_QUE_SEPARA ? "separa" : alta <= baixa ? "nao_separa" : "neutra") as
            | "separa"
            | "nao_separa"
            | "neutra",
        }
      : null;

  const porOrigem = [...agrupar(linhas, (linha) => linha.origem)]
    .map(([origem, grupo]) => fechamento(origem, grupo.ganhos, grupo.perdidos))
    .sort((a, b) => b.ganhos + b.perdidos - (a.ganhos + a.perdidos));
  const comparaveis = porOrigem
    .filter((grupo): grupo is Fechamento<OrigemLead> & { taxa: number } => grupo.taxa !== null)
    .sort((a, b) => b.taxa - a.taxa);
  const melhorOrigem = comparaveis.length >= 2 && comparaveis[0].taxa > comparaveis[1].taxa ? comparaveis[0] : null;

  // Motivo mais comum por porte, só onde o porte é conhecido e há perdas suficientes.
  const motivoPorPorte: MotivoPorPorte[] = [];
  const motivosPorPorte = new Map<string, MotivoPerda[]>();
  for (const linha of perdidos) {
    if (!linha.porte || !linha.motivoPerda) continue;
    motivosPorPorte.set(linha.porte, [...(motivosPorPorte.get(linha.porte) ?? []), linha.motivoPerda]);
  }
  for (const [porte, motivos] of motivosPorPorte) {
    if (motivos.length < MINIMO_POR_GRUPO) continue;
    const contagem = new Map<MotivoPerda, number>();
    for (const motivo of motivos) contagem.set(motivo, (contagem.get(motivo) ?? 0) + 1);
    const [motivo, vezes] = [...contagem].sort((a, b) => b[1] - a[1])[0];
    // Empate no primeiro lugar não é padrão: fica de fora.
    const empatados = [...contagem.values()].filter((total) => total === vezes).length;
    if (empatados === 1) motivoPorPorte.push({ porte, motivo, vezes, perdas: motivos.length });
  }
  motivoPorPorte.sort((a, b) => b.perdas - a.perdas);

  const semResposta = perdidos.filter((linha) => linha.motivoPerda === "sem_resposta");
  const insistencia =
    semResposta.length >= MINIMO_POR_GRUPO
      ? { poucasTentativas: semResposta.filter((linha) => linha.tentativas <= 1).length, semResposta: semResposta.length }
      : null;

  const tentativasNosGanhos =
    ganhos.length >= MINIMO_POR_GRUPO
      ? Math.round((ganhos.reduce((soma, linha) => soma + linha.tentativas, 0) / ganhos.length) * 10) / 10
      : null;

  return {
    encerrados: linhas.length,
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    faltam: Math.max(0, MINIMO_POR_GRUPO - linhas.length),
    porFaixa,
    nota,
    porOrigem,
    melhorOrigem,
    motivoPorPorte,
    insistencia,
    tentativasNosGanhos,
  };
}
