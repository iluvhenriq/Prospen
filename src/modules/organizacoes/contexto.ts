import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db/client";
import { getAuth } from "@/lib/auth";
import {
  ErroSemPermissao,
  papelPode,
  resolverOrganizacao,
  type Acao,
  type Papel,
} from "./membros";

// Camada de acesso ao usuário e à empresa atuais. Toda tela e toda ação
// protegida começa por aqui. O que vem do navegador é só o cookie de login;
// a empresa e o papel são sempre conferidos no banco.
//
// Estas funções leem cookies, então só funcionam dentro de <Suspense>
// (regra do Next.js com Cache Components). O `cache` do React evita repetir
// a consulta várias vezes na mesma requisição.

export type Contexto = {
  usuario: { id: string; nome: string; email: string };
  organizacao: { id: string; nome: string };
  papel: Papel;
};

export const obterSessao = cache(async () => {
  // Os cabeçalhos vêm ANTES de criar o login. Na compilação não existe
  // requisição: ler os cabeçalhos faz o Next adiar a página para o momento
  // do acesso, e o login (que exige as variáveis de ambiente) nem chega a ser criado.
  const cabecalhos = await headers();
  return getAuth().api.getSession({ headers: cabecalhos });
});

// Para quem precisa estar logado. Sem login válido, vai para a tela de entrada.
export async function exigirUsuario() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar");
  return sessao;
}

// Pessoa logada e a empresa dela, ou nulo se ela ainda não criou a empresa.
export const obterContextoOpcional = cache(async (): Promise<Contexto | null> => {
  const sessao = await exigirUsuario();
  const organizacao = await resolverOrganizacao(
    getDb(),
    sessao.user.id,
    (sessao.session as { activeOrganizationId?: string | null }).activeOrganizationId,
  );
  if (!organizacao) return null;

  return {
    usuario: {
      id: sessao.user.id,
      nome: sessao.user.name,
      email: sessao.user.email,
    },
    organizacao: { id: organizacao.organizacaoId, nome: organizacao.nome },
    papel: organizacao.papel,
  };
});

// Para a área do produto: exige login E empresa.
export async function exigirContexto(): Promise<Contexto> {
  const contexto = await obterContextoOpcional();
  if (!contexto) redirect("/criar-organizacao");
  return contexto;
}

// Para ações restritas (equipe, configuração, exclusão): exige login, empresa
// E que o papel da pessoa permita a ação. Esconder um botão na tela não protege
// nada; toda ação restrita no servidor deve começar por esta função.
export async function exigirPermissao(acao: Acao): Promise<Contexto> {
  const contexto = await exigirContexto();
  if (!papelPode(contexto.papel, acao)) throw new ErroSemPermissao(acao);
  return contexto;
}
