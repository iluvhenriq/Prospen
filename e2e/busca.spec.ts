import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { urlDoBancoE2E } from "./ambiente";
import { criarConta, emailUnico, definirPlano } from "./apoio";

// Busca na base pública e "adicionar como lead" (etapa 5d). O banco de testes
// não tem a base real: três empresas fictícias são gravadas antes, com CNPJs
// válidos no cálculo.
const PADARIA = "10000001000190";
const MEI = "10000002000134";
const OFICINA = "10000003000189";

test.beforeAll(async () => {
  const pool = new Pool({ connectionString: urlDoBancoE2E() });
  try {
    await pool.query(`
      insert into base_cnpj_cnaes (codigo, descricao) values
        ('1091102', 'Padaria e confeitaria com predominância de produção própria'),
        ('4520001', 'Serviços de manutenção e reparação mecânica de veículos automotores')
      on conflict do nothing;
      insert into base_cnpj_estabelecimentos
        (cnpj, cnpj_basico, matriz, nome_fantasia, cnae_principal, uf, municipio_codigo, municipio_nome, telefone_1, email, mes_referencia) values
        ('${PADARIA}', '10000001', true, 'PADARIA TESTE E2E', '1091102', 'SP', '7107', 'SAO PAULO', '1133334444', 'padaria@exemplo.com.br', '2026-10'),
        ('${MEI}', '10000002', true, 'PAES DO MEI E2E', '1091102', 'SP', '7107', 'SAO PAULO', null, null, '2026-10'),
        ('${OFICINA}', '10000003', true, 'OFICINA TESTE E2E', '4520001', 'SP', '7107', 'SAO PAULO', null, null, '2026-10')
      on conflict do nothing;
      insert into base_cnpj_empresas (cnpj_basico, razao_social, natureza_juridica, mes_referencia) values
        ('10000001', 'PADARIA TESTE E2E LTDA', '2062', '2026-10'),
        ('10000002', 'FULANO DE TAL', '2135', '2026-10'),
        ('10000003', 'OFICINA TESTE E2E LTDA', '2062', '2026-10')
      on conflict do nothing;
      insert into base_cnpj_municipios (codigo, nome, uf) values ('7107', 'SAO PAULO', 'SP') on conflict do nothing;
      insert into base_cnpj_cargas (uf, mes_referencia, estabelecimentos) values ('SP', '2026-10', 3) on conflict do nothing;
    `);
  } finally {
    await pool.end();
  }
});

test("busca por atividade sem MEI, adiciona como lead sem duplicar e respeita o pedido de remoção", async ({ page, baseURL }) => {
  const email = emailUnico("busca");
  await criarConta(page, { nome: "Pessoa Busca", email, empresa: "Empresa Busca" });
  // Planos (28/10/2026): vigiar busca e exportar CSV são do Médio em diante.
  definirPlano(email, "medio");

  await page.goto("/painel/busca");
  await page.getByLabel("Estado").selectOption("SP");
  await page.getByRole("searchbox", { name: "Atividade" }).fill("padaria");
  await page.getByRole("button", { name: "Buscar" }).click();

  // MEI fica de fora por padrão; a oficina não é da atividade. O nome da Receita
  // (caixa alta) aparece sem caixa alta na tela.
  await expect(page.getByText("Padaria Teste E2E", { exact: true })).toBeVisible();
  await expect(page.getByText("PAES DO MEI E2E")).toHaveCount(0);
  await expect(page.getByText("Oficina Teste E2E", { exact: true })).toHaveCount(0);

  await page.getByLabel("Marcar Padaria Teste E2E").check();
  await page.getByRole("button", { name: /Adicionar marcadas como leads \(1\)/ }).click();
  await expect(page.getByText("1 lead adicionado.")).toBeVisible();
  await expect(page.getByText("Já é lead")).toBeVisible();
  await expect(page.getByLabel("Marcar Padaria Teste E2E")).toBeDisabled();

  // Com MEI marcado, ele aparece com o selo.
  await page.getByLabel("Incluir MEI").check();
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Paes do MEI E2E", { exact: true })).toBeVisible();

  // Vigiar a busca (etapa 9e): aparece no painel e dá para parar de vigiar.
  await page.getByRole("button", { name: "Vigiar esta busca" }).click();
  await expect(page.getByText("Busca vigiada. As empresas novas aparecem no painel.")).toBeVisible();
  await page.goto("/painel");
  const novidades = page.locator("section").filter({ hasText: "Empresas novas nas suas buscas" });
  await expect(novidades.getByText("padaria, em", { exact: false })).toBeVisible();
  await novidades.getByRole("button", { name: /Parar de vigiar/ }).click();
  await expect(novidades.getByText("Vigie uma busca", { exact: false })).toBeVisible();

  await page.goto("/painel/leads?origem=busca_cnpj");
  await expect(page.getByText("1 lead", { exact: true })).toBeVisible();
  await expect(page.getByText("Padaria Teste E2E", { exact: true })).toBeVisible();

  // Pedido público "remover meus dados", sem login (outra janela, sem cookie).
  // Fica neste teste porque a rodada já usa os 10 cadastros por hora do servidor.
  const anonimo = await page.context().browser()!.newContext({ baseURL });
  const publica = await anonimo.newPage();
  await publica.goto("/");
  await publica.getByRole("contentinfo").getByRole("link", { name: "Política de privacidade" }).click();
  await expect(publica.getByRole("heading", { level: 1, name: "Política de privacidade" })).toBeVisible();
  await expect(publica.getByRole("link", { name: "contato.henriqdev@gmail.com" }).first()).toBeVisible();
  await publica.getByRole("link", { name: "Remover meus dados" }).click();
  await publica.waitForURL("**/remover-meus-dados");
  await publica.getByLabel("CNPJ da empresa").fill("10.000.003/0001-89");
  await publica.getByRole("button", { name: "Remover da busca" }).click();
  await expect(publica.getByText("Marque a confirmação para continuar.")).toBeVisible();
  await publica.getByLabel(/Confirmo que sou responsável/).check();
  await publica.getByRole("button", { name: "Remover da busca" }).click();
  await expect(publica.getByText(/O CNPJ 10\.000\.003\/0001-89 não aparece mais/)).toBeVisible();
  await anonimo.close();

  // Para quem busca, a oficina sumiu na hora, até pelo CNPJ exato.
  await page.goto(`/painel/busca?cnpj=${OFICINA}`);
  await expect(page.getByText("CNPJ não encontrado")).toBeVisible();
  await expect(page.getByText("OFICINA TESTE E2E")).toHaveCount(0);
});
