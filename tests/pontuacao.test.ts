import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseCnpjEmpresas, baseCnpjEstabelecimentos } from "@/db/schema";
import { repositorioBaseCnpj } from "@/modules/base-cnpj/repositorio";
import { faixaDe, pontuar, type DadosParaPontuar } from "@/modules/pontuacao/regras";
import { criarAmbienteDeTeste, type AmbienteDeTeste } from "./ajuda/banco-teste";

const HOJE = new Date("2026-10-23T12:00:00Z");

describe("regras de pontuação", () => {
  it("lead manual só pontua pelo contato", () => {
    expect(pontuar({ telefone: "(11) 3333-4444", email: "dono@padaria.com.br" }, HOJE)).toEqual({
      pontos: 40,
      faixa: "media",
      motivos: ["telefone", "emailProprio"],
    });
    expect(pontuar({ telefone: null, email: null }, HOJE)).toEqual({ pontos: 0, faixa: "baixa", motivos: [] });
    expect(pontuar({ telefone: "  ", email: "" }, HOJE).pontos).toBe(0);
  });

  it("e-mail de contabilidade vale menos que o e-mail do dono", () => {
    expect(pontuar({ telefone: null, email: "FISCAL@Contabilidade-Silva.com.br" }, HOJE).motivos).toEqual([
      "emailContador",
    ]);
    expect(pontuar({ telefone: null, email: "ze@escritoriomodelo.com" }, HOJE).pontos).toBe(5);
    expect(pontuar({ telefone: null, email: "padariadoze@gmail.com" }, HOJE).pontos).toBe(25);
  });

  it("empresa nova, porte e matriz somam; MEI desconta", () => {
    const completa: DadosParaPontuar = {
      telefone: "1133334444",
      email: "dono@gmail.com",
      dataAbertura: "2026-03-01",
      porte: "03",
      matriz: true,
      naturezaJuridica: "2062",
    };
    expect(pontuar(completa, HOJE)).toEqual({
      pontos: 80,
      faixa: "alta",
      motivos: ["telefone", "emailProprio", "empresaNova", "portePequena", "matriz"],
    });
    expect(pontuar({ ...completa, dataAbertura: "2024-01-10" }, HOJE).motivos).toContain("empresaRecente");
    expect(pontuar({ ...completa, dataAbertura: "2010-01-10" }, HOJE).pontos).toBe(60);
    expect(pontuar({ ...completa, naturezaJuridica: "2135", porte: "01" }, HOJE).pontos).toBe(80 - 15 - 15 + 5);
  });

  it("o limite de 1 ano é a mesma data do ano anterior", () => {
    expect(pontuar({ telefone: null, email: null, dataAbertura: "2025-10-24" }, HOJE).motivos).toEqual(["empresaNova"]);
    expect(pontuar({ telefone: null, email: null, dataAbertura: "2025-10-23" }, HOJE).motivos).toEqual([
      "empresaRecente",
    ]);
  });

  it("faixas", () => {
    expect([faixaDe(55), faixaDe(54), faixaDe(35), faixaDe(34)]).toEqual(["alta", "media", "media", "baixa"]);
  });
});

// A busca ordena por uma pontuação calculada em SQL na importação. Ela precisa
// dar exatamente o mesmo número que pontuar(), que é o que a tela explica.
describe("pontuação em SQL igual à do código", () => {
  let amb: AmbienteDeTeste;

  const casos: (DadosParaPontuar & { cnpj: string })[] = [
    { cnpj: "10000001000190", telefone: "1133334444", email: "dono@gmail.com", dataAbertura: "2026-03-01", porte: "03", matriz: true, naturezaJuridica: "2062" },
    { cnpj: "10000002000134", telefone: null, email: "fiscal@contabilidade.com.br", dataAbertura: "2024-01-10", porte: "01", matriz: false, naturezaJuridica: "2135" },
    { cnpj: "10000003000189", telefone: "1133334444", email: null, dataAbertura: "2025-10-23", porte: "05", matriz: true, naturezaJuridica: "2062" },
    { cnpj: "10000004000123", telefone: null, email: null, dataAbertura: null, porte: "00", matriz: false, naturezaJuridica: "2135" },
    { cnpj: "10000005000178", telefone: "1133334444", email: "contato@ESCRITORIO.com", dataAbertura: "2025-10-24", porte: null, matriz: true, naturezaJuridica: null },
  ];

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    await amb.db.insert(baseCnpjEstabelecimentos).values(
      casos.map((caso) => ({
        cnpj: caso.cnpj,
        cnpjBasico: caso.cnpj.slice(0, 8),
        matriz: Boolean(caso.matriz),
        cnaePrincipal: "1091102",
        uf: "SP",
        municipioCodigo: "7107",
        telefone1: caso.telefone,
        email: caso.email,
        dataInicioAtividade: caso.dataAbertura,
        mesReferencia: "2026-10",
      })),
    );
    await amb.db.insert(baseCnpjEmpresas).values(
      casos.map((caso) => ({
        cnpjBasico: caso.cnpj.slice(0, 8),
        razaoSocial: "EMPRESA TESTE",
        naturezaJuridica: caso.naturezaJuridica,
        porte: caso.porte,
        mesReferencia: "2026-10",
      })),
    );
    const base = repositorioBaseCnpj(amb.db);
    await base.prepararCarga();
    await base.copiarEstadoParaCarga("SP");
    await base.concluirCarga("SP", HOJE);
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("cada caso dá o mesmo número nas duas contas", async () => {
    const linhas = await amb.db
      .select({ cnpj: baseCnpjEstabelecimentos.cnpj, pontuacao: baseCnpjEstabelecimentos.pontuacao })
      .from(baseCnpjEstabelecimentos);
    const doBanco = Object.fromEntries(linhas.map((linha) => [linha.cnpj, linha.pontuacao]));
    for (const caso of casos) {
      expect({ cnpj: caso.cnpj, pontos: doBanco[caso.cnpj] }).toEqual({
        cnpj: caso.cnpj,
        pontos: pontuar(caso, HOJE).pontos,
      });
    }
  });
});
