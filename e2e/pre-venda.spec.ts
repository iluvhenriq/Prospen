import { expect, test } from "@playwright/test";
import { emailUnico } from "./apoio";

// Página de apresentação e pré-cadastro (pré-venda). Não cria conta.
test("pré-cadastro pela página inicial, com erro claro e sucesso", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Encontre empresas para vender");

  // A chamada do topo leva ao formulário.
  await page.getByRole("link", { name: "Fazer pré-cadastro" }).first().click();
  await expect(page).toHaveURL(/#pre-cadastro$/);

  // Envio vazio: mensagens do servidor, em português.
  await page.getByRole("button", { name: "Quero ser avisado" }).click();
  await expect(page.getByText("Informe o seu nome.")).toBeVisible();
  await expect(page.getByText("Confira o e-mail.")).toBeVisible();

  await page.getByLabel("Seu nome").fill("Pessoa Interessada");
  await page.getByLabel("E-mail").fill(emailUnico("pre-cadastro"));
  await page.getByLabel("Empresa (opcional)").fill("Empresa Interessada");
  await page.getByRole("button", { name: "Quero ser avisado" }).click();
  await expect(page.getByText("Pronto, você está na lista.")).toBeVisible();

  // Páginas legais no rodapé.
  await expect(page.getByRole("link", { name: "Política de privacidade" }).last()).toHaveAttribute("href", "/privacidade");
  await expect(page.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos");
});
