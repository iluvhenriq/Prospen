import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { cadastrarLead, criarConta, emailUnico, definirPlano } from "./apoio";

const PLANILHA_EXEMPLO = "docs/exemplos/leads-exemplo.csv";

test("importa a planilha de exemplo e não duplica ao reenviar", async ({ page }) => {
  const email = emailUnico("importa");
  await criarConta(page, { nome: "Pessoa Importa", email, empresa: "Empresa Importa" });
  // Planos (28/10/2026): vigiar busca e exportar CSV são do Médio em diante.
  definirPlano(email, "medio");

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

  // Exportação em CSV (28/10/2026). Fica neste teste para não criar outra
  // conta: a bateria já usa os 10 cadastros por hora permitidos por endereço.
  // Nome que viraria fórmula no Excel precisa sair como texto.
  await cadastrarLead(page, { nome: "=1+1 Oficina" });
  await page.goto("/painel/leads");
  const espera = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar todos os leads em CSV" }).click();
  const download = await espera;
  expect(download.suggestedFilename()).toMatch(/^leads-prospen-\d{4}-\d{2}-\d{2}\.csv$/);
  const arquivo = await readFile(await download.path(), "utf8");
  // Cabeçalho + 6 leads (5 da planilha e o cadastrado à mão).
  expect(arquivo.split("\r\n").filter(Boolean)).toHaveLength(7);
  expect(arquivo).toContain("\r\n'=1+1 Oficina;");

  // Com filtro, só o que a lista mostra.
  const filtrado = await page.request.get("/painel/leads/exportar?q=diego");
  expect(filtrado.status()).toBe(200);
  expect((await filtrado.text()).split("\r\n").filter(Boolean)).toHaveLength(2);
});
