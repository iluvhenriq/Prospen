import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lerEnvEmail } from "@/lib/env";
import { emailDoToken, situacaoDoEmail } from "@/modules/contas/confirmacao";
import {
  conviteDoLinkDoLogin,
  emailDeConfirmacao,
  linkDeConfirmacao,
  linkDeNovaSenha,
  primeiroNomeSeguro,
} from "@/modules/contas/emails";
import { codigoDoErro, traduzirErroLogin } from "@/modules/contas/erros";
import { criarAmbienteDeTeste, type AmbienteDeTeste } from "./ajuda/banco-teste";

// Confirmação de e-mail e senha nova (28/10/2026). Dados fictícios.

// Lê o link de um e-mail e devolve o caminho e os parâmetros dele.
function linkDoEmail(texto: string): URL {
  const link = /https?:\/\/\S+/.exec(texto)?.[0];
  if (!link) throw new Error(`E-mail sem link: ${texto}`);
  return new URL(link);
}

describe("links dos e-mails", () => {
  it("o convite do link do login passa para o link do app, só no formato certo", () => {
    const base = "http://localhost:3000/api/auth/verify-email?token=abc&callbackURL=";
    expect(conviteDoLinkDoLogin(`${base}${encodeURIComponent("/convite/abcdefghij0123456789")}`)).toBe("abcdefghij0123456789");
    expect(conviteDoLinkDoLogin(`${base}${encodeURIComponent("/")}`)).toBeNull();
    expect(conviteDoLinkDoLogin(`${base}${encodeURIComponent("https://golpe.com/convite/abcdefghij0123456789")}`)).toBeNull();
    expect(conviteDoLinkDoLogin(`${base}${encodeURIComponent("/convite/curto")}`)).toBeNull();
    expect(conviteDoLinkDoLogin("não é endereço")).toBeNull();
  });

  it("os links apontam para telas do app, nunca para /api/auth", () => {
    expect(linkDeConfirmacao("https://prospen.app/", "a.b.c", null)).toBe("https://prospen.app/confirmar-email?token=a.b.c");
    expect(linkDeConfirmacao("https://prospen.app", "t", "abcdefghij0123456789")).toBe(
      "https://prospen.app/confirmar-email?token=t&convite=abcdefghij0123456789",
    );
    expect(linkDeNovaSenha("https://prospen.app", "xyz")).toBe("https://prospen.app/nova-senha?token=xyz");
  });

  it("lê o e-mail de dentro do token, e devolve nulo para lixo", () => {
    const meio = Buffer.from(JSON.stringify({ email: "Ana@Exemplo.com.br" })).toString("base64url");
    expect(emailDoToken(`cabeca.${meio}.assinatura`)).toBe("ana@exemplo.com.br");
    expect(emailDoToken("sem-pontos")).toBeNull();
    expect(emailDoToken("a.!!!.c")).toBeNull();
  });
});

describe("conteúdo dos e-mails", () => {
  it("usa só o primeiro nome, só com letras: um \"nome\" com link ou recado não passa", () => {
    expect(primeiroNomeSeguro("Ana Paula Souza")).toBe("Ana");
    expect(primeiroNomeSeguro("  joão-pedro d'Ávila ")).toBe("joão-pedro");
    expect(primeiroNomeSeguro("www.golpe.com/pix")).toBe("wwwgolpecompix");
    expect(primeiroNomeSeguro("https://golpe.com")).toBe("httpsgolpecom");
    expect(primeiroNomeSeguro("<b>Oi</b>")).toBe("bOib");
    expect(primeiroNomeSeguro("123 456")).toBe("");
  });

  it("sai em HTML e em texto, com o botão, o link e a saudação pelo primeiro nome", () => {
    const link = "https://app.exemplo/confirmar-email?token=a.b.c&convite=x";
    const email = emailDeConfirmacao("ana@exemplo.com.br", "Ana Paula", link);
    expect(email.texto.split("\n")[0]).toBe("Olá, Ana!");
    expect(email.texto).toContain(`Confirmar meu e-mail: ${link}`);
    expect(email.html).toContain("Olá, Ana!");
    expect(email.html).toContain("Confirmar meu e-mail");
    // O & do endereço vai escapado no HTML (o leitor de e-mail desfaz).
    expect(email.html).toContain("token=a.b.c&amp;convite=x");
    expect(email.html).not.toContain("<script");
  });

  it("sem nome aproveitável, a saudação fica neutra", () => {
    expect(emailDeConfirmacao("x@exemplo.com.br", "*** 123", "https://a.b/c").texto.startsWith("Olá!\n")).toBe(true);
  });
});

describe("configuração do e-mail", () => {
  it("sem SMTP_HOST, os e-mails ficam no terminal (e na pasta, se houver)", () => {
    expect(lerEnvEmail({})).toEqual({ tipo: "local", pasta: null });
    expect(lerEnvEmail({ EMAIL_PASTA_LOCAL: "e2e-emails" })).toEqual({ tipo: "local", pasta: "e2e-emails" });
  });

  it("com o Gmail: porta 465 por padrão e remetente com o próprio usuário", () => {
    expect(lerEnvEmail({ SMTP_HOST: "smtp.gmail.com", SMTP_USUARIO: "eu@gmail.com", SMTP_SENHA: "abcd efgh" })).toEqual({
      tipo: "smtp",
      host: "smtp.gmail.com",
      porta: 465,
      usuario: "eu@gmail.com",
      senha: "abcd efgh",
      remetente: "PROSPEN <eu@gmail.com>",
    });
  });

  it("com a pasta dos testes definida, nada sai por SMTP, mesmo configurado", () => {
    const gmail = { SMTP_HOST: "smtp.gmail.com", SMTP_USUARIO: "eu@gmail.com", SMTP_SENHA: "abcd", SMTP_PORTA: "" };
    expect(lerEnvEmail({ ...gmail, EMAIL_PASTA_LOCAL: "e2e-emails" })).toEqual({ tipo: "local", pasta: "e2e-emails" });
    expect(lerEnvEmail(gmail)).toMatchObject({ tipo: "smtp", porta: 465 });
  });

  it("SMTP pela metade é erro, sem mostrar a senha", () => {
    expect(() => lerEnvEmail({ SMTP_HOST: "smtp.gmail.com", SMTP_SENHA: "segredo-123" })).toThrow(/SMTP_USUARIO/);
    expect(() => lerEnvEmail({ SMTP_HOST: "smtp.gmail.com", SMTP_SENHA: "segredo-123" })).not.toThrow(/segredo-123/);
  });
});

describe("login com confirmação de e-mail", () => {
  let amb: AmbienteDeTeste;
  const EMAIL = "bia@exemplo.com.br";
  const SENHA = "senha-da-bia-123";

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
  });
  afterAll(async () => {
    await amb.encerrar();
  });

  const ultimoEmail = () => amb.emails[amb.emails.length - 1];

  it("o cadastro não abre sessão e manda o link de confirmação, com o convite junto", async () => {
    const criado = await amb.auth.api.signUpEmail({
      body: { name: "Bia", email: EMAIL, password: SENHA, callbackURL: "/convite/abcdefghij0123456789" },
    });
    expect(criado.token).toBeNull();
    const email = ultimoEmail();
    expect(email).toMatchObject({ para: EMAIL, assunto: "Confirme seu e-mail no PROSPEN" });
    const link = linkDoEmail(email.texto);
    expect(link.pathname).toBe("/confirmar-email");
    expect(link.searchParams.get("convite")).toBe("abcdefghij0123456789");
    expect(emailDoToken(link.searchParams.get("token") ?? "")).toBe(EMAIL);
  });

  it("sem confirmar, a senha certa não entra e manda um link novo", async () => {
    const antes = amb.emails.length;
    const erro = await amb.auth.api.signInEmail({ body: { email: EMAIL, password: SENHA } }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(codigoDoErro(erro)).toBe("EMAIL_NOT_VERIFIED");
    expect(traduzirErroLogin(erro)).toBe("Confirme seu e-mail antes de entrar. Enviamos um link novo para ele.");
    expect(amb.emails.length).toBe(antes + 1);
  });

  it("senha errada continua dando só \"e-mail ou senha incorretos\", sem mandar e-mail", async () => {
    const antes = amb.emails.length;
    const erro = await amb.auth.api.signInEmail({ body: { email: EMAIL, password: "errada-errada" } }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(traduzirErroLogin(erro)).toBe("E-mail ou senha incorretos.");
    expect(amb.emails.length).toBe(antes);
  });

  it("o link confirma o e-mail e abre a sessão; usado de novo, não abre outra", async () => {
    const token = linkDoEmail(ultimoEmail().texto).searchParams.get("token") ?? "";
    expect(await situacaoDoEmail(amb.db, EMAIL)).toMatchObject({ confirmado: false });

    const { headers } = await amb.auth.api.verifyEmail({ query: { token }, returnHeaders: true });
    expect(headers.getSetCookie().some((c) => c.includes("session_token"))).toBe(true);
    expect(await situacaoDoEmail(amb.db, EMAIL)).toMatchObject({ confirmado: true });

    const denovo = await amb.auth.api.verifyEmail({ query: { token }, returnHeaders: true });
    expect(denovo.headers.getSetCookie().some((c) => c.includes("session_token"))).toBe(false);

    const entrada = await amb.auth.api.signInEmail({ body: { email: EMAIL, password: SENHA } });
    expect(entrada.user.email).toBe(EMAIL);
  });

  it("token falso ou adulterado é recusado", async () => {
    const meio = Buffer.from(JSON.stringify({ email: EMAIL })).toString("base64url");
    await expect(amb.auth.api.verifyEmail({ query: { token: `eyJhbGciOiJIUzI1NiJ9.${meio}.falsa` } })).rejects.toThrow();
  });
});

describe("senha nova", () => {
  let amb: AmbienteDeTeste;
  const EMAIL = "caio@exemplo.com.br";

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    await amb.auth.api.signUpEmail({ body: { name: "Caio", email: EMAIL, password: "senha-antiga-123" } });
  });
  afterAll(async () => {
    await amb.encerrar();
  });

  it("e-mail sem conta: mesma resposta, nenhum e-mail enviado", async () => {
    const antes = amb.emails.length;
    const resposta = await amb.auth.api.requestPasswordReset({ body: { email: "ninguem@exemplo.com.br" } });
    expect(resposta.status).toBe(true);
    expect(amb.emails.length).toBe(antes);
  });

  it("o link troca a senha uma vez só, confirma o e-mail e a senha antiga para de valer", async () => {
    await amb.auth.api.requestPasswordReset({ body: { email: EMAIL } });
    const email = amb.emails[amb.emails.length - 1];
    expect(email).toMatchObject({ para: EMAIL, assunto: "Senha nova no PROSPEN" });
    const link = linkDoEmail(email.texto);
    expect(link.pathname).toBe("/nova-senha");
    const token = link.searchParams.get("token") ?? "";

    await amb.auth.api.resetPassword({ body: { token, newPassword: "senha-nova-456" } });
    // Quem abriu o link provou que o e-mail é dele.
    expect(await situacaoDoEmail(amb.db, EMAIL)).toMatchObject({ confirmado: true });

    const reuso = await amb.auth.api.resetPassword({ body: { token, newPassword: "outra-senha-789" } }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(codigoDoErro(reuso)).toBe("INVALID_TOKEN");

    const antiga = await amb.auth.api.signInEmail({ body: { email: EMAIL, password: "senha-antiga-123" } }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(traduzirErroLogin(antiga)).toBe("E-mail ou senha incorretos.");
    const nova = await amb.auth.api.signInEmail({ body: { email: EMAIL, password: "senha-nova-456" } });
    expect(nova.user.email).toBe(EMAIL);
  });
});
