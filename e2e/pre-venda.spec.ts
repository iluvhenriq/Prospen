import { expect, test } from "@playwright/test";
import { emailUnico } from "./apoio";

// Página de apresentação e pré-cadastro (pré-venda). Não cria conta.
test("pré-cadastro pela página inicial, com erro claro e sucesso", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Saiba para quem ligar primeiro");

  // Demonstração da busca: começa com a conta da empresa de maior nota aberta
  // e, ao clicar noutra linha, abre a conta dela na própria lista.
  await expect(page.getByRole("button", { name: /80 pontos/ })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#conta-80")).toContainText("= 80");
  await page.getByRole("button", { name: /40 pontos/ }).click();
  await expect(page.getByRole("button", { name: /40 pontos/ })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#conta-40")).toContainText("e-mail parece do contador");
  await expect(page.locator("#conta-40")).toContainText("= 40");
  await expect(page.locator("#conta-80")).toHaveCount(0);

  // Com o app aberto (como neste servidor), a chamada leva a criar a conta, e
  // as vagas de fundador vêm do banco (zeradas a cada rodada dos testes).
  await expect(page.getByRole("link", { name: "Criar conta grátis" }).first()).toHaveAttribute("href", "/cadastrar");
  await expect(page.getByText("Restam 20 de 20 vagas de fundador", { exact: false })).toBeVisible();
  // O pré-cadastro continua no fim da página.
  await page.locator("#pre-cadastro").scrollIntoViewIfNeeded();

  // Envio vazio: mensagens do servidor, em português.
  await page.getByRole("button", { name: "Fazer pré-cadastro" }).click();
  await expect(page.getByText("Informe o seu nome.")).toBeVisible();
  await expect(page.getByText("Confira o e-mail.")).toBeVisible();

  await page.getByLabel("Seu nome").fill("Pessoa Interessada");
  await page.getByLabel("E-mail").fill(emailUnico("pre-cadastro"));
  await page.getByLabel("Empresa (opcional)").fill("Empresa Interessada");
  // Perguntas opcionais: não estão prontas e o formulário diz isso.
  await expect(page.getByText("Nada desta lista está pronto.")).toBeVisible();
  await page.getByLabel("O que a sua empresa vende? (opcional)").selectOption({ label: "Contabilidade" });
  await page.getByLabel(/Avisos de oportunidade/).check();
  await page.getByRole("button", { name: "Fazer pré-cadastro" }).click();
  await expect(page.getByText("Pronto, você está na lista.")).toBeVisible();

  // Páginas legais no rodapé.
  await expect(page.getByRole("link", { name: "Política de privacidade" }).last()).toHaveAttribute("href", "/privacidade");
  await expect(page.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos");
});
