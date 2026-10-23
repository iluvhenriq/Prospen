import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseCnpjCnaes, baseCnpjEmpresas, baseCnpjEstabelecimentos } from "@/db/schema";
import { enderecoDaBusca, lerParametrosBusca } from "@/modules/base-cnpj/parametros";
import { repositorioBaseCnpj } from "@/modules/base-cnpj/repositorio";
import { repositorioLeads } from "@/modules/leads/repositorio";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

// Busca na base pública (etapa 5d). CNPJs fictícios, válidos no cálculo.
const PADARIA = "10000001000190"; // São Paulo, padaria, LTDA
const MEI_PADARIA = "10000002000134"; // São Paulo, padaria, MEI
const OFICINA = "10000003000189"; // Campinas, oficina
const EXCLUIDA = "10000004000123"; // São Paulo, padaria, pediu para sair
const RIO = "10000005000178"; // outro estado

function estabelecimento(cnpj: string, uf: string, municipio: string, nome: string, cnae: string) {
  return {
    cnpj,
    cnpjBasico: cnpj.slice(0, 8),
    matriz: true,
    nomeFantasia: nome,
    cnaePrincipal: cnae,
    uf,
    municipioCodigo: municipio,
    municipioNome: municipio === "7107" ? "SAO PAULO" : municipio === "6291" ? "CAMPINAS" : "RIO DE JANEIRO",
    telefone1: "1133334444",
    email: "contato@exemplo.com.br",
    mesReferencia: "2026-10",
  };
}

describe("busca na base pública de CNPJ", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;
  const base = () => repositorioBaseCnpj(amb.db);

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Agência A", "agencia-a");
    empresaB = await criarEmpresa(amb, bruno, "Agência B", "agencia-b");

    await amb.db.insert(baseCnpjEstabelecimentos).values([
      estabelecimento(PADARIA, "SP", "7107", "PADARIA MODELO", "1091102"),
      estabelecimento(MEI_PADARIA, "SP", "7107", "PAES DO ZE", "1091102"),
      estabelecimento(OFICINA, "SP", "6291", "OFICINA BOA", "4520001"),
      estabelecimento(EXCLUIDA, "SP", "7107", "PADARIA SAIU", "1091102"),
      estabelecimento(RIO, "RJ", "6001", "PADARIA RIO", "1091102"),
    ]);
    await amb.db.insert(baseCnpjEmpresas).values([
      { cnpjBasico: PADARIA.slice(0, 8), razaoSocial: "PADARIA MODELO LTDA", naturezaJuridica: "2062", mesReferencia: "2026-10" },
      { cnpjBasico: MEI_PADARIA.slice(0, 8), razaoSocial: "JOSE DA SILVA", naturezaJuridica: "2135", mesReferencia: "2026-10" },
      // Pequeno porte (+15): passa à frente das outras na ordem da busca.
      { cnpjBasico: OFICINA.slice(0, 8), razaoSocial: "OFICINA BOA LTDA", naturezaJuridica: "2062", porte: "03", mesReferencia: "2026-10" },
      { cnpjBasico: EXCLUIDA.slice(0, 8), razaoSocial: "PADARIA SAIU LTDA", naturezaJuridica: "2062", mesReferencia: "2026-10" },
    ]);
    await base().gravarCnaes([
      { codigo: "1091102", descricao: "Fabricação de produtos de padaria e confeitaria com predominância de produção própria" },
      { codigo: "4520001", descricao: "Serviços de manutenção e reparação mecânica de veículos automotores" },
    ]);
    await base().excluirCnpj(EXCLUIDA);
    // Mesmo caminho do fim da importação: regrava o estado já com a pontuação.
    await base().prepararCarga();
    await base().copiarEstadoParaCarga("SP");
    await base().concluirCarga("SP");
    await base().registrarCarga("SP", "2026-10");
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  const cnpjs = (linhas: { cnpj: string }[]) => linhas.map((linha) => linha.cnpj);

  it("registra a carga e as cidades só do estado carregado", async () => {
    expect((await base().estadosCarregados()).map((e) => [e.uf, e.estabelecimentos])).toEqual([["SP", 4]]);
    expect(await base().municipiosDoEstado("SP")).toEqual([
      { codigo: "6291", nome: "CAMPINAS" },
      { codigo: "7107", nome: "SAO PAULO" },
    ]);
  });

  it("ordena pela pontuação: telefone 15 + e-mail próprio 25 + matriz 5, porte e MEI mudam", async () => {
    const linhas = await base().buscar({ uf: "SP", semMei: false }, null, 50);
    expect(linhas.map((linha) => [linha.cnpj, linha.pontuacao])).toEqual([
      [OFICINA, 60],
      [PADARIA, 45],
      [MEI_PADARIA, 30],
    ]);
  });

  it("filtra por estado, deixa MEI de fora por padrão e nunca mostra quem pediu exclusão", async () => {
    expect(cnpjs(await base().buscar({ uf: "SP", semMei: true }, null, 50))).toEqual([OFICINA, PADARIA]);
    const comMei = await base().buscar({ uf: "SP", semMei: false }, null, 50);
    expect(cnpjs(comMei)).toEqual([OFICINA, PADARIA, MEI_PADARIA]);
    expect(comMei.find((linha) => linha.cnpj === MEI_PADARIA)?.mei).toBe(true);
  });

  it("filtra por cidade e por atividade digitada sem acento", async () => {
    expect(cnpjs(await base().buscar({ uf: "SP", municipio: "6291", semMei: true }, null, 50))).toEqual([OFICINA]);
    const atividades = await base().atividadesPorPalavras("PADARIA confeitaria");
    expect(atividades.map((a) => a.codigo)).toEqual(["1091102"]);
    expect(await base().atividadesPorPalavras("mecanica")).toHaveLength(1);
    expect(await base().atividadesPorPalavras("%")).toEqual([]);
    expect(
      cnpjs(await base().buscar({ uf: "SP", atividades: ["1091102"], semMei: false }, null, 50)),
    ).toEqual([PADARIA, MEI_PADARIA]);
    // Atividade digitada sem nenhum código encontrado: nenhum resultado, não "tudo".
    expect(await base().buscar({ uf: "SP", atividades: [], semMei: false }, null, 50)).toEqual([]);
  });

  it("busca por CNPJ exato ignora os outros filtros, inclusive o de MEI, mas não a exclusão", async () => {
    expect(cnpjs(await base().buscar({ uf: "", cnpj: MEI_PADARIA, semMei: true, municipio: "6291" }, null, 50))).toEqual([
      MEI_PADARIA,
    ]);
    expect(await base().buscar({ uf: "", cnpj: EXCLUIDA, semMei: false }, null, 50)).toEqual([]);
  });

  it("pagina pela pontuação e CNPJ do último mostrado", async () => {
    const primeira = await base().buscar({ uf: "SP", semMei: false }, null, 2);
    expect(cnpjs(primeira)).toEqual([OFICINA, PADARIA]);
    expect(cnpjs(await base().buscar({ uf: "SP", semMei: false }, { pontos: 45, cnpj: PADARIA }, 2))).toEqual([
      MEI_PADARIA,
    ]);
    // Mesma pontuação: o desempate pelo CNPJ não repete nem pula ninguém.
    expect(cnpjs(await base().buscar({ uf: "SP", semMei: false }, { pontos: 45, cnpj: "00000000000000" }, 5))).toEqual([
      PADARIA,
      MEI_PADARIA,
    ]);
  });

  it("vira lead só na empresa que adicionou, sem duplicar e sem os excluídos", async () => {
    const dados = await base().paraVirarLead([PADARIA, EXCLUIDA]);
    expect(cnpjs(dados)).toEqual([PADARIA]);

    const itens = dados.map(({ nomeFantasia, razaoSocial, ...resto }) => ({
      ...resto,
      nome: nomeFantasia ?? "",
      empresa: razaoSocial,
    }));
    expect(await repositorioLeads(amb.db, empresaA).criarDaBaseCnpj(itens, ana.id)).toBe(1);
    expect(await repositorioLeads(amb.db, empresaA).criarDaBaseCnpj(itens, ana.id)).toBe(0);

    const [lead] = await repositorioLeads(amb.db, empresaA).listar({ origem: "busca_cnpj" });
    expect(lead).toMatchObject({
      nome: "PADARIA MODELO",
      empresa: "PADARIA MODELO LTDA",
      cnpj: PADARIA,
      pais: "BR",
      // Cópia dos dados da Receita, usada na pontuação do lead.
      naturezaJuridica: "2062",
      matriz: true,
      cnaePrincipal: "1091102",
    });

    // Isolamento: a outra empresa não vê o lead e pode adicionar o mesmo CNPJ.
    expect([...(await repositorioLeads(amb.db, empresaA).cnpjsQueJaSaoLeads([PADARIA, OFICINA]))]).toEqual([PADARIA]);
    expect((await repositorioLeads(amb.db, empresaB).cnpjsQueJaSaoLeads([PADARIA])).size).toBe(0);
    expect(await repositorioLeads(amb.db, empresaB).criarDaBaseCnpj(itens, bruno.id)).toBe(1);
  });

  it("recusa CNPJ inválido ao criar lead", async () => {
    await expect(
      repositorioLeads(amb.db, empresaA).criarDaBaseCnpj(
        [
          {
            nome: "X",
            empresa: null,
            email: null,
            telefone: null,
            cnpj: "10000001000199",
            porte: null,
            naturezaJuridica: null,
            dataAbertura: null,
            matriz: null,
            cnaePrincipal: null,
          },
        ],
        ana.id,
      ),
    ).rejects.toThrow("CNPJ inválido");
  });

  it("o CNAE fica de fora da busca por palavra quando não casa", async () => {
    expect(await amb.db.$count(baseCnpjCnaes)).toBe(2);
    expect(await base().atividadesPorPalavras("astronauta")).toEqual([]);
  });
});

describe("filtros da busca no endereço", () => {
  it("lê valores válidos e descarta o resto", () => {
    expect(
      lerParametrosBusca({ uf: "sp", cidade: "7107", atividade: "  padaria ", mei: "1", depois: `45-${PADARIA}` }),
    ).toEqual({
      uf: "SP",
      municipio: "7107",
      atividade: "padaria",
      incluirMei: true,
      depoisDe: { pontos: 45, cnpj: PADARIA },
      cnpjDigitado: "",
      cnpj: undefined,
    });
    expect(lerParametrosBusca({ uf: "São Paulo", cidade: "abc'", depois: "x" })).toEqual({
      uf: undefined,
      municipio: undefined,
      atividade: "",
      incluirMei: false,
      depoisDe: undefined,
      cnpjDigitado: "",
      cnpj: undefined,
    });
  });

  it("aceita CNPJ com pontuação e guarda o digitado quando é inválido", () => {
    expect(lerParametrosBusca({ cnpj: " 10.000.001/0001-90 " })).toMatchObject({
      cnpjDigitado: "10.000.001/0001-90",
      cnpj: PADARIA,
    });
    expect(lerParametrosBusca({ cnpj: "10.000.001/0001-99" })).toMatchObject({
      cnpjDigitado: "10.000.001/0001-99",
      cnpj: undefined,
    });
  });

  it("monta o endereço mantendo os filtros", () => {
    const parametros = lerParametrosBusca({ uf: "SP", atividade: "padaria" });
    expect(enderecoDaBusca(parametros)).toBe("/painel/busca?uf=SP&atividade=padaria");
    expect(enderecoDaBusca(parametros, { pontos: 45, cnpj: PADARIA })).toBe(
      `/painel/busca?uf=SP&atividade=padaria&depois=45-${PADARIA}`,
    );
    expect(lerParametrosBusca({ depois: `101-${PADARIA}` }).depoisDe).toBeUndefined();
  });
});
