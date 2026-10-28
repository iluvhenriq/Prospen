"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { getAuth } from "@/lib/auth";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterPlano } from "@/modules/planos/acesso";
import { proximoPlano, REGRAS } from "@/modules/planos/planos";
import { exigirPermissao, exigirUsuario } from "./contexto";
import { conviteIdValido, lerConvite, repositorioEquipe } from "./equipe";
import { resolverOrganizacao } from "./membros";

// Equipe: convidar, cancelar convite, remover pessoa e aceitar convite.
// Sem provedor de e-mail, o convite vira um link que quem convida copia e
// envia. Só aceita quem entrar com o MESMO e-mail do convite (conferido pelo
// login) e tiver o link.

export type EstadoConvite = { mensagem?: string; link?: string };

function codigoDoErro(erro: unknown): string | null {
  const corpo = (erro as { body?: { code?: unknown } } | null)?.body;
  return typeof corpo?.code === "string" ? corpo.code : null;
}

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export async function convidarPessoa(_anterior: EstadoConvite, dados: FormData): Promise<EstadoConvite> {
  const contexto = await exigirPermissao("gerenciarEquipe");
  const t = ptBR.equipe;
  const validado = email.safeParse(dados.get("email"));
  if (!validado.success) return { mensagem: t.emailInvalido };

  const db = getDb();
  const equipe = repositorioEquipe(db, contexto.organizacao.id);
  const [{ plano }, ocupacao, pessoas, convites] = await Promise.all([
    obterPlano(contexto),
    equipe.ocupacao(),
    equipe.pessoas(),
    equipe.convitesPendentes(),
  ]);
  if (pessoas.some((pessoa) => pessoa.email.toLowerCase() === validado.data)) return { mensagem: t.jaEhMembro };
  if (convites.some((convite) => convite.email.toLowerCase() === validado.data)) return { mensagem: t.jaConvidada };
  const limite = REGRAS[plano].usuarios;
  if (ocupacao.pessoas + ocupacao.convites >= limite) {
    const proximo = proximoPlano(plano);
    return { mensagem: t.limite(limite, proximo ? ptBR.planos.nomes[proximo] : null) };
  }

  try {
    const convite = await getAuth().api.createInvitation({
      headers: await headers(),
      body: { email: validado.data, role: "member", organizationId: contexto.organizacao.id },
    });
    revalidatePath("/painel/equipe");
    return { mensagem: t.linkGerado, link: `/convite/${convite.id}` };
  } catch (erro) {
    const codigo = codigoDoErro(erro);
    if (codigo === "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION") return { mensagem: t.jaEhMembro };
    if (codigo === "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION") return { mensagem: t.jaConvidada };
    if (codigo === "INVITATION_LIMIT_REACHED") return { mensagem: t.limite(limite, null) };
    console.error("Falha ao convidar:", codigo ?? (erro instanceof Error ? erro.message : erro));
    return { mensagem: t.falhou };
  }
}

export async function cancelarConvite(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("gerenciarEquipe");
  const id = dados.get("id");
  if (!conviteIdValido(id)) return;
  // Só convites desta empresa: o de outra nem aparece na lista.
  const convites = await repositorioEquipe(getDb(), contexto.organizacao.id).convitesPendentes();
  if (!convites.some((convite) => convite.id === id)) return;
  try {
    await getAuth().api.cancelInvitation({ headers: await headers(), body: { invitationId: id } });
  } catch (erro) {
    console.error("Falha ao cancelar convite:", codigoDoErro(erro) ?? (erro instanceof Error ? erro.message : erro));
  }
  revalidatePath("/painel/equipe");
}

export async function removerDaEquipe(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("gerenciarEquipe");
  const id = dados.get("id");
  if (typeof id !== "string") return;
  const pessoas = await repositorioEquipe(getDb(), contexto.organizacao.id).pessoas();
  const alvo = pessoas.find((pessoa) => pessoa.id === id);
  // O dono não sai, e ninguém se remove por aqui.
  if (!alvo || alvo.papel === "owner" || alvo.usuarioId === contexto.usuario.id) return;
  try {
    await getAuth().api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail: alvo.id, organizationId: contexto.organizacao.id },
    });
  } catch (erro) {
    console.error("Falha ao remover da equipe:", codigoDoErro(erro) ?? (erro instanceof Error ? erro.message : erro));
  }
  revalidatePath("/painel/equipe");
}

export type EstadoAceite = { mensagem?: string };

export async function aceitarConvite(_anterior: EstadoAceite, dados: FormData): Promise<EstadoAceite> {
  const sessao = await exigirUsuario();
  const t = ptBR.equipe.convite;
  const id = dados.get("id");
  if (!conviteIdValido(id)) return { mensagem: t.invalido };

  const db = getDb();
  const convite = await lerConvite(db, id);
  if (!convite) return { mensagem: t.invalido };
  if (convite.email.toLowerCase() !== sessao.user.email.toLowerCase()) return { mensagem: t.outroEmail(convite.email) };
  // Uma empresa por conta, por enquanto (igual à criação de empresa).
  if (await resolverOrganizacao(db, sessao.user.id)) return { mensagem: t.jaTemEmpresa };

  const cabecalhos = await headers();
  try {
    const aceito = await getAuth().api.acceptInvitation({ headers: cabecalhos, body: { invitationId: id } });
    await getAuth().api.setActiveOrganization({
      headers: cabecalhos,
      body: { organizationId: aceito?.member.organizationId ?? null },
    });
  } catch (erro) {
    const codigo = codigoDoErro(erro);
    if (codigo === "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED") return { mensagem: t.cheio };
    if (codigo === "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION") return { mensagem: t.outroEmail(convite.email) };
    if (codigo === "INVITATION_NOT_FOUND") return { mensagem: t.invalido };
    console.error("Falha ao aceitar convite:", codigo ?? (erro instanceof Error ? erro.message : erro));
    return { mensagem: ptBR.equipe.falhou };
  }
  redirect("/painel");
}
