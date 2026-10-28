import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INTERESSES_PRE_CADASTRO, SEGMENTOS_PRE_CADASTRO } from "@/db/schema";
import { ptBR } from "@/lib/i18n/pt-BR";
import { lerRespostas, registrarPreCadastro } from "@/modules/pre-cadastro/registro";
import { repositorioPreCadastros } from "@/modules/pre-cadastro/repositorio";
import { criarAmbienteDeTeste, type AmbienteDeTeste } from "./ajuda/banco-teste";

// Perguntas opcionais do pré-cadastro (27/10/2026).
describe("respostas opcionais do pré-cadastro", () => {
  let amb: AmbienteDeTeste;

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("os textos das opções seguem as listas do banco, na mesma ordem", () => {
    // O formulário (no navegador) monta as opções a partir dos textos.
    expect(Object.keys(ptBR.preVenda.formulario.segmentos)).toEqual([...SEGMENTOS_PRE_CADASTRO]);
    expect(Object.keys(ptBR.preVenda.formulario.interesses)).toEqual([...INTERESSES_PRE_CADASTRO]);
  });

  it("descarta valores fora da lista e repetidos, sem recusar o cadastro", () => {
    expect(lerRespostas({ segmento: "agencia", interesses: ["sinais", "invasao", "sinais", "perfil"] })).toEqual({
      segmento: "agencia",
      interesses: ["sinais", "perfil"],
    });
    expect(lerRespostas({ segmento: "qualquer", interesses: [] })).toEqual({ segmento: null, interesses: [] });
  });

  it("grava as respostas junto com o pré-cadastro", async () => {
    const resultado = await registrarPreCadastro(
      amb.db,
      { nome: "Pessoa Interessada", email: "Interessada@Exemplo.com.br", empresa: "" },
      null,
      Date.now(),
      { segmento: "contabilidade", interesses: ["mapa", "dossie"] },
    );
    expect(resultado).toEqual({ ok: true });
    const [linha] = await repositorioPreCadastros(amb.db).listar();
    expect(linha).toMatchObject({ email: "interessada@exemplo.com.br", segmento: "contabilidade", interesses: ["mapa", "dossie"] });
  });

  it("sem respostas, grava vazio", async () => {
    await registrarPreCadastro(amb.db, { nome: "Outra Pessoa", email: "outra@exemplo.com.br", empresa: "" }, null);
    const linha = (await repositorioPreCadastros(amb.db).listar()).find((item) => item.email === "outra@exemplo.com.br");
    expect(linha).toMatchObject({ segmento: null, interesses: [] });
  });

  it("o banco recusa resposta fora da lista", async () => {
    await expect(
      amb.pg.query(`insert into pre_cadastros (nome, email, interesses) values ('X', 'x@exemplo.com.br', array['invasao'])`),
    ).rejects.toThrow();
  });
});
