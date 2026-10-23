import "server-only";
import { getDb } from "@/db/client";
import type { Etiqueta, Importacao, Lead } from "@/db/schema";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { obterConfiguracao } from "@/modules/organizacoes/configuracao";
import {
  filtrosDe,
  TAMANHO_DA_PAGINA,
  temFiltroAtivo,
  type ParametrosLista,
} from "./parametros";
import { repositorioEtiquetas, type EtiquetaComTotal } from "./repositorio-etiquetas";
import { repositorioHistorico, type RegistroEtapaComAutor } from "./repositorio-historico";
import { repositorioImportacoes } from "./repositorio-importacoes";
import { repositorioLeads, type ColunaDoQuadro } from "./repositorio";
import { repositorioNotas, type NotaComAutor } from "./repositorio-notas";
import { ehUuid } from "./validacao-textos";

// Consultas usadas pelas telas de leads. As telas não acessam o banco direto:
// passam por aqui, sempre com o contexto (pessoa e empresa) já conferido no servidor.

export type ListaDeLeads = {
  leads: Lead[];
  etiquetasPorLead: Map<string, Etiqueta[]>;
  etiquetas: EtiquetaComTotal[];
  total: number;
  pagina: number;
  paginas: number;
  temFiltro: boolean;
};

export async function obterListaDeLeads(
  contexto: Contexto,
  parametros: ParametrosLista,
): Promise<ListaDeLeads> {
  const db = getDb();
  const leads = repositorioLeads(db, contexto.organizacao.id);
  const etiquetas = repositorioEtiquetas(db, contexto.organizacao.id);
  const filtros = filtrosDe(parametros);

  const [total, todasEtiquetas] = await Promise.all([
    leads.contar(filtros),
    etiquetas.listar(),
  ]);
  const paginas = Math.max(1, Math.ceil(total / TAMANHO_DA_PAGINA));
  const pagina = Math.min(parametros.pagina, paginas);

  const itens = await leads.listar({
    ...filtros,
    limite: TAMANHO_DA_PAGINA,
    deslocamento: (pagina - 1) * TAMANHO_DA_PAGINA,
  });
  const etiquetasPorLead = await etiquetas.dosLeads(itens.map((lead) => lead.id));

  return {
    leads: itens,
    etiquetasPorLead,
    etiquetas: todasEtiquetas,
    total,
    pagina,
    paginas,
    temFiltro: temFiltroAtivo(parametros),
  };
}

export type DetalheDoLead = {
  lead: Lead;
  etiquetas: Etiqueta[];
  etiquetasDisponiveis: Etiqueta[];
  notas: NotaComAutor[];
  historico: RegistroEtapaComAutor[];
  fusoHorario: string;
  // Moeda da empresa, para o valor da venda.
  moeda: string;
  // Quantos outros leads da empresa usam o mesmo e-mail e o mesmo telefone.
  compartilhado: { email: number; telefone: number };
};

// Nulo se o identificador for inválido ou o lead não existir NESTA empresa.
export async function obterDetalheDoLead(
  contexto: Contexto,
  id: string,
): Promise<DetalheDoLead | null> {
  if (!ehUuid(id)) return null;
  const db = getDb();
  const lead = await repositorioLeads(db, contexto.organizacao.id).buscar(id);
  if (!lead) return null;

  const repositorioDeEtiquetas = repositorioEtiquetas(db, contexto.organizacao.id);
  const [porLead, todas, notas, historico, configuracao, compartilhado] = await Promise.all([
    repositorioDeEtiquetas.dosLeads([id]),
    repositorioDeEtiquetas.listar(),
    repositorioNotas(db, contexto.organizacao.id).listar(id),
    repositorioHistorico(db, contexto.organizacao.id).doLead(id),
    obterConfiguracao(db, contexto.organizacao.id),
    repositorioLeads(db, contexto.organizacao.id).contatoCompartilhado(lead),
  ]);

  const etiquetas = porLead.get(id) ?? [];
  const usadas = new Set(etiquetas.map((etiqueta) => etiqueta.id));
  return {
    lead,
    etiquetas,
    etiquetasDisponiveis: todas.filter((etiqueta) => !usadas.has(etiqueta.id)),
    notas,
    historico,
    fusoHorario: configuracao.fusoHorario,
    moeda: configuracao.moeda,
    compartilhado,
  };
}

// Quantos leads cada coluna do quadro mostra. O resto fica na lista, filtrada pela etapa.
export const LEADS_POR_COLUNA = 30;

export type QuadroDoFunil = {
  colunas: ColunaDoQuadro[];
  total: number;
  fusoHorario: string;
};

export async function obterQuadroDoFunil(contexto: Contexto): Promise<QuadroDoFunil> {
  const db = getDb();
  const [colunas, configuracao] = await Promise.all([
    repositorioLeads(db, contexto.organizacao.id).quadro(LEADS_POR_COLUNA),
    obterConfiguracao(db, contexto.organizacao.id),
  ]);
  return {
    colunas,
    total: colunas.reduce((soma, coluna) => soma + coluna.total, 0),
    fusoHorario: configuracao.fusoHorario,
  };
}

// País padrão da empresa, usado no formulário de novo lead.
export async function obterPaisPadrao(contexto: Contexto): Promise<string> {
  const configuracao = await obterConfiguracao(getDb(), contexto.organizacao.id);
  return configuracao.pais;
}

export async function obterEtiquetasDaEmpresa(contexto: Contexto): Promise<EtiquetaComTotal[]> {
  return repositorioEtiquetas(getDb(), contexto.organizacao.id).listar();
}

export type HistoricoDeImportacoes = {
  importacoes: Importacao[];
  fusoHorario: string;
};

export async function obterHistoricoDeImportacoes(
  contexto: Contexto,
): Promise<HistoricoDeImportacoes> {
  const db = getDb();
  const [importacoes, configuracao] = await Promise.all([
    repositorioImportacoes(db, contexto.organizacao.id).listarRecentes(10),
    obterConfiguracao(db, contexto.organizacao.id),
  ]);
  return { importacoes, fusoHorario: configuracao.fusoHorario };
}
