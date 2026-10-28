import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";
import { urlDoBancoE2E } from "./ambiente";

// Ações repetidas nos testes de navegador. Todos os dados são fictícios.

export const SENHA = "SenhaE2E-2026!";

let contador = 0;

// E-mail diferente a cada chamada, para os testes não dependerem uns dos outros.
export function emailUnico(prefixo: string): string {
  contador += 1;
  return `${prefixo}-${Date.now()}-${contador}@exemplo.com.br`;
}

export async function criarConta(
  page: Page,
  { nome, email, empresa }: { nome: string; email: string; empresa: string },
): Promise<void> {
  await page.goto("/cadastrar");
  await page.getByLabel("Seu nome").fill(nome);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("**/criar-organizacao");
  await page.getByLabel("Nome da empresa").fill(empresa);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("**/painel");
  await expect(page.getByText(empresa).first()).toBeVisible();
}

// Cadastra um lead à mão e devolve o identificador dele (do endereço da página).
export async function cadastrarLead(
  page: Page,
  { nome, email, telefone }: { nome: string; email?: string; telefone?: string },
): Promise<string> {
  await page.goto("/painel/leads/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  if (email) await page.getByLabel("E-mail", { exact: true }).fill(email);
  if (telefone) await page.getByLabel("Telefone", { exact: true }).fill(telefone);
  await page.getByRole("button", { name: "Cadastrar lead" }).click();
  await page.waitForURL(/\/painel\/leads\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: nome })).toBeVisible();
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

// Diz se a página inteira rola para o lado (o que não pode acontecer no celular).
export async function rolaParaOLado(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

// Muda o plano da empresa do dono com este e-mail, pelo mesmo script que o
// Henrique usa depois de conferir o pagamento (scripts/plano-definir.ts).
export function definirPlano(email: string, plano: "pequeno" | "medio" | "grande"): void {
  execFileSync("npx", ["tsx", "scripts/plano-definir.ts", email, plano], {
    env: { ...process.env, DATABASE_URL: urlDoBancoE2E() },
    stdio: "pipe",
    shell: process.platform === "win32",
  });
}
