import { z } from "zod";
import { CANAIS_CONTATO, RESULTADOS_CONTATO, type CanalContato, type ResultadoContato } from "@/db/schema";
import { ptBR } from "@/lib/i18n/pt-BR";

// Validação do registro de contato e da próxima ação. Roda no servidor, sempre.

export const TAMANHO_MAXIMO_PROXIMA_ACAO = 200;

const t = ptBR.mensagens.contato;

export type CampoProximaAcao = "proximaAcaoEm" | "proximaAcao";
export type ProximaAcao = { em: string | null; texto: string | null };
export type ResultadoValidacao<T, C extends string> =
  | { ok: true; dados: T }
  | { ok: false; erros: Partial<Record<C, string>> };

// Data do campo de data do navegador (AAAA-MM-DD), conferida de verdade.
function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const dia = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().slice(0, 10) === valor;
}

const esquemaProximaAcao = z
  .object({
    proximaAcaoEm: z
      .string()
      .trim()
      .transform((valor) => valor || null)
      .refine((valor) => valor === null || dataValida(valor), t.dataInvalida),
    proximaAcao: z
      .string()
      .trim()
      .max(TAMANHO_MAXIMO_PROXIMA_ACAO, t.textoLongo(TAMANHO_MAXIMO_PROXIMA_ACAO))
      .transform((valor) => valor || null),
  })
  .refine((dados) => dados.proximaAcao === null || dados.proximaAcaoEm !== null, {
    message: t.textoSemData,
    path: ["proximaAcaoEm"],
  });

function erros<C extends string>(problemas: z.core.$ZodIssue[]): Partial<Record<C, string>> {
  const saida: Partial<Record<C, string>> = {};
  for (const problema of problemas) {
    const campo = problema.path[0] as C;
    saida[campo] ??= problema.message;
  }
  return saida;
}

export function validarProximaAcao(
  entrada: Record<CampoProximaAcao, string>,
): ResultadoValidacao<ProximaAcao, CampoProximaAcao> {
  const resultado = esquemaProximaAcao.safeParse(entrada);
  if (!resultado.success) return { ok: false, erros: erros(resultado.error.issues) };
  return { ok: true, dados: { em: resultado.data.proximaAcaoEm, texto: resultado.data.proximaAcao } };
}

export type CampoContato = "canal" | "resultado" | CampoProximaAcao;
export type DadosContato = { canal: CanalContato; resultado: ResultadoContato; proxima: ProximaAcao };

const esquemaContato = z.object({
  canal: z.enum(CANAIS_CONTATO, { error: t.canalInvalido }),
  resultado: z.enum(RESULTADOS_CONTATO, { error: t.resultadoInvalido }),
});

export function validarContato(
  entrada: Record<CampoContato, string>,
): ResultadoValidacao<DadosContato, CampoContato> {
  const contato = esquemaContato.safeParse(entrada);
  const proxima = validarProximaAcao(entrada);
  if (!contato.success || !proxima.ok) {
    return {
      ok: false,
      erros: { ...(contato.success ? {} : erros<CampoContato>(contato.error.issues)), ...(proxima.ok ? {} : proxima.erros) },
    };
  }
  return { ok: true, dados: { ...contato.data, proxima: proxima.dados } };
}
