import { expect, test } from "@playwright/test";
import { cadastrarLead, criarConta, emailUnico } from "./apoio";

// Etapa 7: campanha com custo, leads entrando pela página do lead e pelos
// filtros, números vindos do funil.
test("cria campanha, coloca leads e mostra os números do funil", async ({ page }) => {
  await criarConta(page, { nome: "Pessoa Campanha", email: emailUnico("campanha"), empresa: "Empresa Campanha" });
  await cadastrarLead(page, { nome: "Lead Campanha Um" });
  await cadastrarLead(page, { nome: "Lead Campanha Dois" });

  await page.goto("/painel/campanhas");
  await expect(page.getByText("Nenhuma campanha ainda")).toBeVisible();
  await page.getByRole("link", { name: "Nova campanha" }).first().click();
  await page.getByLabel("Nome").fill("Campanha E2E");
  await page.getByLabel("Custo").fill("200,00");
  await page.getByRole("button", { name: "Criar campanha" }).click();
  await expect(page.getByRole("heading", { name: "Campanha E2E" })).toBeVisible();

  // Pelos filtros: todos os leads com "Campanha" no nome.
  await page.getByRole("searchbox", { name: "Buscar" }).fill("Lead Campanha");
  await page.getByRole("button", { name: "Adicionar à campanha" }).click();
  await expect(page.getByText("2 leads entraram na campanha.")).toBeVisible();
  await expect(page.getByText("R$ 100,00")).toBeVisible(); // custo por lead

  // Um deles ganha com valor: a campanha passa a mostrar a venda.
  await page.getByRole("link", { name: "Lead Campanha Um" }).click();
  await expect(page.getByRole("link", { name: "Campanha E2E" })).toBeVisible();
  await page.getByLabel("Mudar para").selectOption({ label: "Ganho" });
  await page.getByRole("button", { name: "Mudar etapa" }).click();
  await page.getByLabel("Valor da venda").fill("1.000,00");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo.")).toBeVisible();

  await page.getByRole("link", { name: "Campanha E2E" }).click();
  await expect(page.getByText("R$ 1.000,00")).toBeVisible(); // valor vendido
  await expect(page.getByText("R$ 800,00")).toBeVisible(); // retorno

  // Tirar um lead da campanha não apaga o lead.
  await page.getByRole("button", { name: "Tirar Lead Campanha Dois da campanha" }).click();
  await expect(page.getByRole("link", { name: "Lead Campanha Dois" })).toHaveCount(0);
  await page.goto("/painel/leads");
  await expect(page.getByRole("link", { name: /Lead Campanha Dois/ })).toBeVisible();
});
