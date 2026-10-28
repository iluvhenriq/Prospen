import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Etiqueta, Lead } from "@/db/schema";
import { celulaSegura, gerarCsvDeLeads } from "@/modules/leads/exportacao";
import { enderecoDaExportacao, lerParametrosLista } from "@/modules/leads/parametros";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { papelPode } from "@/modules/organizacoes/membros";
import { cadastrarPessoa, criarAmbienteDeTeste, criarEmpresa, type AmbienteDeTeste } from "./ajuda/banco-teste";

// Exportação dos leads em CSV (28/10/2026). Dados fictícios.

function lead(extra: Partial<Lead> = {}): Lead {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    organizacaoId: "org",
    nome: "Maria Teste",
    empresa: "Padaria Teste",
    email: "maria@teste.com.br",
    telefone: "+55 11 99999-0000",
    emailNormalizado: null,
    telefoneNormalizado: null,
    cnpj: "11222333000181",
    porte: null,
    naturezaJuridica: null,
    dataAbertura: null,
    matriz: null,
    cnaePrincipal: null,
    origem: "busca_cnpj",
    pais: "BR",
    etapa: "ganho",
    etapaAtualizadaEm: new Date("2026-10-20T12:00:00Z"),
    motivoPerda: null,
    valorVendaCentavos: 123456,
    moedaVenda: "BRL",
    proximaAcaoEm: "2026-11-03",
    proximaAcao: "Ligar; levar proposta",
    criadoPorId: null,
    criadoEm: new Date("2026-10-20T12:00:00Z"),
    atualizadoEm: new Date("2026-10-20T12:00:00Z"),
    ...extra,
  } as Lead;
}

describe("exportação em CSV", () => {
  it("neutraliza o que viraria fórmula e deixa telefone e número como estão", () => {
    expect(celulaSegura("=HYPERLINK(\"http://x\")")).toBe("'=HYPERLINK(\"http://x\")");
    expect(celulaSegura("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(celulaSegura("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(celulaSegura("-2+3+cmd")).toBe("'-2+3+cmd");
    expect(celulaSegura("+55 11 99999-0000")).toBe("+55 11 99999-0000");
    expect(celulaSegura("-10")).toBe("-10");
    expect(celulaSegura("Padaria")).toBe("Padaria");
  });

  it("gera cabeçalho, marca de UTF-8, separador ponto e vírgula e aspas quando precisa", () => {
    const etiquetas = new Map<string, Etiqueta[]>([
      [lead().id, [{ nome: "quente" } as Etiqueta, { nome: "padaria" } as Etiqueta]],
    ]);
    const csv = gerarCsvDeLeads([lead()], etiquetas, "America/Sao_Paulo");
    expect(csv.startsWith("\uFEFFNome;Empresa;CNPJ;")).toBe(true);
    const [, linha] = csv.slice(1).split("\r\n");
    expect(linha).toBe(
      'Maria Teste;Padaria Teste;11.222.333/0001-81;maria@teste.com.br;+55 11 99999-0000;BR;Busca de empresas;Ganho;quente, padaria;03/11/2026;"Ligar; levar proposta";1234,56;BRL;;20/10/2026',
    );
  });

  it("nome malicioso sai neutralizado no arquivo", () => {
    const csv = gerarCsvDeLeads([lead({ nome: "=1+1", empresa: null, cnpj: null })], new Map(), "America/Sao_Paulo");
    expect(csv).toContain("\r\n'=1+1;;;");
  });

  it("o endereço da exportação leva os filtros, sem a página", () => {
    const parametros = lerParametrosLista({ q: "padaria", etapa: "novo", pagina: "3" });
    expect(enderecoDaExportacao(parametros)).toBe("/painel/leads/exportar?q=padaria&etapa=novo");
  });

  it("só administrador e dono exportam", () => {
    expect(papelPode("member", "exportarLeads")).toBe(false);
    expect(papelPode("admin", "exportarLeads")).toBe(true);
    expect(papelPode("owner", "exportarLeads")).toBe(true);
  });
});

describe("exportação: só os leads da empresa", () => {
  let amb: AmbienteDeTeste;

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("cada empresa exporta só os próprios leads, com os filtros", async () => {
    const ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    const bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    const empresaA = await criarEmpresa(amb, ana, "Agência A", "agencia-a");
    const empresaB = await criarEmpresa(amb, bruno, "Agência B", "agencia-b");
    await repositorioLeads(amb.db, empresaA).criar({ nome: "Padaria da Ana" }, ana.id);
    await repositorioLeads(amb.db, empresaA).criar({ nome: "Oficina da Ana" }, ana.id);
    await repositorioLeads(amb.db, empresaB).criar({ nome: "Padaria do Bruno" }, bruno.id);

    const daA = await repositorioLeads(amb.db, empresaA).paraExportar({}, 100);
    expect(daA.map((item) => item.nome).sort()).toEqual(["Oficina da Ana", "Padaria da Ana"]);
    const filtrado = await repositorioLeads(amb.db, empresaA).paraExportar({ busca: "padaria" }, 100);
    expect(filtrado.map((item) => item.nome)).toEqual(["Padaria da Ana"]);
    expect(await repositorioLeads(amb.db, empresaA).paraExportar({}, 1)).toHaveLength(1);
  });
});
