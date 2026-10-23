import { expect, test } from "@playwright/test";
import { SENHA, criarConta, emailUnico } from "./apoio";

test("cadastro, criação da empresa, saída e nova entrada", async ({ page }) => {
  const email = emailUnico("login");
  await criarConta(page, { nome: "Pessoa Login", email, empresa: "Empresa Login" });
  await expect(page.getByRole("heading", { name: "Olá, Pessoa" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/painel"));

  // Sem sessão, o painel manda para a entrada.
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar/);

  // Senha errada: mensagem genérica, que não revela se o e-mail existe.
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await expect(page).toHaveURL(/\/entrar/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/painel");
  await expect(page.getByText("Empresa Login").first()).toBeVisible();
});
