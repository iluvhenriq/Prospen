import { z } from "zod";
import { ptBR } from "@/lib/i18n/pt-BR";
import { lerValorEmCentavos } from "@/modules/leads/valor";

// Validação do formulário de campanha. Roda no servidor, sempre.

export type CampoCampanha = "nome" | "objetivo" | "inicio" | "fim" | "custo";

export type DadosValidados = {
  nome: string;
  objetivo: string | null;
  inicio: string | null;
  fim: string | null;
  custoCentavos: number | null;
};

export type ResultadoCampanha =
  | { ok: true; dados: DadosValidados }
  | { ok: false; erros: Partial<Record<CampoCampanha, string>> };

const t = ptBR.mensagens.campanha;

// Data do campo de data do navegador (AAAA-MM-DD), conferida de verdade.
const data = z
  .string()
  .trim()
  .transform((valor) => valor || null)
  .refine((valor) => valor === null || dataValida(valor), t.dataInvalida);

const esquema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, t.nomeObrigatorio)
    .max(80, t.nomeLongo(80)),
  objetivo: z
    .string()
    .trim()
    .max(500, t.objetivoLongo(500))
    .transform((valor) => valor || null),
  inicio: data,
  fim: data,
  custo: z
    .string()
    .trim()
    .max(40, t.custoInvalido)
    .transform((valor, contexto) => {
      if (valor === "") return null;
      const centavos = lerValorEmCentavos(valor);
      if (centavos === null) {
        contexto.addIssue({ code: "custom", message: t.custoInvalido });
        return z.NEVER;
      }
      return centavos;
    }),
});

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const dia = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().slice(0, 10) === valor;
}

export function validarCampanha(entrada: Record<CampoCampanha, string>): ResultadoCampanha {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) {
    const erros: Partial<Record<CampoCampanha, string>> = {};
    for (const problema of resultado.error.issues) {
      const campo = problema.path[0] as CampoCampanha;
      erros[campo] ??= problema.message;
    }
    return { ok: false, erros };
  }
  const { custo, ...resto } = resultado.data;
  if (resto.inicio && resto.fim && resto.fim < resto.inicio) {
    return { ok: false, erros: { fim: t.fimAntesDoInicio } };
  }
  return { ok: true, dados: { ...resto, custoCentavos: custo } };
}
