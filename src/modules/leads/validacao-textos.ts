import { z } from "zod";
import { CORES_ETIQUETA, type CorEtiqueta } from "@/db/schema/etiquetas";
import { ETAPAS_FUNIL, type EtapaFunil } from "@/db/schema/leads";

// Validação de notas, etiquetas, etapas e identificadores recebidos das telas.
// Roda no servidor, sempre. O que vem do navegador nunca é confiado.

export const TAMANHO_MAXIMO_NOTA = 2000;
export const TAMANHO_MAXIMO_ETIQUETA = 40;

export type ResultadoTexto =
  | { ok: true; texto: string }
  | { ok: false; erro: string };

// Troca caracteres de controle por espaço e junta espaços repetidos.
function limparLinha(valor: string): string {
  return valor.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

export function validarNomeEtiqueta(valor: string): ResultadoTexto {
  const texto = limparLinha(valor);
  if (texto === "") return { ok: false, erro: "Informe o nome da etiqueta." };
  if (texto.length > TAMANHO_MAXIMO_ETIQUETA) {
    return {
      ok: false,
      erro: `O nome pode ter no máximo ${TAMANHO_MAXIMO_ETIQUETA} caracteres.`,
    };
  }
  return { ok: true, texto };
}

// Nota de várias linhas: mantém as quebras de linha, remove os demais
// caracteres de controle e espaços nas pontas.
export function validarTextoNota(valor: string): ResultadoTexto {
  const texto = valor
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (texto === "") return { ok: false, erro: "Escreva a nota antes de adicionar." };
  if (texto.length > TAMANHO_MAXIMO_NOTA) {
    return {
      ok: false,
      erro: `A nota pode ter no máximo ${TAMANHO_MAXIMO_NOTA} caracteres.`,
    };
  }
  return { ok: true, texto };
}

export function ehUuid(valor: unknown): valor is string {
  return z.uuid().safeParse(valor).success;
}

const esquemaEtapa = z.enum(ETAPAS_FUNIL);

// Etapa do funil vinda de um formulário. Valor desconhecido devolve nulo:
// a ação recusa, em vez de trocar por uma etapa padrão sem a pessoa pedir.
export function etapaValida(valor: unknown): EtapaFunil | null {
  const resultado = esquemaEtapa.safeParse(valor);
  return resultado.success ? resultado.data : null;
}

export function corValida(valor: unknown): CorEtiqueta {
  return CORES_ETIQUETA.find((cor) => cor === valor) ?? "neutra";
}
