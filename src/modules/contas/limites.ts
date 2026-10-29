import { ptBR } from "@/lib/i18n/pt-BR";
import type { Regra } from "@/lib/limite-tentativas";

// Regras de proteção contra tentativa e erro de senha e contra cadastros em massa.
// O limite do Better Auth só vale para chamadas HTTP. Como as telas chamam o
// login direto no servidor, estas regras são o que protege esse caminho.

const QUINZE_MINUTOS = 15 * 60 * 1000;
const UMA_HORA = 60 * 60 * 1000;

export const LIMITES = {
  // Falhas de senha para o mesmo e-mail (protege uma conta específica).
  entradaPorEmail: { maximo: 8, janelaMs: QUINZE_MINUTOS },
  // Falhas vindas do mesmo endereço (protege contra testar muitas contas).
  entradaPorIp: { maximo: 30, janelaMs: QUINZE_MINUTOS },
  // Contas criadas pelo mesmo endereço.
  cadastroPorIp: { maximo: 10, janelaMs: UMA_HORA },
  // Pedidos de link de senha nova: cada um manda um e-mail.
  novaSenhaPorEmail: { maximo: 3, janelaMs: UMA_HORA },
  novaSenhaPorIp: { maximo: 10, janelaMs: UMA_HORA },
} as const satisfies Record<string, Regra>;

// Endereço de quem fez a requisição, quando o servidor da frente informa.
// Se não houver, devolve nulo e só o limite por e-mail é aplicado, para
// não juntar todo mundo num mesmo balde.
export function ipDaRequisicao(cabecalhos: Headers): string | null {
  const encaminhado = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = encaminhado || cabecalhos.get("x-real-ip")?.trim();
  return ip ? ip.slice(0, 64) : null;
}

export function mensagemDeEspera(segundos: number): string {
  return ptBR.acesso.limiteTentativas(Math.max(1, Math.ceil(segundos / 60)));
}
