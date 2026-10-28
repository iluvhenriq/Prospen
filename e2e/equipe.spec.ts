import { expect, test } from "@playwright/test";
import { criarConta, definirPlano, emailUnico, SENHA } from "./apoio";

// Equipe e convite por link (planos, 28/10/2026). Cada pessoa tem o próprio
// endereço (cabeçalho x-forwarded-for, faixa reservada para documentação):
// assim estes cadastros não gastam o limite por endereço dos outros testes.
test("convite por link: o plano limita a equipe e a pessoa convidada entra na empresa", async ({ browser }) => {
  const contextoDono = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.10" } });
  const contextoConvidada = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.11" } });
  const dono = await contextoDono.newPage();
  const convidada = await contextoConvidada.newPage();

  const emailDono = emailUnico("equipe-dono");
  await criarConta(dono, { nome: "Dono Equipe", email: emailDono, empresa: "Empresa Equipe" });

  // Pequeno: 1 usuário, sem vaga para convidar.
  await dono.goto("/painel/equipe");
  await expect(dono.getByText("Seu plano: Pequeno", { exact: true })).toBeVisible();
  await expect(dono.getByText("O seu plano tem 1 usuário", { exact: false })).toBeVisible();
  await expect(dono.getByLabel("E-mail da pessoa")).toHaveCount(0);

  // Médio: 2 usuários. Gera o link.
  definirPlano(emailDono, "medio");
  await dono.reload();
  await expect(dono.getByText("Seu plano: Médio", { exact: true })).toBeVisible();
  const emailConvidada = emailUnico("equipe-convidada");
  await dono.getByLabel("E-mail da pessoa").fill(emailConvidada);
  await dono.getByRole("button", { name: "Gerar link de convite" }).click();
  await expect(dono.getByText("Convite criado.", { exact: false })).toBeVisible();
  const caminho = (await dono.locator("code").first().textContent())?.trim() ?? "";
  expect(caminho).toMatch(/^\/convite\/[A-Za-z0-9_-]+$/);

  // A convidada abre o link sem conta, cria a conta e volta para o convite.
  await convidada.goto(caminho);
  await expect(convidada.getByText("Você recebeu um convite para a equipe da empresa Empresa Equipe.")).toBeVisible();
  await convidada.getByRole("link", { name: "Criar conta" }).click();
  await convidada.getByLabel("Seu nome").fill("Convidada Equipe");
  await convidada.getByLabel("E-mail").fill(emailConvidada);
  await convidada.getByLabel("Senha").fill(SENHA);
  await convidada.getByRole("button", { name: "Criar conta" }).click();
  await convidada.waitForURL(`**${caminho}`);
  await convidada.getByRole("button", { name: "Aceitar e entrar" }).click();
  await convidada.waitForURL("**/painel");
  await expect(convidada.getByText("Empresa Equipe").first()).toBeVisible();

  // A equipe agora tem 2 de 2: sem vaga para outro convite.
  await dono.reload();
  await expect(dono.getByText("Convidada Equipe")).toBeVisible();
  await expect(dono.getByText("2 de 2 usuários do seu plano.")).toBeVisible();
  await expect(dono.getByLabel("E-mail da pessoa")).toHaveCount(0);

  // Recursos do plano: o Médio não tem a nota pelo cliente ideal.
  await dono.goto("/painel/cliente-ideal");
  await expect(dono.getByText("Nota pelo seu cliente ideal: só no plano Grande.")).toBeVisible();

  await contextoDono.close();
  await contextoConvidada.close();
});
