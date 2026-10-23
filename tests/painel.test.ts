import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { montarPainel } from "@/modules/painel/indicadores";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

describe("contas do painel", () => {
  it("sem leads, tudo zero e sem taxa inventada", () => {
    const painel = montarPainel({ porEtapa: {}, porOrigem: {}, porMotivo: [], vendas: [], novos: 0 });
    expect(painel).toMatchObject({ total: 0, emAndamento: 0, ganhos: 0, perdidos: 0, taxaDeConversao: null, ganhosSemValor: 0 });
    expect(painel.funil.every((linha) => linha.total === 0)).toBe(true);
  });

  it("taxa de conversão, ticket médio e ganhos sem valor", () => {
    const painel = montarPainel({
      porEtapa: { novo: 3, proposta: 1, ganho: 3, perdido: 1 },
      porOrigem: { manual: 2, busca_cnpj: 6 },
      porMotivo: [
        { motivo: null, total: 2 },
        { motivo: "preco", total: 1 },
        { motivo: "concorrente", total: 4 },
      ],
      vendas: [{ moeda: "BRL", centavos: 300001, vendas: 2 }],
      novos: 5,
    });
    expect(painel).toMatchObject({ total: 8, emAndamento: 4, taxaDeConversao: 75, ganhosSemValor: 1 });
    expect(painel.vendas[0].ticketMedioCentavos).toBe(150001);
    expect(painel.motivos.map((linha) => linha.motivo)).toEqual(["concorrente", "preco", null]);
    expect(painel.origens).toEqual([
      { origem: "busca_cnpj", total: 6 },
      { origem: "manual", total: 2 },
    ]);
  });
});

describe("indicadores do repositório", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Agência A", "agencia-a");
    empresaB = await criarEmpresa(amb, bruno, "Agência B", "agencia-b");

    const a = repositorioLeads(amb.db, empresaA);
    const ganho = await a.criar({ nome: "Ganho com valor" }, ana.id);
    await a.mudarEtapa(ganho.id, "ganho", ana.id);
    await a.registrarValorVenda(ganho.id, 250000, "BRL");
    const ganhoSemValor = await a.criar({ nome: "Ganho sem valor" }, ana.id);
    await a.mudarEtapa(ganhoSemValor.id, "ganho", ana.id);
    const perdido = await a.criar({ nome: "Perdido" }, ana.id);
    await a.mudarEtapa(perdido.id, "perdido", ana.id);
    await a.registrarMotivoPerda(perdido.id, "preco");
    await a.criar({ nome: "Novo" }, ana.id);

    // A empresa B tem uma venda grande que não pode aparecer nos números da A.
    const b = repositorioLeads(amb.db, empresaB);
    const deB = await b.criar({ nome: "Venda da B" }, bruno.id);
    await b.mudarEtapa(deB.id, "ganho", bruno.id);
    await b.registrarValorVenda(deB.id, 99999999, "BRL");
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("conta só os leads da empresa, por etapa, motivo, origem e valor", async () => {
    const dados = await repositorioLeads(amb.db, empresaA).indicadores(new Date(Date.now() - 86_400_000));
    expect(dados).toEqual({
      porEtapa: { ganho: 2, perdido: 1, novo: 1 },
      porOrigem: { manual: 4 },
      porMotivo: [{ motivo: "preco", total: 1 }],
      vendas: [{ moeda: "BRL", centavos: 250000, vendas: 1 }],
      novos: 4,
    });
    expect(montarPainel(dados)).toMatchObject({ taxaDeConversao: 67, ganhosSemValor: 1 });
  });

  it("leads antigos não contam como novos", async () => {
    const dados = await repositorioLeads(amb.db, empresaA).indicadores(new Date(Date.now() + 60_000));
    expect(dados.novos).toBe(0);
  });
});
