import { describe, expect, it } from "vitest";
import {
  converterData,
  converterEmpresa,
  converterEstabelecimento,
  separarLinha,
} from "@/integrations/receita-cnpj/leitura";

// Linha no formato dos arquivos da Receita, com dados fictícios.
function linhaEstabelecimento(alterar: Partial<Record<number, string>> = {}): string[] {
  const base = [
    "11222333", "0001", "81", "1", "PADARIA MODELO", "02", "20200115", "00", "", "",
    "20051103", "1091102", "4721102,5611203", "RUA", "DAS FLORES", "123", "SALA 2",
    "CENTRO", "01001000", "SP", "7107", "11", "33334444", "11", "999998888", "", "",
    "CONTATO@EXEMPLO.COM.BR", "", "",
  ];
  for (const [indice, valor] of Object.entries(alterar)) base[Number(indice)] = valor as string;
  return base;
}

describe("leitura dos arquivos da Receita", () => {
  it("converte uma linha de estabelecimento", () => {
    expect(converterEstabelecimento(linhaEstabelecimento())).toEqual({
      cnpj: "11222333000181",
      cnpjBasico: "11222333",
      matriz: true,
      nomeFantasia: "PADARIA MODELO",
      situacao: "02",
      dataInicioAtividade: "2005-11-03",
      cnaePrincipal: "1091102",
      cnaesSecundarios: ["4721102", "5611203"],
      tipoLogradouro: "RUA",
      logradouro: "DAS FLORES",
      numero: "123",
      complemento: "SALA 2",
      bairro: "CENTRO",
      cep: "01001000",
      uf: "SP",
      municipioCodigo: "7107",
      telefone1: "1133334444",
      telefone2: "11999998888",
      email: "contato@exemplo.com.br",
    });
  });

  it("aceita CNPJ alfanumérico e filial", () => {
    const lido = converterEstabelecimento(linhaEstabelecimento({ 0: "12abc345", 1: "01DE", 2: "35", 3: "2" }));
    expect(lido?.cnpj).toBe("12ABC34501DE35");
    expect(lido?.matriz).toBe(false);
  });

  it("deixa vazios como nulos e descarta e-mail e telefone sem formato", () => {
    const lido = converterEstabelecimento(
      linhaEstabelecimento({ 4: "  ", 21: "", 22: "3333", 23: "", 24: "", 27: "sem-arroba", 12: "" }),
    );
    expect(lido).toMatchObject({
      nomeFantasia: null,
      telefone1: null,
      telefone2: null,
      email: null,
      cnaesSecundarios: [],
    });
  });

  it("recusa linha com número errado de colunas ou sem UF", () => {
    expect(converterEstabelecimento(linhaEstabelecimento().slice(0, 29))).toBeNull();
    expect(converterEstabelecimento(linhaEstabelecimento({ 19: "" }))).toBeNull();
  });

  it("converte datas e recusa datas vazias ou impossíveis", () => {
    expect(converterData("20051103")).toBe("2005-11-03");
    expect(converterData("0")).toBeNull();
    expect(converterData("00000000")).toBeNull();
    expect(converterData("20051332")).toBeNull();
    expect(converterData("")).toBeNull();
  });

  it("converte uma linha de empresa", () => {
    expect(
      converterEmpresa(["11222333", "PADARIA MODELO LTDA", "2062", "49", "10000,00", "01", ""]),
    ).toEqual({
      cnpjBasico: "11222333",
      razaoSocial: "PADARIA MODELO LTDA",
      naturezaJuridica: "2062",
      porte: "01",
    });
    expect(converterEmpresa(["11222333", "", "2062", "49", "0", "01", ""])).toBeNull();
  });

  it("separa linhas no formato da Receita, inclusive com aspa e ponto e vírgula dentro do campo", () => {
    expect(separarLinha('"11222333";"BAR DO "ZE"";"";"SP"')).toEqual(["11222333", 'BAR DO "ZE"', "", "SP"]);
    expect(separarLinha('"1";"LOJA A; FILIAL";"2"')).toEqual(["1", "LOJA A; FILIAL", "2"]);
    expect(separarLinha("7107;SAO PAULO")).toEqual(["7107", "SAO PAULO"]);
  });

  it("tira o CPF do fim da razão social do MEI", () => {
    const mei = (nome: string) => converterEmpresa(["11222333", nome, "2135", "49", "0", "01", ""]);
    expect(mei("JOAO DA SILVA 12345678900")?.razaoSocial).toBe("JOAO DA SILVA");
    expect(mei("JOAO DA SILVA 123.456.789-00")?.razaoSocial).toBe("JOAO DA SILVA");
    expect(mei("12345678900")).toBeNull();
    // Números que não são CPF continuam.
    expect(mei("PADARIA 2000 LTDA")?.razaoSocial).toBe("PADARIA 2000 LTDA");
  });
});
