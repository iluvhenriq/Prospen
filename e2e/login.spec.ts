import { expect, test } from "@playwright/test";
import { SENHA, criarConta, emailUnico, linkDoEmail } from "./apoio";

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

  // Tema da tela (fica aqui para não criar mais uma conta: o servidor limita
  // cadastros). Começa claro, muda na hora, continua depois de recarregar (o
  // script do <head> aplica antes de pintar) e volta ao claro.
  const raiz = page.locator("html");
  const tema = page.getByRole("group", { name: "Tema da tela" });
  await expect(raiz).not.toHaveAttribute("data-escuro");
  await expect(tema.getByRole("button", { name: "Claro" })).toHaveAttribute("aria-pressed", "true");
  await tema.getByRole("button", { name: "Escuro" }).click();
  await expect(raiz).toHaveAttribute("data-escuro", "");
  await page.reload();
  await expect(raiz).toHaveAttribute("data-escuro", "");
  await expect(tema.getByRole("button", { name: "Escuro" })).toHaveAttribute("aria-pressed", "true");
  await tema.getByRole("button", { name: "Claro" }).click();
  await expect(raiz).not.toHaveAttribute("data-escuro");

  // Esqueci a senha (também aqui, pelo mesmo motivo): pede o link, troca a
  // senha pelo link do e-mail e entra com a nova. A antiga para de valer.
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/painel"));
  await page.goto("/entrar");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await page.waitForURL("**/esqueci-senha");
  // O Next mantém as últimas páginas no documento, escondidas: só os campos visíveis contam.
  const campo = (rotulo: string) => page.getByLabel(rotulo).filter({ visible: true });
  await campo("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se existir uma conta com este e-mail", { exact: false })).toBeVisible();
  await page.goto(await linkDoEmail(email, "Senha nova no PROSPEN"));
  const senhaNova = "SenhaNovaE2E-2026!";
  await campo("Senha nova").fill(senhaNova);
  await page.getByRole("button", { name: "Salvar senha nova" }).click();
  await page.waitForURL("**/entrar?senha=nova");
  await expect(page.getByText("Senha trocada. Entre com a senha nova.")).toBeVisible();
  await campo("E-mail").fill(email);
  await campo("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await campo("E-mail").fill(email);
  await campo("Senha").fill(senhaNova);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/painel");
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

  // E não há atalho: a rota HTTP do login, que não passa por esta trava, não responde.
  const direto = await page.request.post("/api/auth/sign-in/email", {
    data: { email, password: "senha-errada-10" },
  });
  expect(direto.status()).toBe(404);

  // O bloqueio é daquele e-mail, não de todo mundo.
  await tentar(emailUnico("outro"), "senha-errada-1");
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});
