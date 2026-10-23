import { expect, test } from "@playwright/test";
import { criarConta, emailUnico } from "./apoio";

const PLANILHA_EXEMPLO = "docs/exemplos/leads-exemplo.csv";

test("importa a planilha de exemplo e não duplica ao reenviar", async ({ page }) => {
  await criarConta(page, { nome: "Pessoa Importa", email: emailUnico("importa"), empresa: "Empresa Importa" });

  await page.goto("/painel/leads/importar");
  await page.getByLabel("Arquivo CSV").setInputFiles(PLANILHA_EXEMPLO);
  await page.getByRole("button", { name: "Conferir planilha" }).click();

  // Resultado esperado descrito no README.
  await expect(page.getByText("leads-exemplo.csv, 8 linhas lidas")).toBeVisible();
  await expect(page.getByRole("row", { name: /^7 Repetida E-mail repetido da linha 2\./ })).toBeVisible();
  await expect(page.getByRole("row", { name: /^8 Com problema E-mail/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /^9 Com problema Nome/ })).toBeVisible();

  await page.getByRole("button", { name: "Importar 5 leads" }).click();
  await expect(page.getByText("5 leads foram adicionados à sua lista.")).toBeVisible();
  await expect(page.getByText("1 repetida e 2 com problema ficaram de fora.")).toBeVisible();

  // Escolher o mesmo arquivo de novo precisa permitir uma nova conferência.
  await page.getByLabel("Arquivo CSV").setInputFiles(PLANILHA_EXEMPLO);
  await page.getByRole("button", { name: "Conferir planilha" }).click();
  await expect(page.getByText("Nenhuma linha pode ser importada.", { exact: false })).toBeVisible();

  await page.goto("/painel/leads");
  await expect(page.getByText("5 leads", { exact: true })).toBeVisible();
});
