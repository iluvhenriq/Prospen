import { expect, test } from "@playwright/test";

// Página de apresentação com o app aberto (como no servidor dos testes). Não
// cria conta. O formulário de pré-cadastro só aparece no modo pré-venda; a ação
// dele é testada em tests/pre-cadastro.test.ts.
test("página inicial com o app aberto: demonstração, segurança, como começar e perguntas", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pare de ligar para empresa no chute");

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
  // Segurança: seção com o que o app faz de verdade.
  await expect(page.getByRole("heading", { name: "Segurança da sua conta e dos seus dados" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Só entra quem confirmou o e-mail" })).toBeVisible();

  // No lugar do pré-cadastro (que só aparece no modo pré-venda), os passos para começar.
  await expect(page.getByRole("heading", { name: "Como começar" })).toBeVisible();
  await expect(page.getByText("Sem pagar, dá para salvar 20 empresas por mês.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fazer pré-cadastro" })).toHaveCount(0);
  // Com o app aberto, o Pix fica dentro do app (tela Equipe), não na página.
  await expect(page.getByRole("button", { name: "Reservar no Pix" })).toHaveCount(0);

  // Perguntas do app aberto; as da pré-venda ("Quando abre?") somem.
  await page.getByText("Preciso de cartão para testar?").click();
  await expect(page.getByText("A conta de teste não pede cartão", { exact: false })).toBeVisible();
  await expect(page.getByText("Quando abre?")).toHaveCount(0);

  // Páginas legais no rodapé.
  await expect(page.getByRole("link", { name: "Política de privacidade" }).last()).toHaveAttribute("href", "/privacidade");
  await expect(page.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos");
});
