import { z } from "zod";
import type { Banco } from "@/db/tipos";
import { ptBR } from "@/lib/i18n/pt-BR";
import { registrarTentativa, verificarLimite, type Regra } from "@/lib/limite-tentativas";
import { repositorioPreCadastros } from "./repositorio";

// Pré-cadastro público da página de apresentação. Base legal: procedimentos
// preliminares a um contrato, a pedido da pessoa (LGPD, art. 7º, V): ela pede
// para ser avisada da abertura e das condições da pré-venda, e só isso.
//
// O mesmo e-mail enviado de novo recebe a mesma resposta de sucesso, para a
// página não revelar quem já está na lista.

const UMA_HORA = 60 * 60 * 1000;

export const LIMITES_PRE_CADASTRO = {
  porEndereco: { maximo: 5, janelaMs: UMA_HORA },
  // Teto geral contra robôs que trocam de endereço.
  total: { maximo: 500, janelaMs: 24 * UMA_HORA },
} as const satisfies Record<string, Regra>;

const CHAVE_TOTAL = "pre-cadastro:total";

export type CampoPreCadastro = "nome" | "email" | "empresa";

export type ResultadoPreCadastro =
  | { ok: true }
  | { ok: false; erros?: Partial<Record<CampoPreCadastro, string>>; mensagem?: string };

const t = ptBR.preVenda.formulario;

const esquema = z.object({
  nome: z.string().trim().min(1, t.nomeObrigatorio).max(80, t.nomeLongo),
  email: z.string().trim().max(254, t.emailInvalido).pipe(z.email(t.emailInvalido)),
  empresa: z
    .string()
    .trim()
    .max(120, t.empresaLonga)
    .transform((valor) => valor || null),
});

export async function registrarPreCadastro(
  db: Banco,
  entrada: Record<CampoPreCadastro, string>,
  ip: string | null,
  agora: number = Date.now(),
): Promise<ResultadoPreCadastro> {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) {
    const erros: Partial<Record<CampoPreCadastro, string>> = {};
    for (const problema of resultado.error.issues) {
      erros[problema.path[0] as CampoPreCadastro] ??= problema.message;
    }
    return { ok: false, erros };
  }

  const chaveIp = ip ? `pre-cadastro:ip:${ip}` : null;
  const porIp = chaveIp ? verificarLimite(chaveIp, LIMITES_PRE_CADASTRO.porEndereco, agora) : null;
  const total = verificarLimite(CHAVE_TOTAL, LIMITES_PRE_CADASTRO.total, agora);
  if (porIp?.bloqueado || total.bloqueado) return { ok: false, mensagem: t.muitosEnvios };

  await repositorioPreCadastros(db).registrar(resultado.data);
  if (chaveIp) registrarTentativa(chaveIp, LIMITES_PRE_CADASTRO.porEndereco.janelaMs, agora);
  registrarTentativa(CHAVE_TOTAL, LIMITES_PRE_CADASTRO.total.janelaMs, agora);
  return { ok: true };
}
