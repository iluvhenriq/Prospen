import { expect, test } from "@playwright/test";
import { cadastrarLead, criarConta, emailUnico } from "./apoio";

// Etapa 7: valor da venda em "Ganho" e motivo em "Perdido", e o que o quadro mostra.
test("registra valor da venda e motivo da perda, e limpa ao mudar de etapa", async ({ page }) => {
  await criarConta(page, { nome: "Pessoa Resultado", email: emailUnico("resultado"), empresa: "Empresa Resultado" });
  await cadastrarLead(page, { nome: "Lead Resultado" });

  // Fora de Ganho e Perdido, não há campo de resultado.
  await expect(page.getByLabel("Valor da venda")).toHaveCount(0);
  await expect(page.getByLabel("Motivo da perda")).toHaveCount(0);

  await page.getByLabel("Mudar para").selectOption({ label: "Ganho" });
  await page.getByRole("button", { name: "Mudar etapa" }).click();
  await expect(page.getByText("De Novo para Ganho")).toBeVisible();

  await page.getByLabel("Valor da venda").fill("abc");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Informe um valor como 1.500,00.")).toBeVisible();

  await page.getByLabel("Valor da venda").fill("2.500,50");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Valor da venda")).toHaveValue("2.500,50");

  await page.goto("/painel/funil");
  await expect(page.getByText(/R\$\s2\.500,50/)).toBeVisible();

  // Mudar para Perdido: o valor some e aparece o motivo.
  await page.getByLabel("Mover Lead Resultado para").selectOption({ label: "Perdido" });
  await page.getByRole("button", { name: "Mover" }).click();
  await expect(page.getByText("Sem motivo")).toBeVisible();
  await expect(page.getByText(/R\$\s2\.500,50/)).toHaveCount(0);

  await page.getByRole("link", { name: "Lead Resultado" }).click();
  await page.getByLabel("Motivo da perda").selectOption({ label: "Preço" });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Salvo.")).toBeVisible();

  await page.goto("/painel/funil");
  await expect(page.getByText("Preço", { exact: true })).toBeVisible();

  // Aprendizado (etapa 9d): com 1 negócio encerrado, nenhuma conclusão.
  await page.goto("/painel");
  await expect(page.getByText("Hoje são 1; faltam 4.", { exact: false })).toBeVisible();

  // Mais 4 encerrados (2 ganhos, 2 perdidos): 5 no total, todos de prioridade
  // baixa (cadastro manual sem contato). A taxa aparece só onde há casos.
  for (const [nome, etapa] of [
    ["Ganho A", "Ganho"],
    ["Ganho B", "Ganho"],
    ["Perdido A", "Perdido"],
    ["Perdido B", "Perdido"],
  ] as const) {
    await cadastrarLead(page, { nome });
    await page.getByLabel("Mudar para").selectOption({ label: etapa });
    await page.getByRole("button", { name: "Mudar etapa" }).click();
    await expect(page.getByText(`De Novo para ${etapa}`)).toBeVisible();
  }
  await page.goto("/painel");
  const porPrioridade = page.getByRole("table", { name: "Fechamento por prioridade" });
  await expect(porPrioridade.getByRole("row", { name: /Prioridade baixa/ })).toContainText("40%");
  await expect(porPrioridade.getByRole("row", { name: /Prioridade alta/ })).toContainText("poucos casos");
});
