import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { formatarValor, lerValorEmCentavos } from "@/modules/leads/valor";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

describe("leitura do valor da venda", () => {
  it("entende o jeito brasileiro e o ponto decimal", () => {
    expect(lerValorEmCentavos("1.234,56")).toBe(123456);
    expect(lerValorEmCentavos("R$ 1.500")).toBe(150000);
    expect(lerValorEmCentavos("1500,5")).toBe(150050);
    expect(lerValorEmCentavos("1234.56")).toBe(123456);
    expect(lerValorEmCentavos("12.5")).toBe(1250);
    expect(lerValorEmCentavos("1.234.567")).toBe(123456700);
    expect(lerValorEmCentavos("0")).toBe(0);
  });

  it("recusa o que não é valor", () => {
    for (const texto of ["", "abc", "-10", "1,2,3", "10,123", "99999999999999"]) {
      expect({ texto, centavos: lerValorEmCentavos(texto) }).toEqual({ texto, centavos: null });
    }
  });

  it("formata na moeda da empresa", () => {
    expect(formatarValor(123456, "BRL").replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(formatarValor(100, "XYZ1")).toBe("1.00 XYZ1");
  });
});

describe("motivo da perda e valor da venda", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;
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

  it("só grava o motivo com o lead em Perdido, e o valor com o lead em Ganho", async () => {
    const lead = await leadsA().criar({ nome: "Padaria Resultado" }, ana.id);
    expect(await leadsA().registrarMotivoPerda(lead.id, "preco")).toBe(false);
    expect(await leadsA().registrarValorVenda(lead.id, 150000, "BRL")).toBe(false);

    await leadsA().mudarEtapa(lead.id, "perdido", ana.id);
    expect(await leadsA().registrarMotivoPerda(lead.id, "preco")).toBe(true);
    expect(await leadsA().registrarValorVenda(lead.id, 150000, "BRL")).toBe(false);
    expect((await leadsA().buscar(lead.id))?.motivoPerda).toBe("preco");
  });

  it("mudar de etapa limpa o resultado que não vale mais", async () => {
    const lead = await leadsA().criar({ nome: "Oficina Resultado" }, ana.id);
    await leadsA().mudarEtapa(lead.id, "ganho", ana.id);
    expect(await leadsA().registrarValorVenda(lead.id, 990050, "BRL")).toBe(true);
    expect(await leadsA().buscar(lead.id)).toMatchObject({ valorVendaCentavos: 990050, moedaVenda: "BRL" });

    await leadsA().mudarEtapa(lead.id, "perdido", ana.id);
    expect(await leadsA().buscar(lead.id)).toMatchObject({ valorVendaCentavos: null, moedaVenda: null });
    await leadsA().registrarMotivoPerda(lead.id, "concorrente");

    await leadsA().mudarEtapa(lead.id, "em_conversa", ana.id);
    expect((await leadsA().buscar(lead.id))?.motivoPerda).toBeNull();
  });

  it("apagar o valor ou o motivo é permitido", async () => {
    const lead = await leadsA().criar({ nome: "Mercado Resultado" }, ana.id);
    await leadsA().mudarEtapa(lead.id, "ganho", ana.id);
    await leadsA().registrarValorVenda(lead.id, 100, "BRL");
    expect(await leadsA().registrarValorVenda(lead.id, null, "BRL")).toBe(true);
    expect(await leadsA().buscar(lead.id)).toMatchObject({ valorVendaCentavos: null, moedaVenda: null });
  });

  it("uma empresa não grava resultado no lead de outra", async () => {
    const deB = await leadsB().criar({ nome: "Lead da B" }, bruno.id);
    await leadsB().mudarEtapa(deB.id, "ganho", bruno.id);
    expect(await leadsA().registrarValorVenda(deB.id, 999, "BRL")).toBe(false);
    expect((await leadsB().buscar(deB.id))?.valorVendaCentavos).toBeNull();
  });

  it("o banco recusa resultado fora da etapa, mesmo gravado por fora do repositório", async () => {
    const lead = await leadsA().criar({ nome: "Teste do banco" }, ana.id);
    await expect(
      amb.db.execute(sql`update leads set motivo_perda = 'preco' where id = ${lead.id}`),
    ).rejects.toThrow();
    await expect(
      amb.db.execute(sql`update leads set valor_venda_centavos = 10, moeda_venda = 'BRL' where id = ${lead.id}`),
    ).rejects.toThrow();
  });
});
