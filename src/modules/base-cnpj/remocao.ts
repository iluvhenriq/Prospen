import { registrarTentativa, verificarLimite, type Regra } from "@/lib/limite-tentativas";
import type { Banco } from "@/db/tipos";
import { ptBR } from "@/lib/i18n/pt-BR";
import { cnpjValido, normalizarCnpj } from "@/modules/leads/cnpj";
import { repositorioBaseCnpj } from "./repositorio";

// Pedido público "remover meus dados" (LGPD). Decisão de 23/10/2026: a remoção
// é automática. O CNPJ entra na lista de exclusão na hora, some da busca de
// todas as empresas e não volta nas importações seguintes.
//
// Como qualquer pessoa pode pedir, sem login e sem confirmação por e-mail, há
// limites contra quem tentasse tirar muitas empresas da base (um concorrente,
// por exemplo): poucos pedidos por endereço e um teto diário no total.
// Leads que empresas clientes já salvaram NÃO são apagados por aqui: apagar
// dado de cliente a partir de um formulário aberto seria a porta para o abuso.

const UMA_HORA = 60 * 60 * 1000;
const UM_DIA = 24 * UMA_HORA;

export const LIMITES_REMOCAO = {
  porEndereco: { maximo: 5, janelaMs: UMA_HORA },
  // Teto para todos juntos. Se alguém esgotar, os pedidos legítimos esperam
  // até o dia seguinte: preferível a perder a base. Reavaliar com o uso real.
  total: { maximo: 100, janelaMs: UM_DIA },
} as const satisfies Record<string, Regra>;

const CHAVE_TOTAL = "remocao:total";

export type EntradaRemocao = { cnpj: string; confirmacao: boolean };

export type ResultadoRemocao =
  | { ok: true; cnpj: string }
  | { ok: false; erros?: { cnpj?: string; confirmacao?: string }; mensagem?: string };

export async function pedirRemocao(
  db: Banco,
  entrada: EntradaRemocao,
  ip: string | null,
  agora: number = Date.now(),
): Promise<ResultadoRemocao> {
  const t = ptBR.remocao;
  const cnpj = normalizarCnpj(entrada.cnpj.slice(0, 30));
  const erros: { cnpj?: string; confirmacao?: string } = {};
  if (!cnpj || !cnpjValido(cnpj)) erros.cnpj = t.cnpjInvalido;
  if (!entrada.confirmacao) erros.confirmacao = t.confirmacaoObrigatoria;
  if (!cnpj || erros.cnpj || erros.confirmacao) return { ok: false, erros };

  // Sem endereço conhecido (servidor sem proxy na frente), vale só o teto total.
  const chaveIp = ip ? `remocao:ip:${ip}` : null;
  const porIp = chaveIp ? verificarLimite(chaveIp, LIMITES_REMOCAO.porEndereco, agora) : null;
  const total = verificarLimite(CHAVE_TOTAL, LIMITES_REMOCAO.total, agora);
  if (porIp?.bloqueado || total.bloqueado) return { ok: false, mensagem: t.muitosPedidos };

  await repositorioBaseCnpj(db).excluirCnpj(cnpj);
  if (chaveIp) registrarTentativa(chaveIp, LIMITES_REMOCAO.porEndereco.janelaMs, agora);
  registrarTentativa(CHAVE_TOTAL, LIMITES_REMOCAO.total.janelaMs, agora);
  return { ok: true, cnpj };
}
