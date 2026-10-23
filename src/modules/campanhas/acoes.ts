"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { EstadoAcao } from "@/modules/leads/estados";
import { lerParametrosLista, filtrosDe, type ParametrosDeUrl } from "@/modules/leads/parametros";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { ehUuid } from "@/modules/leads/validacao-textos";
import { exigirPermissao } from "@/modules/organizacoes/contexto";
import { obterConfiguracao } from "@/modules/organizacoes/configuracao";
import { MAXIMO_POR_ADICAO, repositorioCampanhas } from "./repositorio";
import { validarCampanha, type CampoCampanha } from "./validacao";

// Ações das telas de campanhas. Mesmas regras das ações de leads: começam por
// exigirPermissao, validam tudo no servidor e só usam repositórios amarrados à
// empresa da pessoa. O redirecionamento fica fora de try/catch.

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor : "";
}

function camposDaCampanha(dados: FormData): Record<CampoCampanha, string> {
  return {
    nome: texto(dados, "nome"),
    objetivo: texto(dados, "objetivo"),
    inicio: texto(dados, "inicio"),
    fim: texto(dados, "fim"),
    custo: texto(dados, "custo"),
  };
}

function revalidarCampanhas() {
  revalidatePath("/painel/campanhas");
  revalidatePath("/painel/campanhas/[id]", "page");
  revalidatePath("/painel/leads/[id]", "page");
}

export async function criarCampanha(_anterior: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComCampanhas");
  const valores = camposDaCampanha(dados);
  const validado = validarCampanha(valores);
  if (!validado.ok) return { erros: validado.erros, valores };

  const db = getDb();
  const { moeda } = await obterConfiguracao(db, contexto.organizacao.id);
  // Responsável: quem criou. Escolher outra pessoa da equipe vem com a tela de equipe.
  const campanha = await repositorioCampanhas(db, contexto.organizacao.id).criar(
    { ...validado.dados, responsavelId: contexto.usuario.id },
    moeda,
    contexto.usuario.id,
  );
  revalidarCampanhas();
  redirect(`/painel/campanhas/${campanha.id}`);
}

export async function atualizarCampanha(_anterior: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComCampanhas");
  const id = texto(dados, "id");
  const valores = camposDaCampanha(dados);
  const validado = validarCampanha(valores);
  if (!ehUuid(id)) return { mensagem: ptBR.campanhas.naoEncontrada };
  if (!validado.ok) return { erros: validado.erros, valores };

  const db = getDb();
  const repositorio = repositorioCampanhas(db, contexto.organizacao.id);
  const atual = await repositorio.buscar(id);
  if (!atual) return { mensagem: ptBR.campanhas.naoEncontrada };
  const { moeda } = await obterConfiguracao(db, contexto.organizacao.id);
  await repositorio.atualizar(id, { ...validado.dados, responsavelId: atual.responsavelId }, atual.moedaCusto ?? moeda);
  revalidarCampanhas();
  return { sucesso: true, mensagem: ptBR.campanhas.salva };
}

export async function mudarSituacaoCampanha(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("trabalharComCampanhas");
  const id = texto(dados, "id");
  const situacao = texto(dados, "situacao");
  if (!ehUuid(id) || (situacao !== "ativa" && situacao !== "encerrada")) return;
  await repositorioCampanhas(getDb(), contexto.organizacao.id).mudarSituacao(id, situacao);
  revalidarCampanhas();
}

export async function excluirCampanha(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("excluirCampanha");
  const id = texto(dados, "id");
  if (ehUuid(id)) await repositorioCampanhas(getDb(), contexto.organizacao.id).excluir(id);
  revalidarCampanhas();
  redirect("/painel/campanhas");
}

// Coloca na campanha todos os leads que passam nos filtros da lista (busca,
// origem, etapa, etiqueta), até MAXIMO_POR_ADICAO. Os filtros passam pela mesma
// leitura do endereço da lista: valor estranho é descartado.
export async function adicionarLeadsPorFiltro(_anterior: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComCampanhas");
  const campanhaId = texto(dados, "campanhaId");
  if (!ehUuid(campanhaId)) return { mensagem: ptBR.campanhas.naoEncontrada };

  const entrada: ParametrosDeUrl = {
    q: texto(dados, "q"),
    origem: texto(dados, "origem"),
    etapa: texto(dados, "etapa"),
    etiqueta: texto(dados, "etiqueta"),
  };
  const db = getDb();
  const ids = await repositorioLeads(db, contexto.organizacao.id).idsPorFiltro(
    filtrosDe(lerParametrosLista(entrada)),
    MAXIMO_POR_ADICAO,
  );
  const adicionados = await repositorioCampanhas(db, contexto.organizacao.id).adicionarLeads(
    campanhaId,
    ids,
    contexto.usuario.id,
  );
  if (adicionados === null) return { mensagem: ptBR.campanhas.naoEncontrada };
  revalidarCampanhas();
  return {
    sucesso: true,
    mensagem: ptBR.campanhas.adicionados(adicionados, ids.length - adicionados, ids.length >= MAXIMO_POR_ADICAO),
  };
}

// Página do lead: coloca este lead numa campanha.
export async function adicionarLeadNaCampanha(_anterior: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComCampanhas");
  const campanhaId = texto(dados, "campanhaId");
  const leadId = texto(dados, "leadId");
  if (!ehUuid(campanhaId) || !ehUuid(leadId)) return { erros: { campanhaId: ptBR.campanhas.escolhaUma } };
  const adicionados = await repositorioCampanhas(getDb(), contexto.organizacao.id).adicionarLeads(
    campanhaId,
    [leadId],
    contexto.usuario.id,
  );
  if (adicionados === null) return { erros: { campanhaId: ptBR.campanhas.naoEncontrada } };
  revalidarCampanhas();
  return {};
}

export async function removerLeadDaCampanha(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("trabalharComCampanhas");
  const campanhaId = texto(dados, "campanhaId");
  const leadId = texto(dados, "leadId");
  if (!ehUuid(campanhaId) || !ehUuid(leadId)) return;
  await repositorioCampanhas(getDb(), contexto.organizacao.id).removerLead(campanhaId, leadId);
  revalidarCampanhas();
}
