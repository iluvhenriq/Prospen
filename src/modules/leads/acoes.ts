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
import { consumirLimiteDeImportacao } from "./limite-importacao";
import {
  ErroLeadDuplicado,
  repositorioLeads,
  type DuplicadoEncontrado,
} from "./repositorio";
import { repositorioEtiquetas } from "./repositorio-etiquetas";
import { repositorioContatos } from "./repositorio-contatos";
import { repositorioNotas } from "./repositorio-notas";
import { validarLead, type CampoLead } from "./validacao";
import { validarContato, validarProximaAcao, type CampoContato } from "./validacao-contato";
import { lerValorEmCentavos } from "./valor";
import {
  corValida,
  ehUuid,
  etapaValida,
  motivoPerdaValido,
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
  campo: DuplicadoEncontrado["campo"],
  valores: Record<string, string>,
  existente?: DuplicadoEncontrado["lead"],
): EstadoAcao {
  return {
    erros: { [campo]: ptBR.leads.formulario.duplicado[campo] },
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

// Resultado do funil (etapa 7). O lead precisa estar na etapa certa no momento
// da gravação: o repositório confere dentro do próprio comando.
export async function registrarMotivoPerda(_anterior: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const t = ptBR.funil.resultado;
  const leadId = texto(dados, "leadId");
  const informado = texto(dados, "motivo");
  // Vazio apaga o motivo; qualquer outro valor precisa estar na lista.
  const motivo = informado === "" ? null : motivoPerdaValido(informado);
  if (!ehUuid(leadId) || (informado !== "" && !motivo)) return { erros: { motivo: t.motivoInvalido } };

  const gravou = await repositorioLeads(getDb(), contexto.organizacao.id).registrarMotivoPerda(leadId, motivo);
  if (!gravou) return { mensagem: t.etapaMudou };
  revalidarFunil();
  return { sucesso: true, mensagem: t.salvo };
}

export async function registrarValorVenda(_anterior: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const t = ptBR.funil.resultado;
  const leadId = texto(dados, "leadId");
  const informado = texto(dados, "valor").trim().slice(0, 40);
  const centavos = informado === "" ? null : lerValorEmCentavos(informado);
  if (!ehUuid(leadId) || (informado !== "" && centavos === null)) {
    return { erros: { valor: t.valorInvalido }, valores: { valor: informado } };
  }

  const db = getDb();
  // A moeda é a da empresa, nunca a do formulário.
  const { moeda } = await obterConfiguracao(db, contexto.organizacao.id);
  const gravou = await repositorioLeads(db, contexto.organizacao.id).registrarValorVenda(leadId, centavos, moeda);
  if (!gravou) return { mensagem: t.etapaMudou };
  revalidarFunil();
  return { sucesso: true, mensagem: t.salvo };
}

function revalidarFunil() {
  revalidatePath("/painel/funil");
  revalidatePath("/painel/leads/[id]", "page");
  revalidatePath("/painel");
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
// Contatos e próxima ação (27/10/2026)
// ----------------------------------------------------------------------------

function camposDoContato(dados: FormData): Record<CampoContato, string> {
  return {
    canal: texto(dados, "canal"),
    resultado: texto(dados, "resultado"),
    proximaAcaoEm: texto(dados, "proximaAcaoEm"),
    proximaAcao: texto(dados, "proximaAcao"),
  };
}

function revalidarAgenda() {
  revalidatePath("/painel/leads/[id]", "page");
  revalidatePath("/painel/hoje");
  revalidatePath("/painel/leads");
}

// Registra uma tentativa de contato. Quem estava em "Novo" passa para
// "Contatado" (menos quando o contato estava errado). A próxima ação que estava
// marcada é dada como feita: fica a nova, se informada, ou nenhuma.
export async function registrarContato(_anterior: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const leadId = texto(dados, "leadId");
  const valores = camposDoContato(dados);
  if (!ehUuid(leadId)) return { mensagem: ptBR.leads.formulario.falhou, valores };

  const resultado = validarContato(valores);
  if (!resultado.ok) return { erros: resultado.erros, valores };
  const { canal, resultado: oQueAconteceu, proxima } = resultado.dados;

  const db = getDb();
  const leads = repositorioLeads(db, contexto.organizacao.id);
  let movido = false;
  try {
    const contato = await repositorioContatos(db, contexto.organizacao.id).registrar(
      leadId,
      canal,
      oQueAconteceu,
      contexto.usuario.id,
    );
    if (!contato) return { mensagem: ptBR.leads.formulario.falhou, valores };

    const lead = await leads.buscar(leadId);
    if (lead?.etapa === "novo" && oQueAconteceu !== "contato_errado") {
      movido = Boolean((await leads.mudarEtapa(leadId, "contatado", contexto.usuario.id))?.mudou);
    }
    await leads.definirProximaAcao(leadId, proxima.em, proxima.texto);
  } catch (erro) {
    console.error("Falha ao registrar o contato:", erro instanceof Error ? erro.message : erro);
    return { mensagem: ptBR.leads.formulario.falhou, valores };
  }

  revalidarAgenda();
  if (movido) revalidarFunil();
  return { sucesso: true, mensagem: movido ? ptBR.contatos.registradoEMovido : ptBR.contatos.registrado };
}

// Marca, muda ou apaga (data vazia) a próxima ação de um lead.
export async function salvarProximaAcao(_anterior: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const leadId = texto(dados, "leadId");
  // O botão "Remover" manda remover=1: aí os campos não importam.
  const remover = texto(dados, "remover") === "1";
  const valores = remover
    ? { proximaAcaoEm: "", proximaAcao: "" }
    : { proximaAcaoEm: texto(dados, "proximaAcaoEm"), proximaAcao: texto(dados, "proximaAcao") };
  if (!ehUuid(leadId)) return { mensagem: ptBR.leads.formulario.falhou, valores };

  const resultado = validarProximaAcao(valores);
  if (!resultado.ok) return { erros: resultado.erros, valores };

  try {
    const lead = await repositorioLeads(getDb(), contexto.organizacao.id).definirProximaAcao(
      leadId,
      resultado.dados.em,
      resultado.dados.texto,
    );
    if (!lead) return { mensagem: ptBR.leads.formulario.falhou, valores };
  } catch (erro) {
    console.error("Falha ao salvar a próxima ação:", erro instanceof Error ? erro.message : erro);
    return { mensagem: ptBR.leads.formulario.falhou, valores };
  }

  revalidarAgenda();
  return { sucesso: true, mensagem: resultado.dados.em ? ptBR.contatos.proximaSalva : ptBR.contatos.proximaRemovida };
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
      return { erros: { etiquetaId: ptBR.mensagens.etiqueta.escolhaOuCrie } };
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

  const intencao = texto(dados, "intencao") === "importar" ? "importar" : "conferir";
  const limite = consumirLimiteDeImportacao(contexto.organizacao.id, intencao);
  if (limite.bloqueado) {
    return { erro: ptBR.leads.importacao.muitasSeguidas(Math.ceil(limite.segundosParaLiberar / 60)) };
  }

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

    if (intencao === "conferir") {
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
