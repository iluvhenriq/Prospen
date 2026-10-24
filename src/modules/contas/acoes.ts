"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { getAuth } from "@/lib/auth";
import {
  registrarTentativa,
  verificarLimite,
  zerarTentativas,
} from "@/lib/limite-tentativas";
import { exigirUsuario } from "@/modules/organizacoes/contexto";
import { resolverOrganizacao } from "@/modules/organizacoes/membros";
import { traduzirErroLogin } from "./erros";
import { registrarAcesso } from "./registros-acesso";
import { ipDaRequisicao, LIMITES, mensagemDeEspera } from "./limites";
import {
  errosPorCampo,
  esquemaCadastro,
  esquemaEntrada,
  esquemaOrganizacao,
  gerarSlug,
  type EstadoFormulario,
} from "./validacao";

// Ações dos formulários de conta. Cada uma valida a entrada no servidor,
// chama o login e só então redireciona. O redirecionamento fica fora do
// try/catch porque ele funciona lançando uma exceção interna do Next.js.

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor : "";
}

export async function cadastrar(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const bruto = { nome: texto(dados, "nome"), email: texto(dados, "email"), senha: texto(dados, "senha") };
  const valores = { nome: bruto.nome, email: bruto.email };
  const resultado = esquemaCadastro.safeParse(bruto);
  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error), valores };
  }

  const cabecalhos = await headers();
  const ip = ipDaRequisicao(cabecalhos);
  const chaveIp = ip ? `cadastro:ip:${ip}` : null;
  if (chaveIp) {
    const situacao = verificarLimite(chaveIp, LIMITES.cadastroPorIp);
    if (situacao.bloqueado) {
      return { mensagem: mensagemDeEspera(situacao.segundosParaLiberar), valores };
    }
    // Conta toda tentativa que chega ao login, deu certo ou não.
    registrarTentativa(chaveIp, LIMITES.cadastroPorIp.janelaMs);
  }

  let novoUsuario: string;
  try {
    const criado = await getAuth().api.signUpEmail({
      body: {
        name: resultado.data.nome,
        email: resultado.data.email,
        password: resultado.data.senha,
      },
      headers: cabecalhos,
    });
    novoUsuario = criado.user.id;
  } catch (erro) {
    console.error("Falha no cadastro:", erro instanceof Error ? erro.message : erro);
    return { mensagem: traduzirErroLogin(erro), valores };
  }

  // O cadastro já entra na conta: conta como acesso (Marco Civil, art. 15).
  await anotarAcesso(novoUsuario, ip);
  redirect("/criar-organizacao");
}

export async function entrar(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const bruto = { email: texto(dados, "email"), senha: texto(dados, "senha") };
  const valores = { email: bruto.email };
  const resultado = esquemaEntrada.safeParse(bruto);
  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error), valores };
  }

  const cabecalhos = await headers();
  const ip = ipDaRequisicao(cabecalhos);
  const chaveEmail = `entrada:email:${resultado.data.email}`;
  const chaveIp = ip ? `entrada:ip:${ip}` : null;

  // Antes de testar a senha: quem já errou demais precisa esperar.
  const porEmail = verificarLimite(chaveEmail, LIMITES.entradaPorEmail);
  const porIp = chaveIp ? verificarLimite(chaveIp, LIMITES.entradaPorIp) : null;
  const bloqueio = porEmail.bloqueado ? porEmail : porIp?.bloqueado ? porIp : null;
  if (bloqueio) {
    return { mensagem: mensagemDeEspera(bloqueio.segundosParaLiberar), valores };
  }

  let usuarioId: string;
  try {
    const entrada = await getAuth().api.signInEmail({
      body: { email: resultado.data.email, password: resultado.data.senha },
      headers: cabecalhos,
    });
    usuarioId = entrada.user.id;
  } catch (erro) {
    console.error("Falha na entrada:", erro instanceof Error ? erro.message : erro);
    registrarTentativa(chaveEmail, LIMITES.entradaPorEmail.janelaMs);
    if (chaveIp) registrarTentativa(chaveIp, LIMITES.entradaPorIp.janelaMs);
    return { mensagem: traduzirErroLogin(erro), valores };
  }

  // Login certo: a conta volta a ter todas as tentativas.
  zerarTentativas(chaveEmail);
  await anotarAcesso(usuarioId, ip);

  // O painel manda para a criação da empresa se a pessoa ainda não tiver uma.
  redirect("/painel");
}

// Registro de acesso exigido pelo Marco Civil. Se falhar, a pessoa entra mesmo
// assim (o login já aconteceu), e o terminal registra a falha, sem dado pessoal.
async function anotarAcesso(usuarioId: string, ip: string | null): Promise<void> {
  try {
    await registrarAcesso(getDb(), usuarioId, ip);
  } catch (erro) {
    console.error("Falha ao gravar o registro de acesso:", erro instanceof Error ? erro.message : erro);
  }
}

export async function sair(): Promise<void> {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch (erro) {
    console.error("Falha ao sair:", erro instanceof Error ? erro.message : erro);
  }
  redirect("/entrar");
}

export async function criarOrganizacao(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const sessao = await exigirUsuario();

  // Uma empresa por pessoa, por enquanto. Quem já tem vai direto ao painel.
  if (await resolverOrganizacao(getDb(), sessao.user.id)) redirect("/painel");

  const bruto = { nome: texto(dados, "nome") };
  const resultado = esquemaOrganizacao.safeParse(bruto);
  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error), valores: { nome: bruto.nome } };
  }

  try {
    await getAuth().api.createOrganization({
      body: { name: resultado.data.nome, slug: gerarSlug(resultado.data.nome) },
      headers: await headers(),
    });
  } catch (erro) {
    console.error("Falha ao criar a empresa:", erro instanceof Error ? erro.message : erro);
    return { mensagem: traduzirErroLogin(erro), valores: { nome: bruto.nome } };
  }

  redirect("/painel");
}
