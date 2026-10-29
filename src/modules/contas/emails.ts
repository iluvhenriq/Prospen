import { ptBR } from "@/lib/i18n/pt-BR";
import { conviteIdValido } from "@/modules/organizacoes/equipe";

// E-mails da conta (confirmação, nova senha, cadastro repetido) e os links
// deles. Os links apontam para telas do próprio app, nunca para /api/auth: a
// rota HTTP do login continua fechada (CAMINHOS_HTTP_LIBERADOS em auth-config.ts).

export type Email = { para: string; assunto: string; texto: string };

// Quem envia de fato (SMTP ou terminal). Os testes passam um que só guarda.
export type EnviarEmail = (email: Email) => Promise<void>;

const t = ptBR.emails;

function semBarraNoFim(url: string): string {
  return url.replace(/\/+$/, "");
}

// O login monta um link próprio (.../api/auth/verify-email?token=...&callbackURL=...).
// Só o convite, se houver, passa para o link do app, e só no formato certo.
export function conviteDoLinkDoLogin(urlDoLogin: string): string | null {
  try {
    const destino = new URL(urlDoLogin).searchParams.get("callbackURL") ?? "";
    const id = /^\/convite\/([^/?#]+)$/.exec(destino)?.[1] ?? null;
    return conviteIdValido(id) ? id : null;
  } catch {
    return null;
  }
}

export function linkDeConfirmacao(appUrl: string, token: string, convite: string | null): string {
  const busca = new URLSearchParams({ token });
  if (convite) busca.set("convite", convite);
  return `${semBarraNoFim(appUrl)}/confirmar-email?${busca}`;
}

export function linkDeNovaSenha(appUrl: string, token: string): string {
  return `${semBarraNoFim(appUrl)}/nova-senha?${new URLSearchParams({ token })}`;
}

function corpo(linhas: string[]): string {
  return [...linhas, "", t.assinatura].join("\n");
}

export function emailDeConfirmacao(para: string, nome: string, link: string): Email {
  return { para, assunto: t.confirmacao.assunto, texto: corpo(t.confirmacao.linhas(nome, link)) };
}

export function emailDeNovaSenha(para: string, nome: string, link: string): Email {
  return { para, assunto: t.novaSenha.assunto, texto: corpo(t.novaSenha.linhas(nome, link)) };
}

// Alguém tentou criar conta com um e-mail que já tem. A tela não conta isso
// (senão revelaria quem tem conta); o aviso vai só para o dono do e-mail.
export function emailDeContaExistente(para: string, nome: string, appUrl: string): Email {
  const base = semBarraNoFim(appUrl);
  return {
    para,
    assunto: t.contaExistente.assunto,
    texto: corpo(t.contaExistente.linhas(nome, `${base}/entrar`, `${base}/esqueci-senha`)),
  };
}
