import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nodemailer from "nodemailer";
import type { Email, EnviarEmail } from "@/modules/contas/emails";
import type { ConfigEmail } from "./env";

// Envia os e-mails da conta. Com SMTP configurado (o Gmail serve, com uma
// "senha de app"), manda de verdade. Sem SMTP, mostra no terminal do servidor
// e, se houver pasta, grava um arquivo por e-mail (os testes de navegador
// leem de lá). Nunca registra senha nem conteúdo fora desses dois casos.
export function criarCarteiro(config: ConfigEmail): EnviarEmail {
  if (config.tipo === "local") {
    return async (email: Email) => {
      // O conteúdo (nome, e-mail, link) só aparece em desenvolvimento, para
      // quem testa no próprio computador. Em produção, nada de dado pessoal no
      // registro (regra 7 do CLAUDE.md): só o aviso de que o e-mail não saiu.
      if (process.env.NODE_ENV === "production") {
        console.error(`[e-mail não enviado: SMTP não configurado] ${email.assunto}`);
      } else {
        console.log(`\n[e-mail não enviado: SMTP não configurado]\nPara: ${email.para}\nAssunto: ${email.assunto}\n\n${email.texto}\n`);
      }
      if (config.pasta) {
        mkdirSync(config.pasta, { recursive: true });
        const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
        writeFileSync(join(config.pasta, nome), JSON.stringify(email), "utf8");
      }
    };
  }

  const transporte = nodemailer.createTransport({
    host: config.host,
    port: config.porta,
    // 465 já começa cifrada; 587 cifra depois de conectar (STARTTLS).
    secure: config.porta === 465,
    auth: { user: config.usuario, pass: config.senha },
  });
  return async (email: Email) => {
    await transporte.sendMail({
      from: config.remetente,
      to: email.para,
      subject: email.assunto,
      text: email.texto,
      html: email.html,
    });
  };
}
