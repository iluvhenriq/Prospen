import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import type { Banco } from "@/db/tipos";
import * as schema from "@/db/schema";
import {
  conviteDoLinkDoLogin,
  emailDeConfirmacao,
  emailDeContaExistente,
  emailDeNovaSenha,
  linkDeConfirmacao,
  linkDeNovaSenha,
  type Email,
  type EnviarEmail,
} from "@/modules/contas/emails";
import { garantirConfiguracao } from "@/modules/organizacoes/configuracao";
import { REGRAS } from "@/modules/planos/planos";
import { repositorioPlano } from "@/modules/planos/repositorio";

async function usuariosDoPlano(db: Banco, organizacaoId: string): Promise<number> {
  const { plano } = await repositorioPlano(db, organizacaoId).obter();
  return REGRAS[plano].usuarios;
}

export const TAMANHO_MINIMO_SENHA = 8;
export const TAMANHO_MAXIMO_SENHA = 128;

// Caminhos do login (depois de /api/auth) que respondem por HTTP. Hoje nenhum:
// entrar, criar conta, sair, empresa e convites passam pelas ações do servidor,
// que chamam o login direto e aplicam os limites de tentativas, o registro de
// acesso (Marco Civil) e as regras do produto (uma empresa por conta, convite
// só com o link). Com a rota aberta, tudo isso podia ser pulado: o Better Auth
// deixa testar 3 senhas a cada 10 segundos por endereço, contra 8 por e-mail a
// cada 15 minutos nas telas. Os links de confirmação e de nova senha também
// não usam esta rota: apontam para /confirmar-email e /nova-senha, telas do
// app que chamam o login pelo servidor.
export const CAMINHOS_HTTP_LIBERADOS: readonly string[] = [];

export function caminhoHttpLiberado(caminho: string, liberados: readonly string[] = CAMINHOS_HTTP_LIBERADOS): boolean {
  const prefixo = "/api/auth";
  if (!caminho.startsWith(`${prefixo}/`)) return false;
  const resto = caminho.slice(prefixo.length);
  return liberados.some((liberado) => resto === liberado || resto.startsWith(`${liberado}/`));
}

type Opcoes = {
  secret: string;
  baseURL: string;
  // Falso apenas nos testes, que rodam fora de uma requisição do Next.js.
  cookiesDoNext?: boolean;
  enviarEmail: EnviarEmail;
};

// Validade dos links: confirmar o e-mail pode ficar para depois (1 dia);
// trocar a senha é na hora (1 hora).
export const VALIDADE_CONFIRMACAO_S = 24 * 60 * 60;
export const VALIDADE_NOVA_SENHA_S = 60 * 60;

// Configuração do login. Fica separada de src/lib/auth.ts para os testes
// poderem criar um login ligado ao banco de teste.
export function criarAuth(db: Banco, { secret, baseURL, cookiesDoNext = true, enviarEmail }: Opcoes) {
  // O envio não segura a resposta: esperar o SMTP deixaria "e-mail que existe"
  // mais lento que "e-mail que não existe" e revelaria quem tem conta. Falha de
  // envio vai para o terminal; a pessoa pede outro link entrando com a senha.
  const disparar = (email: Email) => {
    enviarEmail(email).catch((erro: unknown) => {
      console.error("Falha ao enviar e-mail:", erro instanceof Error ? erro.message : erro);
    });
  };

  return betterAuth({
    secret,
    baseURL,
    // Sem envio de dados de uso para fora.
    telemetry: { enabled: false },
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: TAMANHO_MINIMO_SENHA,
      maxPasswordLength: TAMANHO_MAXIMO_SENHA,
      // Só entra quem confirmou o e-mail: sem isso, qualquer um criava contas
      // com e-mails dos outros (e entrava em equipes convidadas por e-mail).
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: VALIDADE_NOVA_SENHA_S,
      // Trocou a senha: quem estava logado em outro aparelho sai.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        disparar(emailDeNovaSenha(user.email, user.name, linkDeNovaSenha(baseURL, token)));
      },
      // Quem abriu o link de nova senha provou que o e-mail é dele.
      onPasswordReset: async ({ user }) => {
        if (!user.emailVerified) {
          await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, user.id));
        }
      },
      onExistingUserSignUp: async ({ user }) => {
        disparar(emailDeContaExistente(user.email, user.name, baseURL));
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      // Tentou entrar sem ter confirmado (com a senha certa): vai um link novo.
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: VALIDADE_CONFIRMACAO_S,
      sendVerificationEmail: async ({ user, url, token }) => {
        const link = linkDeConfirmacao(baseURL, token, conviteDoLinkDoLogin(url));
        disparar(emailDeConfirmacao(user.email, user.name, link));
      },
    },
    plugins: [
      organization({
        // Cada pessoa tem uma empresa por enquanto. A regra vale também para
        // quem chamar a API direto, não só para as telas.
        organizationLimit: 1,
        creatorRole: "owner",
        // Usuários por plano (Pequeno 1, Médio 2, Grande 3). O login confere na
        // hora de aceitar o convite; os convites pendentes também não passam
        // das vagas. Vale para quem chamar a API direto, não só para as telas.
        membershipLimit: async (_usuario, empresa) => await usuariosDoPlano(db, empresa.id),
        invitationLimit: async ({ organization: empresa }) => await usuariosDoPlano(db, empresa.id),
        // Sem provedor de e-mail, o link vai por WhatsApp ou e-mail de quem
        // convida; uma semana dá tempo de a pessoa abrir.
        invitationExpiresIn: 7 * 24 * 60 * 60,
        // Só aceita o convite quem confirmou o e-mail convidado.
        requireEmailVerificationOnInvitation: true,
        organizationHooks: {
          // Toda empresa nasce com a configuração regional padrão (Brasil).
          // Este arquivo é onde o login se liga ao restante do produto.
          afterCreateOrganization: async ({ organization }) => {
            await garantirConfiguracao(db, organization.id);
          },
        },
      }),
      // Precisa ser o último: grava os cookies de login nas ações do servidor.
      ...(cookiesDoNext ? [nextCookies()] : []),
    ],
  });
}

export type Auth = ReturnType<typeof criarAuth>;
