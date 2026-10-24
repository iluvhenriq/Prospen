import { expect, test } from "@playwright/test";
import { SENHA, criarConta, emailUnico } from "./apoio";

test("cadastro, criação da empresa, saída e nova entrada", async ({ page }) => {
  const email = emailUnico("login");
  // Termos e política à vista antes de criar a conta (LGPD, art. 9º).
  await page.goto("/cadastrar");
  await expect(page.getByRole("link", { name: "termos de uso" })).toHaveAttribute("href", "/termos");
  await expect(page.getByRole("link", { name: "política de privacidade" })).toHaveAttribute("href", "/privacidade");
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

// Limite de 8 falhas por e-mail a cada 15 minutos (src/modules/contas/limites.ts).
// Usa um e-mail que não existe: não cria conta (o servidor limita cadastros) e
// mostra que o bloqueio vale mesmo para quem tenta adivinhar contas.
test("limite de tentativas de login por e-mail", async ({ page }) => {
  const email = emailUnico("limite");
  // Cada tentativa espera a resposta do servidor: a mensagem de erro continua
  // na tela entre uma e outra, então só olhar o texto não provaria nada.
  async function tentar(endereco: string, senha: string) {
    await page.getByLabel("E-mail").fill(endereco);
    await page.getByLabel("Senha").fill(senha);
    await Promise.all([
      page.waitForResponse((resposta) => resposta.request().method() === "POST"),
      page.getByRole("button", { name: "Entrar" }).click(),
    ]);
  }

  await page.goto("/entrar");
  for (let tentativa = 1; tentativa <= 8; tentativa += 1) {
    await tentar(email, `senha-errada-${tentativa}`);
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  }

  // A nona é barrada antes de conferir a senha.
  await tentar(email, "senha-errada-9");
  await expect(page.getByText("Muitas tentativas. Tente de novo em 15 minutos.")).toBeVisible();
  await expect(page).toHaveURL(/\/entrar/);

  // O bloqueio é daquele e-mail, não de todo mundo.
  await tentar(emailUnico("outro"), "senha-errada-1");
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});
