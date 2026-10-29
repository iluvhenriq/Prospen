import { ptBR } from "@/lib/i18n/pt-BR";
import { conviteIdValido } from "@/modules/organizacoes/equipe";

// E-mails da conta (confirmação, nova senha, cadastro repetido) e os links
// deles. Os links apontam para telas do próprio app, nunca para /api/auth: a
// rota HTTP do login continua fechada (CAMINHOS_HTTP_LIBERADOS em auth-config.ts).
// Cada e-mail sai em duas versões: HTML (com a marca e um botão) e texto puro,
// para quem não abre HTML. As duas vêm da mesma estrutura.

export type Email = { para: string; assunto: string; texto: string; html?: string };

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

// O nome vem do cadastro, digitado por qualquer um, e o e-mail pode ir para o
// endereço de outra pessoa. Para ninguém usar o PROSPEN para mandar um "nome"
// com link ou recado, só entra o primeiro nome, só com letras.
export function primeiroNomeSeguro(nome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  const limpo = primeiro.replace(/[^\p{L}'-]/gu, "").slice(0, 30);
  return /\p{L}/u.test(limpo) ? limpo : "";
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Conteudo = {
  para: string;
  nome: string;
  assunto: string;
  // Linha que alguns leitores de e-mail mostram ao lado do assunto.
  previa: string;
  paragrafos: readonly string[];
  botao: { texto: string; link: string };
  // Links secundários, em texto (ex.: "Esqueceu a senha?").
  extras?: readonly { texto: string; link: string }[];
  aviso: string;
};

// Cores da marca (src/app/globals.css), escritas por extenso: leitores de
// e-mail não entendem variáveis de CSS.
const COR = { musgo: "#2c3521", musgoTexto: "#475730", marca: "#f2da5e", papel: "#f7f7f0", texto: "#1c2016", suave: "#565d4b", borda: "#d8dccb" };

function montar(c: Conteudo): Email {
  const saudacao = t.saudacao(primeiroNomeSeguro(c.nome));

  const texto = [
    saudacao,
    "",
    ...c.paragrafos.flatMap((p) => [p, ""]),
    `${c.botao.texto}: ${c.botao.link}`,
    ...(c.extras ?? []).map((extra) => `${extra.texto} ${extra.link}`),
    "",
    c.aviso,
    "",
    t.assinatura,
    t.rodape,
  ].join("\n");

  const paragrafos = c.paragrafos
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${COR.texto};">${escapar(p)}</p>`)
    .join("");
  const extras = (c.extras ?? [])
    .map(
      (extra) =>
        `<p style="margin:16px 0 0;font-size:14px;color:${COR.suave};">${escapar(extra.texto)} <a href="${escapar(extra.link)}" style="color:${COR.musgoTexto};font-weight:600;">${escapar(t.abrir)}</a></p>`,
    )
    .join("");
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(c.assunto)}</title></head>
<body style="margin:0;padding:0;background:${COR.papel};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${escapar(c.previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.papel};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${COR.borda};border-radius:6px;">
<tr><td style="background:${COR.musgo};padding:20px 28px;border-radius:6px 6px 0 0;">
<span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">PROSPEN</span>
</td></tr>
<tr><td style="padding:32px 28px 8px;">
<p style="margin:0 0 20px;font-size:20px;font-weight:700;color:${COR.texto};">${escapar(saudacao)}</p>
${paragrafos}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;"><tr><td style="background:${COR.marca};border-radius:4px;">
<a href="${escapar(c.botao.link)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:${COR.texto};text-decoration:none;">${escapar(c.botao.texto)}</a>
</td></tr></table>
${extras}
<p style="margin:24px 0 4px;font-size:13px;color:${COR.suave};">${escapar(t.copiarLink)}</p>
<p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${escapar(c.botao.link)}" style="color:${COR.musgoTexto};">${escapar(c.botao.link)}</a></p>
<p style="margin:0 0 24px;padding:12px 14px;font-size:14px;line-height:1.5;color:${COR.suave};background:${COR.papel};border-radius:4px;">${escapar(c.aviso)}</p>
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid ${COR.borda};font-size:12px;line-height:1.5;color:${COR.suave};">
${escapar(t.assinatura)}<br>${escapar(t.rodape)}
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { para: c.para, assunto: c.assunto, texto, html };
}

export function emailDeConfirmacao(para: string, nome: string, link: string): Email {
  const e = t.confirmacao;
  return montar({ para, nome, assunto: e.assunto, previa: e.previa, paragrafos: e.paragrafos, botao: { texto: e.botao, link }, aviso: e.aviso });
}

export function emailDeNovaSenha(para: string, nome: string, link: string): Email {
  const e = t.novaSenha;
  return montar({ para, nome, assunto: e.assunto, previa: e.previa, paragrafos: e.paragrafos, botao: { texto: e.botao, link }, aviso: e.aviso });
}

// Alguém tentou criar conta com um e-mail que já tem. A tela não conta isso
// (senão revelaria quem tem conta); o aviso vai só para o dono do e-mail.
export function emailDeContaExistente(para: string, nome: string, appUrl: string): Email {
  const e = t.contaExistente;
  const base = semBarraNoFim(appUrl);
  return montar({
    para,
    nome,
    assunto: e.assunto,
    previa: e.previa,
    paragrafos: e.paragrafos,
    botao: { texto: e.botao, link: `${base}/entrar` },
    extras: [{ texto: e.esqueceu, link: `${base}/esqueci-senha` }],
    aviso: e.aviso,
  });
}
