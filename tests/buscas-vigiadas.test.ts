import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseCnpjCnaes, baseCnpjEmpresas, baseCnpjEstabelecimentos } from "@/db/schema";
import { diasAntes } from "@/lib/formato";
import { enderecoDaBusca, lerParametrosBusca } from "@/modules/base-cnpj/parametros";
import { repositorioBaseCnpj } from "@/modules/base-cnpj/repositorio";
import { MAXIMO_DE_BUSCAS_VIGIADAS, repositorioBuscasVigiadas } from "@/modules/base-cnpj/repositorio-buscas-vigiadas";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

// Recém-abertas e buscas vigiadas (etapa 9e). CNPJs fictícios.
const NOVA = "20000001000117"; // padaria em SP, aberta há pouco
const ANTIGA = "20000002000171"; // padaria em SP, aberta há anos
const NOVA_MEI = "20000003000116"; // padaria em SP, recente, MEI
const NOVA_EXCLUIDA = "20000004000150"; // padaria em SP, recente, pediu para sair
const NOVA_OFICINA = "20000005000103"; // oficina em SP, recente

const DESDE = "2026-07-29";

function estabelecimento(cnpj: string, cnae: string, abertura: string) {
  return {
    cnpj,
    cnpjBasico: cnpj.slice(0, 8),
    matriz: true,
    nomeFantasia: `EMPRESA ${cnpj.slice(0, 8)}`,
    cnaePrincipal: cnae,
    uf: "SP",
    municipioCodigo: "7107",
    municipioNome: "SAO PAULO",
    dataInicioAtividade: abertura,
    mesReferencia: "2026-10",
  };
}

describe("recém-abertas e buscas vigiadas", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;
  const base = () => repositorioBaseCnpj(amb.db);
  const vigiadasA = () => repositorioBuscasVigiadas(amb.db, empresaA);
  const vigiadasB = () => repositorioBuscasVigiadas(amb.db, empresaB);

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Agência A", "agencia-a");
    empresaB = await criarEmpresa(amb, bruno, "Agência B", "agencia-b");

    await amb.db.insert(baseCnpjEstabelecimentos).values([
      estabelecimento(NOVA, "1091102", "2026-09-15"),
      estabelecimento(ANTIGA, "1091102", "2015-01-01"),
      estabelecimento(NOVA_MEI, "1091102", "2026-10-01"),
      estabelecimento(NOVA_EXCLUIDA, "1091102", "2026-09-20"),
      estabelecimento(NOVA_OFICINA, "4520001", "2026-09-10"),
    ]);
    await amb.db.insert(baseCnpjEmpresas).values([
      { cnpjBasico: NOVA.slice(0, 8), razaoSocial: "NOVA LTDA", naturezaJuridica: "2062", mesReferencia: "2026-10" },
      { cnpjBasico: ANTIGA.slice(0, 8), razaoSocial: "ANTIGA LTDA", naturezaJuridica: "2062", mesReferencia: "2026-10" },
      { cnpjBasico: NOVA_MEI.slice(0, 8), razaoSocial: "JOSE", naturezaJuridica: "2135", mesReferencia: "2026-10" },
      { cnpjBasico: NOVA_EXCLUIDA.slice(0, 8), razaoSocial: "SAIU LTDA", naturezaJuridica: "2062", mesReferencia: "2026-10" },
      { cnpjBasico: NOVA_OFICINA.slice(0, 8), razaoSocial: "OFICINA LTDA", naturezaJuridica: "2062", mesReferencia: "2026-10" },
    ]);
    await amb.db.insert(baseCnpjCnaes).values([
      { codigo: "1091102", descricao: "Padaria" },
      { codigo: "4520001", descricao: "Oficina" },
    ]);
    await base().excluirCnpj(NOVA_EXCLUIDA);
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  describe("recém-abertas na base", () => {
    it("a busca com 'abertas desde' traz só as recentes, sem MEI e sem excluídas", async () => {
      const linhas = await base().buscar(
        { uf: "SP", atividades: ["1091102"], semMei: true, abertasDesde: DESDE },
        null,
        50,
      );
      expect(linhas.map((linha) => linha.cnpj)).toEqual([NOVA]);
    });

    it("conta as recentes de uma busca vigiada, com e sem MEI", async () => {
      const semMei = await base().cnpjsAbertosDesde({ uf: "SP", atividades: ["1091102"], semMei: true }, DESDE, 10);
      expect(semMei).toEqual([NOVA]);
      const comMei = await base().cnpjsAbertosDesde({ uf: "SP", atividades: ["1091102"], semMei: false }, DESDE, 10);
      expect(comMei.sort()).toEqual([NOVA, NOVA_MEI].sort());
      const cidade = await base().cnpjsAbertosDesde({ uf: "SP", municipio: "7107", semMei: true }, DESDE, 10);
      expect(cidade.sort()).toEqual([NOVA, NOVA_OFICINA].sort());
      expect(await base().cnpjsAbertosDesde({ uf: "SP", atividades: [], semMei: true }, DESDE, 10)).toEqual([]);
    });

    it("o endereço guarda o filtro de recentes e volta igual", () => {
      const parametros = lerParametrosBusca({ uf: "SP", atividade: "padaria", recentes: "1" });
      expect(parametros.recentes).toBe(true);
      expect(enderecoDaBusca(parametros)).toBe("/painel/busca?uf=SP&atividade=padaria&recentes=1");
      expect(lerParametrosBusca({ uf: "SP", recentes: "sim" }).recentes).toBe(false);
    });

    it("90 dias antes, no calendário", () => {
      expect(diasAntes("2026-10-27", 90)).toBe(DESDE);
    });
  });

  describe("buscas vigiadas", () => {
    const filtros = { uf: "SP", municipioCodigo: "7107", municipioNome: "SAO PAULO", atividade: "padaria", incluirMei: false };

    it("vigia, encontra e não repete a mesma busca", async () => {
      const primeira = await vigiadasA().vigiar(filtros, ana.id);
      expect(primeira.ok).toBe(true);
      expect(await vigiadasA().vigiar(filtros, ana.id)).toEqual({ ok: false, motivo: "repetida" });
      expect((await vigiadasA().encontrar(filtros))?.atividade).toBe("padaria");
      // Outro filtro (com MEI) é outra busca.
      expect((await vigiadasA().vigiar({ ...filtros, incluirMei: true }, ana.id)).ok).toBe(true);
    });

    it("cada empresa vê, encontra e apaga só as próprias", async () => {
      expect(await vigiadasB().listar()).toEqual([]);
      expect(await vigiadasB().encontrar(filtros)).toBeNull();
      const [daA] = await vigiadasA().listar();
      expect(await vigiadasB().excluir(daA.id)).toBe(false);
      expect(await vigiadasA().listar()).toHaveLength(2);
      // A mesma busca pode ser vigiada por outra empresa.
      expect((await vigiadasB().vigiar(filtros, bruno.id)).ok).toBe(true);
    });

    it("tem limite por empresa", async () => {
      const atuais = (await vigiadasA().listar()).length;
      for (let indice = atuais; indice < MAXIMO_DE_BUSCAS_VIGIADAS; indice += 1) {
        expect((await vigiadasA().vigiar({ ...filtros, atividade: `atividade ${indice}` }, ana.id)).ok).toBe(true);
      }
      expect(await vigiadasA().vigiar({ ...filtros, atividade: "uma a mais" }, ana.id)).toEqual({ ok: false, motivo: "limite" });
    });

    it("o banco recusa busca sem cidade nem atividade, e estado inválido", async () => {
      await expect(
        amb.pg.query(`insert into buscas_vigiadas (organizacao_id, uf) values ($1, 'SP')`, [empresaB]),
      ).rejects.toThrow();
      await expect(
        amb.pg.query(`insert into buscas_vigiadas (organizacao_id, uf, atividade) values ($1, 'sp', 'padaria')`, [empresaB]),
      ).rejects.toThrow();
    });

    it("exige o identificador da empresa", () => {
      expect(() => repositorioBuscasVigiadas(amb.db, "")).toThrow();
    });
  });
});
