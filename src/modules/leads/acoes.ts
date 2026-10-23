"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { ptBR } from "@/lib/i18n/pt-BR";
import {
  ErroSemPermissao,
  papelPode,
} from "@/modules/organizacoes/membros";
import { exigirPermissao } from "@/modules/organizacoes/contexto";
import { obterConfiguracao } from "@/modules/organizacoes/configuracao";
import type { EstadoAcao, EstadoImportacao, ResumoAnalise } from "./estados";
import {
  analisarCsv,
  executarImportacao,
  type AnaliseImportacao,
} from "./importacao";
import { LIMITE_BYTES } from "./csv";
import {
  ErroLeadDuplicado,
  repositorioLeads,
  type DuplicadoEncontrado,
} from "./repositorio";
import { repositorioEtiquetas } from "./repositorio-etiquetas";
import { repositorioNotas } from "./repositorio-notas";
import { validarLead, type CampoLead } from "./validacao";
import {
  corValida,
  ehUuid,
  etapaValida,
  validarNomeEtiqueta,
  validarTextoNota,
} from "./validacao-textos";

// Ações dos formulários de leads, notas, etiquetas e importação.
//
// Regras de TODA ação daqui:
// 1. Começa conferindo login, empresa e papel no servidor (exigirPermissao).
// 2. Valida a entrada no servidor, mesmo que a tela já tenha validado.
// 3. Usa só repositórios amarrados à empresa da pessoa. Identificadores
//    vindos do formulário nunca escolhem a empresa.
// O redirecionamento fica fora de try/catch porque o Next o faz lançando uma
// exceção interna.

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor : "";
}

function camposDoLead(dados: FormData): Record<CampoLead, string> {
  return {
    nome: texto(dados, "nome"),
    empresa: texto(dados, "empresa"),
    email: texto(dados, "email"),
    telefone: texto(dados, "telefone"),
    pais: texto(dados, "pais"),
  };
}

function respostaDuplicado(
  campo: "email" | "telefone",
  valores: Record<string, string>,
  existente?: DuplicadoEncontrado["lead"],
): EstadoAcao {
  const nomeDoCampo = campo === "email" ? "e-mail" : "telefone";
  return {
    erros: { [campo]: `Já existe um lead com este ${nomeDoCampo}.` },
    valores,
    duplicado: existente,
  };
}

// ----------------------------------------------------------------------------
// Leads
// ----------------------------------------------------------------------------

export async function criarLead(
  _anterior: EstadoAcao,
  dados: FormData,
): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const bruto = camposDoLead(dados);
  const resultado = validarLead(bruto);
  if (!resultado.ok) return { erros: resultado.erros, valores: bruto };

  const repositorio = repositorioLeads(getDb(), contexto.organizacao.id);
  const contato = {
    email: resultado.dados.email,
    telefone: resultado.dados.telefone,
    pais: resultado.dados.pais,
  };

  const jaExistentes = await repositorio.encontrarDuplicados(contato);
  if (jaExistentes.length > 0) {
    return respostaDuplicado(jaExistentes[0].campo, bruto, jaExistentes[0].lead);
  }

  let id: string;
  try {
    const lead = await repositorio.criar(
      { ...resultado.dados, origem: "manual" },
      contexto.usuario.id,
    );
    id = lead.id;
  } catch (erro) {
    // Outra pessoa pode ter cadastrado o mesmo contato neste exato instante.
    if (erro instanceof ErroLeadDuplicado) {
      const achados = await repositorio.encontrarDuplicados(contato);
      return respostaDuplicado(erro.campo, bruto, achados[0]?.lead);
    }
    console.error("Falha ao criar o lead:", erro instanceof Error ? erro.message : erro);
    return { mensagem: ptBR.leads.formulario.falhou, valores: bruto };
  }

  revalidatePath("/painel/leads");
  revalidatePath("/painel");
  redirect(`/painel/leads/${id}`);
}

export async function atualizarLead(
  _anterior: EstadoAcao,
  dados: FormData,
): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const bruto = camposDoLead(dados);
  const id = texto(dados, "id");
  if (!ehUuid(id)) return { mensagem: ptBR.leads.formulario.falhou, valores: bruto };

  const resultado = validarLead(bruto);
  if (!resultado.ok) return { erros: resultado.erros, valores: bruto };

  const repositorio = repositorioLeads(getDb(), contexto.organizacao.id);
  const contato = {
    email: resultado.dados.email,
    telefone: resultado.dados.telefone,
    pais: resultado.dados.pais,
  };

  const jaExistentes = await repositorio.encontrarDuplicados({ ...contato, ignorarId: id });
  if (jaExistentes.length > 0) {
    return respostaDuplicado(jaExistentes[0].campo, bruto, jaExistentes[0].lead);
  }

  try {
    const atualizado = await repositorio.atualizar(id, resultado.dados);
    // Nulo: o lead não existe nesta empresa (apagado por outra pessoa, ou de outra empresa).
    if (!atualizado) return { mensagem: ptBR.leads.formulario.falhou, valores: bruto };
  } catch (erro) {
    if (erro instanceof ErroLeadDuplicado) {
      const achados = await repositorio.encontrarDuplicados({ ...contato, ignorarId: id });
      return respostaDuplicado(erro.campo, bruto, achados[0]?.lead);
    }
    console.error("Falha ao atualizar o lead:", erro instanceof Error ? erro.message : erro);
    return { mensagem: ptBR.leads.formulario.falhou, valores: bruto };
  }

  revalidatePath("/painel/leads/[id]", "page");
  revalidatePath("/painel/leads");
  return { sucesso: true, mensagem: ptBR.leads.formulario.salvo, valores: bruto };
}

export async function excluirLead(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const id = texto(dados, "id");
  if (ehUuid(id)) {
    await repositorioLeads(getDb(), contexto.organizacao.id).excluir(id);
  }
  revalidatePath("/painel/leads");
  revalidatePath("/painel");
  redirect("/painel/leads");
}

// ----------------------------------------------------------------------------
// Funil
// ----------------------------------------------------------------------------

// Usada pelo quadro do funil e pela página do lead. Lead de outra empresa ou
// apagado no meio do caminho: não faz nada, como em "não existe".
export async function mudarEtapaDoLead(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const leadId = texto(dados, "leadId");
  const etapa = etapaValida(texto(dados, "etapa"));
  if (!ehUuid(leadId) || !etapa) return;

  const resultado = await repositorioLeads(getDb(), contexto.organizacao.id).mudarEtapa(
    leadId,
    etapa,
    contexto.usuario.id,
  );
  if (!resultado?.mudou) return;

  revalidatePath("/painel/funil");
  revalidatePath("/painel/leads/[id]", "page");
  revalidatePath("/painel/leads");
}

// ----------------------------------------------------------------------------
// Notas
// ----------------------------------------------------------------------------

export async function adicionarNota(
  _anterior: EstadoAcao,
  dados: FormData,
): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const bruto = texto(dados, "texto");
  const leadId = texto(dados, "leadId");
  if (!ehUuid(leadId)) return { mensagem: ptBR.leads.formulario.falhou, valores: { texto: bruto } };

  const resultado = validarTextoNota(bruto);
  if (!resultado.ok) return { erros: { texto: resultado.erro }, valores: { texto: bruto } };

  try {
    const nota = await repositorioNotas(getDb(), contexto.organizacao.id).criar(
      leadId,
      resultado.texto,
      contexto.usuario.id,
    );
    if (!nota) return { mensagem: ptBR.leads.formulario.falhou, valores: { texto: bruto } };
  } catch (erro) {
    console.error("Falha ao criar a nota:", erro instanceof Error ? erro.message : erro);
    return { mensagem: ptBR.leads.formulario.falhou, valores: { texto: bruto } };
  }

  revalidatePath("/painel/leads/[id]", "page");
  return { sucesso: true };
}

export async function excluirNota(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const notaId = texto(dados, "notaId");
  if (!ehUuid(notaId)) return;

  const repositorio = repositorioNotas(getDb(), contexto.organizacao.id);
  const nota = await repositorio.buscar(notaId);
  if (!nota) return;

  // Cada pessoa apaga as próprias notas. Administradores e donos apagam qualquer uma.
  const ehAutor = nota.autorId === contexto.usuario.id;
  if (!ehAutor && !papelPode(contexto.papel, "gerenciarEquipe")) {
    throw new ErroSemPermissao("gerenciarEquipe");
  }

  await repositorio.excluir(notaId);
  revalidatePath("/painel/leads/[id]", "page");
}

// ----------------------------------------------------------------------------
// Etiquetas
// ----------------------------------------------------------------------------

export async function atribuirEtiqueta(
  _anterior: EstadoAcao,
  dados: FormData,
): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const leadId = texto(dados, "leadId");
  const nova = texto(dados, "nova");
  const escolhida = texto(dados, "etiquetaId");
  if (!ehUuid(leadId)) return { mensagem: ptBR.leads.formulario.falhou };

  const repositorio = repositorioEtiquetas(getDb(), contexto.organizacao.id);
  let etiquetaId = escolhida;

  try {
    if (nova.trim() !== "") {
      const nome = validarNomeEtiqueta(nova);
      if (!nome.ok) return { erros: { nova: nome.erro }, valores: { nova } };
      etiquetaId = (await repositorio.obterOuCriar(nome.texto)).etiqueta.id;
    } else if (!ehUuid(etiquetaId)) {
      return { erros: { etiquetaId: "Escolha uma etiqueta ou digite o nome de uma nova." } };
    }

    const ligada = await repositorio.atribuir(leadId, etiquetaId);
    if (!ligada) return { mensagem: ptBR.leads.formulario.falhou };
  } catch (erro) {
    console.error("Falha ao adicionar a etiqueta:", erro instanceof Error ? erro.message : erro);
    return { mensagem: ptBR.leads.formulario.falhou };
  }

  revalidatePath("/painel/leads/[id]", "page");
  revalidatePath("/painel/leads");
  return { sucesso: true };
}

export async function removerEtiquetaDoLead(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const leadId = texto(dados, "leadId");
  const etiquetaId = texto(dados, "etiquetaId");
  if (!ehUuid(leadId) || !ehUuid(etiquetaId)) return;

  await repositorioEtiquetas(getDb(), contexto.organizacao.id).remover(leadId, etiquetaId);
  revalidatePath("/painel/leads/[id]", "page");
  revalidatePath("/painel/leads");
}

export async function criarEtiqueta(
  _anterior: EstadoAcao,
  dados: FormData,
): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const bruto = texto(dados, "nome");
  const nome = validarNomeEtiqueta(bruto);
  if (!nome.ok) return { erros: { nome: nome.erro }, valores: { nome: bruto } };

  try {
    const { criada } = await repositorioEtiquetas(getDb(), contexto.organizacao.id).obterOuCriar(
      nome.texto,
      corValida(texto(dados, "cor")),
    );
    if (!criada) {
      return { erros: { nome: ptBR.leads.etiquetasPagina.jaExiste }, valores: { nome: bruto } };
    }
  } catch (erro) {
    console.error("Falha ao criar a etiqueta:", erro instanceof Error ? erro.message : erro);
    return { mensagem: ptBR.leads.formulario.falhou, valores: { nome: bruto } };
  }

  revalidatePath("/painel/leads/etiquetas");
  revalidatePath("/painel/leads");
  return { sucesso: true, mensagem: ptBR.leads.etiquetasPagina.criada };
}

export async function excluirEtiqueta(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("gerenciarEtiquetas");
  const etiquetaId = texto(dados, "etiquetaId");
  if (!ehUuid(etiquetaId)) return;

  await repositorioEtiquetas(getDb(), contexto.organizacao.id).excluir(etiquetaId);
  revalidatePath("/painel/leads/etiquetas");
  revalidatePath("/painel/leads");
  revalidatePath("/painel/leads/[id]", "page");
}

// ----------------------------------------------------------------------------
// Importação de planilha
// ----------------------------------------------------------------------------

// Fica só com o que a tela precisa. As linhas aceitas (dados pessoais) nunca
// saem do servidor.
function resumirAnalise(analise: AnaliseImportacao): ResumoAnalise {
  return {
    nomeArquivo: analise.nomeArquivo,
    totalLinhas: analise.totalLinhas,
    aImportar: analise.aceitas.length,
    duplicadas: analise.duplicadas,
    rejeitadas: analise.rejeitadas,
    ocorrencias: analise.ocorrencias,
    ocorrenciasOmitidas: analise.ocorrenciasOmitidas,
    colunas: analise.colunas,
    avisos: analise.avisos,
  };
}

// Duas intenções com o mesmo arquivo: "conferir" (não grava nada) e "importar".
// A tela só oferece "importar" depois de mostrar o resultado da conferência, e o
// servidor refaz a análise completa antes de gravar.
export async function importarPlanilha(
  _anterior: EstadoImportacao,
  dados: FormData,
): Promise<EstadoImportacao> {
  const contexto = await exigirPermissao("trabalharComLeads");

  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: ptBR.leads.importacao.escolhaArquivo };
  }
  if (arquivo.size > LIMITE_BYTES) return { erro: ptBR.leads.importacao.arquivoGrande };

  try {
    const db = getDb();
    const configuracao = await obterConfiguracao(db, contexto.organizacao.id);
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const analise = await analisarCsv(
      repositorioLeads(db, contexto.organizacao.id),
      bytes,
      arquivo.name,
      configuracao.pais,
    );
    if (!analise.ok) return { erro: analise.erro };

    if (texto(dados, "intencao") !== "importar") {
      return { analise: resumirAnalise(analise) };
    }

    const resultado = await executarImportacao(
      db,
      contexto.organizacao.id,
      contexto.usuario.id,
      analise,
    );
    revalidatePath("/painel");
    revalidatePath("/painel/leads");
    revalidatePath("/painel/leads/importar");
    return { analise: resumirAnalise(analise), resultado };
  } catch (erro) {
    console.error("Falha na importação:", erro instanceof Error ? erro.message : erro);
    return { erro: ptBR.leads.importacao.falhou };
  }
}
