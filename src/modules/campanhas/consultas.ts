import "server-only";
import { getDb } from "@/db/client";
import type { Campanha, Lead } from "@/db/schema";
import { repositorioEtiquetas, type EtiquetaComTotal } from "@/modules/leads/repositorio-etiquetas";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { obterConfiguracao } from "@/modules/organizacoes/configuracao";
import { ehUuid } from "@/modules/leads/validacao-textos";
import { repositorioCampanhas, type CampanhaComNumeros } from "./repositorio";

// Consultas das telas de campanhas, sempre com o contexto já conferido.

export type ListaDeCampanhas = { campanhas: CampanhaComNumeros[]; moeda: string };

export async function obterCampanhas(contexto: Contexto): Promise<ListaDeCampanhas> {
  const db = getDb();
  const { moeda } = await obterConfiguracao(db, contexto.organizacao.id);
  return { campanhas: await repositorioCampanhas(db, contexto.organizacao.id).listar(moeda), moeda };
}

export type DetalheDaCampanha = {
  campanha: CampanhaComNumeros;
  leads: Lead[];
  etiquetas: EtiquetaComTotal[];
  moeda: string;
  fusoHorario: string;
};

// Nulo se o identificador for inválido ou a campanha não for DESTA empresa.
export async function obterCampanha(contexto: Contexto, id: string): Promise<DetalheDaCampanha | null> {
  if (!ehUuid(id)) return null;
  const db = getDb();
  const { moeda, fusoHorario } = await obterConfiguracao(db, contexto.organizacao.id);
  const repositorio = repositorioCampanhas(db, contexto.organizacao.id);
  const campanha = await repositorio.buscarComNumeros(id, moeda);
  if (!campanha) return null;
  const [leads, etiquetas] = await Promise.all([
    repositorio.leadsDaCampanha(id),
    repositorioEtiquetas(db, contexto.organizacao.id).listar(),
  ]);
  return { campanha, leads, etiquetas, moeda, fusoHorario };
}

export type CampanhasDoLead = { doLead: Campanha[]; ativas: Campanha[] };

// Página do lead: em quais campanhas ele está e em quais ativas pode entrar.
export async function obterCampanhasDoLead(contexto: Contexto, leadId: string): Promise<CampanhasDoLead> {
  const db = getDb();
  const repositorio = repositorioCampanhas(db, contexto.organizacao.id);
  const { moeda } = await obterConfiguracao(db, contexto.organizacao.id);
  const [doLead, todas] = await Promise.all([repositorio.doLead(leadId), repositorio.listar(moeda)]);
  const ja = new Set(doLead.map((campanha) => campanha.id));
  return { doLead, ativas: todas.filter((campanha) => campanha.situacao === "ativa" && !ja.has(campanha.id)) };
}

export async function obterMoedaDaEmpresa(contexto: Contexto): Promise<string> {
  const { moeda } = await obterConfiguracao(getDb(), contexto.organizacao.id);
  return moeda;
}
