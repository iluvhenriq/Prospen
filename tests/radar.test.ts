import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseCnpjCnaes, baseCnpjEstabelecimentos, baseCnpjSinais, type SinalDaBase } from "@/db/schema";
import { cruzarSinaisComLeads } from "@/modules/base-cnpj/radar";
import { repositorioBaseCnpj } from "@/modules/base-cnpj/repositorio";
import { repositorioLeads, type LeadComCnpj } from "@/modules/leads/repositorio";
import { cadastrarPessoa, criarAmbienteDeTeste, criarEmpresa, type AmbienteDeTeste } from "./ajuda/banco-teste";

// Radar (27/10/2026): mudanças entre dois meses da base pública. CNPJs fictícios.
const IGUAL = "30000001000101"; // não muda
const NOVA_UNIDADE = "30000001000292"; // mesma raiz da IGUAL, aparece no mês novo
const MUDOU_CIDADE = "30000002000108";
const MUDOU_ATIVIDADE = "30000003000144";
const FECHOU = "30000004000180";
const EMPRESA_NOVA = "30000005000125"; // raiz nova: empresa nova, não é unidade
const EXCLUIDA = "30000006000160"; // pediu para sair e sumiu: não vira sinal

function estab(cnpj: string, mes: string, extra: Partial<{ municipioCodigo: string; municipioNome: string; cnaePrincipal: string }> = {}) {
  return {
    cnpj,
    cnpjBasico: cnpj.slice(0, 8),
    matriz: cnpj.slice(8, 12) === "0001",
    nomeFantasia: `EMPRESA ${cnpj}`,
    cnaePrincipal: "1091102",
    uf: "SP",
    municipioCodigo: "7107",
    municipioNome: "SAO PAULO",
    mesReferencia: mes,
    ...extra,
  };
}

describe("Radar: sinais entre dois meses da base", () => {
  let amb: AmbienteDeTeste;
  const base = () => repositorioBaseCnpj(amb.db);

  async function carregar(mes: string, linhas: ReturnType<typeof estab>[]) {
    await base().prepararCarga();
    await base().inserirNaCarga(linhas);
    await base().concluirCarga("SP");
    await base().registrarCarga("SP", mes);
  }

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    await amb.db.insert(baseCnpjCnaes).values([
      { codigo: "1091102", descricao: "Padaria" },
      { codigo: "5611201", descricao: "Restaurantes e similares" },
    ]);
    // Primeira carga do estado: não há com o que comparar, nenhum sinal.
    await carregar("2026-10", [
      estab(IGUAL, "2026-10"),
      estab(MUDOU_CIDADE, "2026-10"),
      estab(MUDOU_ATIVIDADE, "2026-10"),
      estab(FECHOU, "2026-10"),
      estab(EXCLUIDA, "2026-10"),
    ]);
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("a primeira carga de um estado não gera sinal", async () => {
    expect(await amb.db.select().from(baseCnpjSinais)).toEqual([]);
  });

  it("o mês novo gera exatamente as mudanças esperadas", async () => {
    await base().excluirCnpj(EXCLUIDA);
    await carregar("2026-11", [
      estab(IGUAL, "2026-11"),
      estab(NOVA_UNIDADE, "2026-11", { municipioCodigo: "6291", municipioNome: "CAMPINAS" }),
      estab(MUDOU_CIDADE, "2026-11", { municipioCodigo: "6291", municipioNome: "CAMPINAS" }),
      estab(MUDOU_ATIVIDADE, "2026-11", { cnaePrincipal: "5611201" }),
      estab(EMPRESA_NOVA, "2026-11"),
    ]);

    const sinais = await amb.db.select().from(baseCnpjSinais);
    const resumo = sinais
      .map((sinal) => ({ cnpj: sinal.cnpj, tipo: sinal.tipo, antes: sinal.antes, depois: sinal.depois, mes: sinal.mesReferencia }))
      .sort((a, b) => a.cnpj.localeCompare(b.cnpj));
    expect(resumo).toEqual([
      { cnpj: NOVA_UNIDADE, tipo: "nova_unidade", antes: null, depois: "CAMPINAS/SP", mes: "2026-11" },
      { cnpj: MUDOU_CIDADE, tipo: "mudou_cidade", antes: "SAO PAULO/SP", depois: "CAMPINAS/SP", mes: "2026-11" },
      { cnpj: MUDOU_ATIVIDADE, tipo: "mudou_atividade", antes: "Padaria", depois: "Restaurantes e similares", mes: "2026-11" },
      { cnpj: FECHOU, tipo: "deixou_ativa", antes: "SAO PAULO/SP", depois: null, mes: "2026-11" },
    ]);
  });

  it("recalcular o mesmo mês não gera sinal de novo", async () => {
    await base().prepararCarga();
    await base().copiarEstadoParaCarga("SP");
    await base().concluirCarga("SP");
    expect(await amb.db.select().from(baseCnpjSinais)).toHaveLength(4);
  });

  it("a base nova é a que fica para a busca", async () => {
    const cnpjs = (await amb.db.select({ cnpj: baseCnpjEstabelecimentos.cnpj }).from(baseCnpjEstabelecimentos)).map((l) => l.cnpj);
    expect(cnpjs.sort()).toEqual([IGUAL, NOVA_UNIDADE, MUDOU_CIDADE, MUDOU_ATIVIDADE, EMPRESA_NOVA].sort());
  });

  it("lê os sinais de uma empresa e das novas unidades pela raiz", async () => {
    // Quem tem a IGUAL como lead vê a nova unidade dela (pela raiz).
    const daIgual = await base().sinaisDe([IGUAL], [IGUAL.slice(0, 8)]);
    expect(daIgual.map((sinal) => [sinal.cnpj, sinal.tipo])).toEqual([[NOVA_UNIDADE, "nova_unidade"]]);
    // Quem tem a que fechou vê só o sinal dela.
    const daFechou = await base().sinaisDe([FECHOU], [FECHOU.slice(0, 8)]);
    expect(daFechou.map((sinal) => sinal.tipo)).toEqual(["deixou_ativa"]);
    expect(await base().sinaisDe([], [])).toEqual([]);
  });

  it("CNPJ que pede para sair perde os sinais", async () => {
    await base().excluirCnpj(MUDOU_CIDADE);
    expect(await base().sinaisDe([MUDOU_CIDADE], [])).toEqual([]);
  });

  it("sinais com mais de 12 meses são apagados", async () => {
    await base().limparSinaisAntigos("2027-11");
    expect(await amb.db.select().from(baseCnpjSinais)).toHaveLength(3);
    await base().limparSinaisAntigos("2027-12");
    expect(await amb.db.select().from(baseCnpjSinais)).toEqual([]);
  });
});

describe("Radar: sinais ligados aos leads", () => {
  function sinal(cnpj: string, tipo: SinalDaBase["tipo"]): SinalDaBase {
    return {
      id: `${cnpj}-${tipo}`,
      cnpj,
      cnpjBasico: cnpj.slice(0, 8),
      uf: "SP",
      tipo,
      antes: null,
      depois: null,
      mesReferencia: "2026-11",
      detectadoEm: new Date("2026-11-05T00:00:00Z"),
    };
  }
  const lead = (id: string, cnpj: string): LeadComCnpj => ({ id, nome: `Lead ${id}`, empresa: null, etapa: "novo", cnpj });

  it("liga pelo CNPJ e, na nova unidade, pela raiz", () => {
    const resultado = cruzarSinaisComLeads(
      [sinal(NOVA_UNIDADE, "nova_unidade"), sinal(MUDOU_CIDADE, "mudou_cidade"), sinal(FECHOU, "deixou_ativa")],
      [lead("a", IGUAL), lead("b", MUDOU_CIDADE)],
    );
    expect(resultado.map((item) => [item.cnpj, item.lead.id])).toEqual([
      [NOVA_UNIDADE, "a"],
      [MUDOU_CIDADE, "b"],
    ]);
  });

  it("nova unidade que já é lead não aparece", () => {
    const resultado = cruzarSinaisComLeads([sinal(NOVA_UNIDADE, "nova_unidade")], [lead("a", IGUAL), lead("c", NOVA_UNIDADE)]);
    expect(resultado).toEqual([]);
  });

  it("com dois leads da mesma raiz, vale o primeiro da lista", () => {
    const outraUnidade = "30000001000373";
    const resultado = cruzarSinaisComLeads([sinal(NOVA_UNIDADE, "nova_unidade")], [lead("x", outraUnidade), lead("a", IGUAL)]);
    expect(resultado.map((item) => item.lead.id)).toEqual(["x"]);
  });
});

describe("Radar: leads com CNPJ de cada empresa", () => {
  let amb: AmbienteDeTeste;

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("cada empresa vê só os próprios leads com CNPJ", async () => {
    // CNPJs de exemplo com dígitos válidos (o repositório de leads confere).
    const DA_A = "11222333000181";
    const DA_B = "11444777000161";
    const ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    const bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    const empresaA = await criarEmpresa(amb, ana, "Agência A", "agencia-a");
    const empresaB = await criarEmpresa(amb, bruno, "Agência B", "agencia-b");
    await repositorioLeads(amb.db, empresaA).criar({ nome: "Padaria A", cnpj: DA_A }, ana.id);
    await repositorioLeads(amb.db, empresaA).criar({ nome: "Sem CNPJ" }, ana.id);
    await repositorioLeads(amb.db, empresaB).criar({ nome: "Padaria B", cnpj: DA_B }, bruno.id);

    expect((await repositorioLeads(amb.db, empresaA).comCnpj()).map((item) => item.cnpj)).toEqual([DA_A]);
    expect((await repositorioLeads(amb.db, empresaB).comCnpj()).map((item) => item.cnpj)).toEqual([DA_B]);
  });
});
