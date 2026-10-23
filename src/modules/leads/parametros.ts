import {
  ETAPAS_FUNIL,
  ORIGENS_LEAD,
  type EtapaFunil,
  type OrigemLead,
} from "@/db/schema/leads";
import type { FiltrosLeads } from "./repositorio";
import { ehUuid } from "./validacao-textos";

// Lê os filtros da lista a partir do endereço da página (?q=...&origem=...&etapa=...).
// O endereço é digitável por qualquer pessoa, então tudo é conferido aqui:
// valor desconhecido é descartado, nunca causa erro.

export const TAMANHO_DA_PAGINA = 25;
const MAXIMO_DA_BUSCA = 100;
const MAXIMO_DE_PAGINAS = 100_000;

export type ParametrosDeUrl = Record<string, string | string[] | undefined>;

export type ParametrosLista = {
  busca: string;
  origem?: OrigemLead;
  etapa?: EtapaFunil;
  etiquetaId?: string;
  pagina: number;
};

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export function lerParametrosLista(entrada: ParametrosDeUrl): ParametrosLista {
  const busca = (primeiro(entrada.q) ?? "").trim().slice(0, MAXIMO_DA_BUSCA);

  const origemInformada = primeiro(entrada.origem);
  const origem = ORIGENS_LEAD.find((valor) => valor === origemInformada);

  const etapaInformada = primeiro(entrada.etapa);
  const etapa = ETAPAS_FUNIL.find((valor) => valor === etapaInformada);

  const etiquetaInformada = primeiro(entrada.etiqueta);
  const etiquetaId = ehUuid(etiquetaInformada) ? etiquetaInformada : undefined;

  const numero = Number.parseInt(primeiro(entrada.pagina) ?? "1", 10);
  const pagina = Number.isFinite(numero) ? Math.min(Math.max(numero, 1), MAXIMO_DE_PAGINAS) : 1;

  return { busca, origem, etapa, etiquetaId, pagina };
}

export function filtrosDe(parametros: ParametrosLista): FiltrosLeads {
  return {
    busca: parametros.busca || undefined,
    origem: parametros.origem,
    etapa: parametros.etapa,
    etiquetaId: parametros.etiquetaId,
  };
}

export function temFiltroAtivo(parametros: ParametrosLista): boolean {
  return Boolean(
    parametros.busca || parametros.origem || parametros.etapa || parametros.etiquetaId,
  );
}

// Monta o endereço de uma página da lista mantendo os filtros.
export function enderecoDaLista(parametros: ParametrosLista, pagina: number): string {
  const consulta = new URLSearchParams();
  if (parametros.busca) consulta.set("q", parametros.busca);
  if (parametros.origem) consulta.set("origem", parametros.origem);
  if (parametros.etapa) consulta.set("etapa", parametros.etapa);
  if (parametros.etiquetaId) consulta.set("etiqueta", parametros.etiquetaId);
  if (pagina > 1) consulta.set("pagina", String(pagina));
  const texto = consulta.toString();
  return texto ? `/painel/leads?${texto}` : "/painel/leads";
}
