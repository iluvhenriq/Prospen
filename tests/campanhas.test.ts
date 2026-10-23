import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { repositorioCampanhas } from "@/modules/campanhas/repositorio";
import { validarCampanha } from "@/modules/campanhas/validacao";
import { repositorioLeads } from "@/modules/leads/repositorio";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

const SEM_DADOS = { objetivo: null, responsavelId: null, inicio: null, fim: null, custoCentavos: null };

describe("validação da campanha", () => {
  const base = { nome: "Padarias", objetivo: "", inicio: "", fim: "", custo: "" };

  it("aceita o mínimo e converte vazios em nulo", () => {
    expect(validarCampanha(base)).toEqual({
      ok: true,
      dados: { nome: "Padarias", objetivo: null, inicio: null, fim: null, custoCentavos: null },
    });
    expect(validarCampanha({ ...base, custo: "R$ 500,00", inicio: "2026-11-01", fim: "2026-11-30" })).toMatchObject({
      ok: true,
      dados: { custoCentavos: 50000, inicio: "2026-11-01", fim: "2026-11-30" },
    });
  });

  it("recusa nome vazio, data impossível, fim antes do início e custo inválido", () => {
    expect(validarCampanha({ ...base, nome: "  " })).toMatchObject({ ok: false, erros: { nome: expect.any(String) } });
    expect(validarCampanha({ ...base, inicio: "2026-02-30" })).toMatchObject({ ok: false, erros: { inicio: expect.any(String) } });
    expect(validarCampanha({ ...base, inicio: "2026-11-10", fim: "2026-11-01" })).toMatchObject({
      ok: false,
      erros: { fim: expect.any(String) },
    });
    expect(validarCampanha({ ...base, custo: "muito" })).toMatchObject({ ok: false, erros: { custo: expect.any(String) } });
  });
});

describe("campanhas", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;
  const campanhasA = () => repositorioCampanhas(amb.db, empresaA);
  const campanhasB = () => repositorioCampanhas(amb.db, empresaB);
  const leadsA = () => repositorioLeads(amb.db, empresaA);
  const leadsB = () => repositorioLeads(amb.db, empresaB);

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Agência A", "agencia-a");
    empresaB = await criarEmpresa(amb, bruno, "Agência B", "agencia-b");
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("conta leads, contatados, ganhos e valor vendido a partir do funil", async () => {
    const campanha = await campanhasA().criar({ ...SEM_DADOS, nome: "Padarias", custoCentavos: 50000 }, "BRL", ana.id);
    expect(campanha).toMatchObject({ moedaCusto: "BRL", situacao: "ativa" });

    const novo = await leadsA().criar({ nome: "Novo" }, ana.id);
    const contatado = await leadsA().criar({ nome: "Contatado" }, ana.id);
    const ganho = await leadsA().criar({ nome: "Ganho" }, ana.id);
    await leadsA().mudarEtapa(contatado.id, "contatado", ana.id);
    await leadsA().mudarEtapa(ganho.id, "ganho", ana.id);
    await leadsA().registrarValorVenda(ganho.id, 120000, "BRL");

    expect(await campanhasA().adicionarLeads(campanha.id, [novo.id, contatado.id, ganho.id, ganho.id], ana.id)).toBe(3);
    // De novo: quem já está é pulado.
    expect(await campanhasA().adicionarLeads(campanha.id, [novo.id], ana.id)).toBe(0);

    expect(await campanhasA().buscarComNumeros(campanha.id, "BRL")).toMatchObject({
      leads: 3,
      contatados: 2,
      ganhos: 1,
      perdidos: 0,
      vendidoCentavos: 120000,
    });
    // Venda em outra moeda não entra na soma.
    expect((await campanhasA().buscarComNumeros(campanha.id, "USD"))?.vendidoCentavos).toBe(0);
    expect((await campanhasA().doLead(ganho.id)).map((c) => c.nome)).toEqual(["Padarias"]);
  });

  it("campanha sem leads tem tudo zero", async () => {
    const vazia = await campanhasA().criar({ ...SEM_DADOS, nome: "Vazia" }, "BRL", ana.id);
    expect(await campanhasA().buscarComNumeros(vazia.id, "BRL")).toMatchObject({
      leads: 0,
      contatados: 0,
      ganhos: 0,
      vendidoCentavos: 0,
      moedaCusto: null,
    });
  });

  it("uma empresa não vê, não altera e não coloca leads na campanha da outra", async () => {
    const deB = await campanhasB().criar({ ...SEM_DADOS, nome: "Campanha da B" }, "BRL", bruno.id);
    const leadDeA = await leadsA().criar({ nome: "Lead da A" }, ana.id);

    expect(await campanhasA().buscar(deB.id)).toBeNull();
    expect((await campanhasA().listar("BRL")).map((c) => c.nome)).not.toContain("Campanha da B");
    expect(await campanhasA().mudarSituacao(deB.id, "encerrada")).toBe(false);
    expect(await campanhasA().excluir(deB.id)).toBe(false);
    expect(await campanhasA().adicionarLeads(deB.id, [leadDeA.id], ana.id)).toBeNull();
    // A B tentando colocar um lead da A na própria campanha: é ignorado.
    expect(await campanhasB().adicionarLeads(deB.id, [leadDeA.id], bruno.id)).toBe(0);
    expect(await campanhasB().leadsDaCampanha(deB.id)).toEqual([]);
  });

  it("o banco recusa ligar lead de uma empresa à campanha de outra, mesmo por fora do repositório", async () => {
    const deB = await campanhasB().criar({ ...SEM_DADOS, nome: "Outra da B" }, "BRL", bruno.id);
    const leadDeA = await leadsA().criar({ nome: "Lead A por fora" }, ana.id);
    await expect(
      amb.db.execute(
        sql`insert into campanha_leads (organizacao_id, campanha_id, lead_id) values (${empresaB}, ${deB.id}, ${leadDeA.id})`,
      ),
    ).rejects.toThrow();
  });

  it("tirar o lead, encerrar e excluir a campanha não apaga leads", async () => {
    const campanha = await campanhasA().criar({ ...SEM_DADOS, nome: "Temporária" }, "BRL", ana.id);
    const lead = await leadsA().criar({ nome: "Fica" }, ana.id);
    await campanhasA().adicionarLeads(campanha.id, [lead.id], ana.id);

    expect(await campanhasA().removerLead(campanha.id, lead.id)).toBe(true);
    expect(await campanhasA().leadsDaCampanha(campanha.id)).toEqual([]);
    await campanhasA().adicionarLeads(campanha.id, [lead.id], ana.id);

    expect(await campanhasA().mudarSituacao(campanha.id, "encerrada")).toBe(true);
    expect(await campanhasA().excluir(campanha.id)).toBe(true);
    expect(await campanhasA().buscar(campanha.id)).toBeNull();
    expect(await leadsA().buscar(lead.id)).not.toBeNull();
  });

  it("adiciona pelos filtros da lista, só leads da empresa", async () => {
    const campanha = await campanhasA().criar({ ...SEM_DADOS, nome: "Por filtro" }, "BRL", ana.id);
    await leadsA().criar({ nome: "Filtro Alfa" }, ana.id);
    await leadsA().criar({ nome: "Filtro Beta" }, ana.id);
    await leadsB().criar({ nome: "Filtro Gama da B" }, bruno.id);

    const ids = await leadsA().idsPorFiltro({ busca: "Filtro" }, 1000);
    expect(ids).toHaveLength(2);
    expect(await campanhasA().adicionarLeads(campanha.id, ids, ana.id)).toBe(2);
    expect((await campanhasA().leadsDaCampanha(campanha.id)).map((l) => l.nome).sort()).toEqual([
      "Filtro Alfa",
      "Filtro Beta",
    ]);
  });
});
