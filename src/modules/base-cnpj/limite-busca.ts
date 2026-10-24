import { registrarTentativa, verificarLimite, type Regra, type Situacao } from "@/lib/limite-tentativas";

// Limite de páginas da busca na base pública, por empresa cliente (decisão de
// 23/10/2026). Os termos de uso proíbem extrair a base em massa; isto torna a
// proibição real. 300 páginas de 50 = 15 mil empresas por dia, bem acima do
// uso normal de prospecção. Ajustar conforme o plano de venda.
// Mesmo contador em memória do login: vale para um servidor só.

export const LIMITE_BUSCA: Regra = { maximo: 300, janelaMs: 24 * 60 * 60 * 1000 };

// Confere e, se houver espaço, já conta esta página. Página barrada não conta.
export function consumirLimiteDeBusca(organizacaoId: string, agora: number = Date.now()): Situacao {
  const chave = `busca:${organizacaoId}`;
  const situacao = verificarLimite(chave, LIMITE_BUSCA, agora);
  if (!situacao.bloqueado) registrarTentativa(chave, LIMITE_BUSCA.janelaMs, agora);
  return situacao;
}
