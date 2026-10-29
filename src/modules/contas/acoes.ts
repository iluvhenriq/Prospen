"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { getAuth } from "@/lib/auth";
import { ptBR } from "@/lib/i18n/pt-BR";
import {
  registrarTentativa,
  verificarLimite,
  zerarTentativas,
} from "@/lib/limite-tentativas";
import { exigirUsuario } from "@/modules/organizacoes/contexto";
import { conviteIdValido } from "@/modules/organizacoes/equipe";
import { resolverOrganizacao } from "@/modules/organizacoes/membros";
import { emailDoToken, situacaoDoEmail } from "./confirmacao";
import { codigoDoErro, traduzirErroLogin } from "./erros";
import { registrarAcesso } from "./registros-acesso";
import { ipDaRequisicao, LIMITES, mensagemDeEspera } from "./limites";
import {
  errosPorCampo,
  esquemaCadastro,
  esquemaEntrada,
  esquemaNovaSenha,
  esquemaOrganizacao,
  esquemaPedidoDeSenha,
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

// Quem veio de um link de convite volta para ele depois de entrar ou criar a
// conta. Só um identificador no formato certo vira endereço (nada de levar a
// pessoa para fora do site).
function destinoDoConvite(dados: FormData): string | null {
  const convite = dados.get("convite");
  return conviteIdValido(convite) ? `/convite/${convite}` : null;
}

// O login leva este destino para o link do e-mail de confirmação: quem veio
// de um convite volta para ele depois de confirmar.
function destinoParaOLogin(dados: FormData): { callbackURL?: string } {
  const destino = destinoDoConvite(dados);
  return destino ? { callbackURL: destino } : {};
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

  try {
    // A conta só abre depois de confirmar o e-mail: o login manda o link.
    // E-mail que já tem conta recebe a mesma resposta (e um aviso no e-mail),
    // para a tela não revelar quem tem conta.
    await getAuth().api.signUpEmail({
      body: {
        name: resultado.data.nome,
        email: resultado.data.email,
        password: resultado.data.senha,
        ...destinoParaOLogin(dados),
      },
      headers: cabecalhos,
    });
  } catch (erro) {
    console.error("Falha no cadastro:", erro instanceof Error ? erro.message : erro);
    return { mensagem: traduzirErroLogin(erro), valores };
  }

  return { sucesso: ptBR.acesso.cadastro.enviado(resultado.data.email) };
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
      body: { email: resultado.data.email, password: resultado.data.senha, ...destinoParaOLogin(dados) },
      headers: cabecalhos,
    });
    usuarioId = entrada.user.id;
  } catch (erro) {
    // Senha certa, e-mail ainda não confirmado: o login já mandou um link novo.
    // Não conta como tentativa errada.
    if (codigoDoErro(erro) === "EMAIL_NOT_VERIFIED") {
      return { mensagem: traduzirErroLogin(erro), valores };
    }
    console.error("Falha na entrada:", erro instanceof Error ? erro.message : erro);
    registrarTentativa(chaveEmail, LIMITES.entradaPorEmail.janelaMs);
    if (chaveIp) registrarTentativa(chaveIp, LIMITES.entradaPorIp.janelaMs);
    return { mensagem: traduzirErroLogin(erro), valores };
  }

  // Login certo: a conta volta a ter todas as tentativas.
  zerarTentativas(chaveEmail);
  await anotarAcesso(usuarioId, ip);

  // O painel manda para a criação da empresa se a pessoa ainda não tiver uma.
  redirect(destinoDoConvite(dados) ?? "/painel");
}

// Botão do link de confirmação. O login confere o token, marca o e-mail como
// confirmado e já abre a sessão; o link vira inútil para entrar de novo.
export async function confirmarEmail(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const t = ptBR.acesso.confirmar;
  const token = texto(dados, "token");
  const email = emailDoToken(token);
  if (!email) return { mensagem: t.semLink };

  const db = getDb();
  // Lido antes: depois da confirmação não daria para saber se já estava confirmado.
  const antes = await situacaoDoEmail(db, email);
  const cabecalhos = await headers();
  try {
    await getAuth().api.verifyEmail({ query: { token }, headers: cabecalhos });
  } catch (erro) {
    console.error("Falha na confirmação do e-mail:", erro instanceof Error ? erro.message : erro);
    return { mensagem: t.invalido };
  }
  if (!antes) return { mensagem: t.invalido };

  const convite = dados.get("convite");
  const comConvite = conviteIdValido(convite);
  // Link já usado: não abre sessão (senão o link valeria como senha por 1 dia).
  if (antes.confirmado) redirect(`/entrar?confirmado=1${comConvite ? `&convite=${convite}` : ""}`);

  // A confirmação entra na conta: conta como acesso (Marco Civil, art. 15).
  await anotarAcesso(antes.id, ipDaRequisicao(cabecalhos));
  redirect(comConvite ? `/convite/${convite}` : "/criar-organizacao");
}

export async function pedirNovaSenha(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const bruto = { email: texto(dados, "email") };
  const resultado = esquemaPedidoDeSenha.safeParse(bruto);
  if (!resultado.success) {
    return { erros: errosPorCampo(resultado.error), valores: bruto };
  }

  // Cada pedido manda um e-mail: limite por e-mail e por endereço.
  const ip = ipDaRequisicao(await headers());
  const chaves = [
    { chave: `senha:email:${resultado.data.email}`, regra: LIMITES.novaSenhaPorEmail },
    ...(ip ? [{ chave: `senha:ip:${ip}`, regra: LIMITES.novaSenhaPorIp }] : []),
  ];
  const bloqueio = chaves.map(({ chave, regra }) => verificarLimite(chave, regra)).find((s) => s.bloqueado);
  if (bloqueio) return { mensagem: mensagemDeEspera(bloqueio.segundosParaLiberar), valores: bruto };
  for (const { chave, regra } of chaves) registrarTentativa(chave, regra.janelaMs);

  try {
    await getAuth().api.requestPasswordReset({ body: { email: resultado.data.email } });
  } catch (erro) {
    console.error("Falha no pedido de senha nova:", erro instanceof Error ? erro.message : erro);
  }
  // Mesma resposta com ou sem conta: a tela não revela quem tem conta.
  return { sucesso: ptBR.acesso.esqueci.enviado };
}

export async function definirNovaSenha(
  _anterior: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaNovaSenha.safeParse({ token: texto(dados, "token"), senha: texto(dados, "senha") });
  if (!resultado.success) {
    const erros = errosPorCampo(resultado.error);
    return erros.token ? { mensagem: ptBR.acesso.novaSenha.semLink } : { erros };
  }

  try {
    await getAuth().api.resetPassword({ body: { token: resultado.data.token, newPassword: resultado.data.senha } });
  } catch (erro) {
    console.error("Falha ao trocar a senha:", erro instanceof Error ? erro.message : erro);
    const codigo = codigoDoErro(erro);
    if (codigo === "INVALID_TOKEN" || codigo === "USER_NOT_FOUND") return { mensagem: ptBR.acesso.novaSenha.invalido };
    return { mensagem: traduzirErroLogin(erro) };
  }

  redirect("/entrar?senha=nova");
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
