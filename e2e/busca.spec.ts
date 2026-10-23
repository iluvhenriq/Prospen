import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { urlDoBancoE2E } from "./ambiente";
import { criarConta, emailUnico } from "./apoio";

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

test("busca por atividade sem MEI e adiciona como lead sem duplicar", async ({ page }) => {
  await criarConta(page, { nome: "Pessoa Busca", email: emailUnico("busca"), empresa: "Empresa Busca" });

  await page.goto("/painel/busca");
  await page.getByLabel("Estado").selectOption("SP");
  await page.getByRole("searchbox", { name: "Atividade" }).fill("padaria");
  await page.getByRole("button", { name: "Buscar" }).click();

  // MEI fica de fora por padrão; a oficina não é da atividade.
  await expect(page.getByText("PADARIA TESTE E2E", { exact: true })).toBeVisible();
  await expect(page.getByText("PAES DO MEI E2E")).toHaveCount(0);
  await expect(page.getByText("OFICINA TESTE E2E", { exact: true })).toHaveCount(0);

  await page.getByLabel("Marcar PADARIA TESTE E2E").check();
  await page.getByRole("button", { name: /Adicionar marcadas como leads \(1\)/ }).click();
  await expect(page.getByText("1 lead adicionado.")).toBeVisible();
  await expect(page.getByText("Já é lead")).toBeVisible();
  await expect(page.getByLabel("Marcar PADARIA TESTE E2E")).toBeDisabled();

  // Com MEI marcado, ele aparece com o selo.
  await page.getByLabel("Incluir MEI").check();
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("PAES DO MEI E2E", { exact: true })).toBeVisible();

  await page.goto("/painel/leads?origem=busca_cnpj");
  await expect(page.getByText("1 lead", { exact: true })).toBeVisible();
  await expect(page.getByText("PADARIA TESTE E2E", { exact: true })).toBeVisible();
});
