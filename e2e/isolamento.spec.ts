import { expect, test, type Page } from "@playwright/test";
import { cadastrarLead, criarConta, emailUnico } from "./apoio";

// Troca, no navegador, o identificador escondido dos formulários pelo de um
// lead de outra empresa. Simula alguém adulterando a página. Espera a página
// terminar de carregar: antes disso, o React devolveria o valor original.
async function apontarFormulariosPara(page: Page, leadId: string): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate((id) => {
    document
      .querySelectorAll<HTMLInputElement>('input[type="hidden"][name="leadId"], input[type="hidden"][name="id"]')
      .forEach((campo) => {
        campo.value = id;
      });
  }, leadId);
  // Confirma que a troca ficou, para o teste não passar sem ter adulterado nada.
  await expect(page.locator('input[type="hidden"][name="leadId"]').first()).toHaveValue(leadId);
}

test("uma empresa não vê nem altera os leads de outra", async ({ browser }) => {
  const contextoA = await browser.newContext();
  const contextoB = await browser.newContext();
  const a = await contextoA.newPage();
  const b = await contextoB.newPage();

  await criarConta(a, { nome: "Pessoa A", email: emailUnico("isolamento-a"), empresa: "Empresa A" });
  const leadA = await cadastrarLead(a, { nome: "Lead Sigiloso", email: emailUnico("sigiloso") });

  await criarConta(b, { nome: "Pessoa B", email: emailUnico("isolamento-b"), empresa: "Empresa B" });

  // A lista e o quadro da empresa B não mostram o lead da A.
  await b.goto("/painel/leads");
  await expect(b.getByText("Você ainda não tem leads")).toBeVisible();
  await b.goto("/painel/funil");
  await expect(b.getByText("O funil está vazio")).toBeVisible();

  // Abrir o endereço do lead da A dá "não encontrado", sem nenhum dado.
  await b.goto(`/painel/leads/${leadA}`);
  await expect(b.getByText("Não encontramos este item")).toBeVisible();
  await expect(b.getByText("Lead Sigiloso")).toHaveCount(0);

  // Adulterando os formulários de um lead próprio para mirar o lead da A.
  const leadB = await cadastrarLead(b, { nome: "Lead da B" });
  const paginaDoLeadB = `/painel/leads/${leadB}`;

  await apontarFormulariosPara(b, leadA);
  await b.getByLabel("Mudar para").selectOption({ label: "Perdido" });
  await b.getByRole("button", { name: "Mudar etapa" }).click();

  await b.goto(paginaDoLeadB);
  await apontarFormulariosPara(b, leadA);
  await b.getByLabel("Nova nota").fill("NOTA INVASORA");
  await b.getByRole("button", { name: "Adicionar nota" }).click();
  await expect(b.getByText("Não foi possível salvar. Tente novamente em instantes.")).toBeVisible();

  await b.goto(paginaDoLeadB);
  await apontarFormulariosPara(b, leadA);
  await b.getByLabel("Nome", { exact: true }).fill("NOME INVASOR");
  await b.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(b.getByText("Não foi possível salvar. Tente novamente em instantes.")).toBeVisible();

  await b.goto(paginaDoLeadB);
  await apontarFormulariosPara(b, leadA);
  await b.getByLabel("Nome da nova etiqueta").fill("INVASORA");
  await b.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(b.getByText("Não foi possível salvar. Tente novamente em instantes.")).toBeVisible();

  await b.goto(paginaDoLeadB);
  await b.getByText("Excluir este lead").click();
  await apontarFormulariosPara(b, leadA);
  await b.getByRole("button", { name: "Excluir lead definitivamente" }).click();
  await b.waitForURL("**/painel/leads");

  // Do lado da empresa A, nada mudou.
  await a.goto(`/painel/leads/${leadA}`);
  await expect(a.getByRole("heading", { level: 1, name: "Lead Sigiloso" })).toBeVisible();
  await expect(a.getByText("Este lead ainda não mudou de etapa.")).toBeVisible();
  await expect(a.getByText("Nenhuma nota ainda.", { exact: false })).toBeVisible();
  await expect(a.getByText("Nenhuma etiqueta neste lead.")).toBeVisible();
  await expect(a.getByText("NOTA INVASORA")).toHaveCount(0);

  await contextoA.close();
  await contextoB.close();
});
