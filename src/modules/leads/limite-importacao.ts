import { registrarTentativa, verificarLimite, type Regra, type Situacao } from "@/lib/limite-tentativas";

// Limite de frequência da importação de planilha, por empresa. Cada envio já
// tem teto de 2 MB e 5.000 linhas; isto impede enviar dezenas seguidas.
// Usa o mesmo contador em memória do login: vale para um servidor só (veja
// "Pontos de atenção" em docs/arquitetura.md).

const UMA_HORA = 60 * 60 * 1000;

export type IntencaoImportacao = "conferir" | "importar";

export const LIMITES_IMPORTACAO = {
  // Planilhas gravadas: até 100 mil linhas por hora numa empresa.
  importar: { maximo: 20, janelaMs: UMA_HORA },
  // Conferir só lê o arquivo, mas lê inteiro e compara com os leads. Mais
  // folga, porque a pessoa corrige a planilha e confere de novo.
  conferir: { maximo: 60, janelaMs: UMA_HORA },
} as const satisfies Record<IntencaoImportacao, Regra>;

function chave(organizacaoId: string, intencao: IntencaoImportacao): string {
  return `importacao:${intencao}:${organizacaoId}`;
}

// Confere e, se ainda houver espaço, já conta este envio (antes de ler o
// arquivo: um envio que falha no meio também gastou o servidor).
export function consumirLimiteDeImportacao(
  organizacaoId: string,
  intencao: IntencaoImportacao,
  agora: number = Date.now(),
): Situacao {
  const regra = LIMITES_IMPORTACAO[intencao];
  const situacao = verificarLimite(chave(organizacaoId, intencao), regra, agora);
  if (!situacao.bloqueado) registrarTentativa(chave(organizacaoId, intencao), regra.janelaMs, agora);
  return situacao;
}
