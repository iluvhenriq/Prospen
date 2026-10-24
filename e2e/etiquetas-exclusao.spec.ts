import { expect, test } from "@playwright/test";
import { cadastrarLead, criarConta, emailUnico } from "./apoio";

// Uma conta só para os dois fluxos: o servidor aceita 10 cadastros por hora
// por endereço, e a rodada inteira dos testes já chega perto disso.
test("etiquetas na página própria e exclusão de lead", async ({ page }) => {
  await criarConta(page, { nome: "Pessoa Etiquetas", email: emailUnico("etiquetas"), empresa: "Empresa Etiquetas" });

  // Página de etiquetas vazia, depois criar uma.
  await page.goto("/painel/leads/etiquetas");
  await expect(page.getByText("Nenhuma etiqueta ainda")).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Quente");
  await page.getByLabel("Cor").selectOption({ label: "Roxo" });
  await page.getByRole("button", { name: "Criar etiqueta" }).click();
  await expect(page.getByText("Etiqueta criada.")).toBeVisible();
  await expect(page.getByRole("link", { name: "0 leads" })).toBeVisible();

  // O mesmo nome de novo é recusado, sem criar outra.
  await page.getByLabel("Nome", { exact: true }).fill("quente");
  await page.getByRole("button", { name: "Criar etiqueta" }).click();
  await expect(page.getByText("Já existe uma etiqueta com este nome.")).toBeVisible();
  await expect(page.getByRole("link", { name: /\d+ leads?$/ })).toHaveCount(1);

  // Aplicar a etiqueta num lead; o outro fica sem.
  const outro = await cadastrarLead(page, { nome: "Lead Sem Etiqueta" });
  const lead = await cadastrarLead(page, { nome: "Lead Etiquetado" });
  await page.getByLabel("Escolher etiqueta").selectOption({ label: "Quente" });
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("button", { name: /Remover.*Quente/ })).toBeVisible();

  // A contagem da página de etiquetas leva à lista filtrada.
  await page.goto("/painel/leads/etiquetas");
  await page.getByRole("link", { name: "1 lead" }).click();
  await page.waitForURL(/etiqueta=/);
  await expect(page.getByRole("link", { name: /Lead Etiquetado/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Lead Sem Etiqueta/ })).toHaveCount(0);

  // Excluir a etiqueta pede uma segunda decisão e a tira do lead, que continua.
  await page.goto("/painel/leads/etiquetas");
  await page.locator("summary", { hasText: "Excluir" }).click();
  await expect(page.getByText("Ela será removida de todos os leads.")).toBeVisible();
  await page.getByRole("button", { name: "Excluir etiqueta" }).click();
  await expect(page.getByText("Nenhuma etiqueta ainda")).toBeVisible();
  await page.goto(`/painel/leads/${lead}`);
  await expect(page.getByRole("heading", { level: 1, name: "Lead Etiquetado" })).toBeVisible();
  await expect(page.getByText("Nenhuma etiqueta neste lead.")).toBeVisible();

  // Excluir o lead: volta para a lista, ele some e o endereço antigo não mostra nada.
  await page.locator("summary", { hasText: "Excluir este lead" }).click();
  await page.getByRole("button", { name: "Excluir lead definitivamente" }).click();
  await page.waitForURL(/\/painel\/leads$/);
  await expect(page.getByRole("link", { name: /Lead Sem Etiqueta/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Lead Etiquetado/ })).toHaveCount(0);
  await page.goto(`/painel/leads/${lead}`);
  await expect(page.getByText("Não encontramos este item")).toBeVisible();
  await expect(page.getByText("Lead Etiquetado")).toHaveCount(0);

  // O outro lead não foi afetado.
  await page.goto(`/painel/leads/${outro}`);
  await expect(page.getByRole("heading", { level: 1, name: "Lead Sem Etiqueta" })).toBeVisible();
});
