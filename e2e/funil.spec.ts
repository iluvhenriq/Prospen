import { expect, test, type Page } from "@playwright/test";
import { cadastrarLead, criarConta, emailUnico, rolaParaOLado } from "./apoio";

// Coluna do quadro pelo nome da etapa (o título da coluna começa com ele).
function coluna(page: Page, etapa: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 2, name: new RegExp(`^${etapa}`) }) });
}

test("move o lead entre etapas, guarda o histórico e filtra a lista", async ({ page }) => {
  await criarConta(page, { nome: "Pessoa Funil", email: emailUnico("funil"), empresa: "Empresa Funil" });

  await page.goto("/painel/funil");
  await expect(page.getByText("O funil está vazio")).toBeVisible();

  const leadId = await cadastrarLead(page, { nome: "Lead do Funil" });

  // Pela página do lead.
  await page.getByLabel("Mudar para").selectOption({ label: "Contatado" });
  await page.getByRole("button", { name: "Mudar etapa" }).click();
  await expect(page.getByText("De Novo para Contatado")).toBeVisible();
  // A lista precisa mostrar a etapa nova, e não voltar para a antiga.
  await expect(page.getByLabel("Mudar para")).toHaveValue("contatado");

  // Pelo quadro.
  await page.goto("/painel/funil");
  const mover = page.getByLabel("Mover Lead do Funil para");
  await expect(mover).toHaveValue("contatado");
  await mover.selectOption({ label: "Proposta" });
  await page.getByRole("button", { name: "Mover" }).click();
  await expect(coluna(page, "Proposta").getByRole("link", { name: "Lead do Funil" })).toBeVisible();
  await expect(coluna(page, "Contatado").getByText("Nenhum lead nesta etapa.")).toBeVisible();

  // No celular, o quadro rola por dentro, sem empurrar a página para o lado.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(coluna(page, "Proposta").getByRole("link", { name: "Lead do Funil" })).toBeVisible();
  expect(await rolaParaOLado(page)).toBe(false);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Histórico na página do lead, do mais novo para o mais antigo.
  await page.goto(`/painel/leads/${leadId}`);
  const historico = page.getByRole("heading", { name: "Histórico de etapas" }).locator("..");
  await expect(historico.getByRole("listitem")).toHaveText([
    /De Contatado para Proposta/,
    /De Novo para Contatado/,
    /Entrou no funil/,
  ]);

  // Filtro por etapa na lista.
  await page.goto("/painel/leads");
  await page.getByLabel("Etapa").selectOption({ label: "Proposta" });
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/etapa=proposta/);
  await expect(page.getByRole("link", { name: /Lead do Funil/ })).toBeVisible();

  await page.getByLabel("Etapa").selectOption({ label: "Novo" });
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/etapa=novo/);
  await expect(page.getByText("Nenhum lead encontrado")).toBeVisible();
});

test("coluna cheia mostra 30 cartões e leva à lista filtrada", async ({ page }) => {
  await criarConta(page, { nome: "Pessoa Volume", email: emailUnico("volume"), empresa: "Empresa Volume" });

  // Planilha fictícia com 31 leads, montada no próprio teste.
  const linhas = ["Nome;E-mail"];
  for (let i = 1; i <= 31; i += 1) linhas.push(`Volume ${i};volume${i}@exemplo.com.br`);
  await page.goto("/painel/leads/importar");
  await page.getByLabel("Arquivo CSV").setInputFiles({
    name: "volume.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(linhas.join("\n"), "utf-8"),
  });
  await page.getByRole("button", { name: "Conferir planilha" }).click();
  await page.getByRole("button", { name: "Importar 31 leads" }).click();
  await expect(page.getByText("31 leads foram adicionados à sua lista.")).toBeVisible();

  await page.goto("/painel/funil");
  const novo = coluna(page, "Novo");
  await expect(novo.getByRole("link", { name: /^Volume / })).toHaveCount(30);
  await novo.getByRole("link", { name: "Ver todos os 31 na lista" }).click();
  await expect(page).toHaveURL(/\/painel\/leads\?etapa=novo/);
  // O Next.js guarda a página do quadro escondida no documento: conta só o visível.
  await expect(page.getByText("31 leads", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByLabel("Etapa")).toHaveValue("novo");
});
