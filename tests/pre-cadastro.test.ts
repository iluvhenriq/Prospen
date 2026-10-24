import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { limparTodosOsLimites } from "@/lib/limite-tentativas";
import { emPreVenda, fechadoNaPreVenda } from "@/lib/pre-venda";
import { LIMITES_PRE_CADASTRO, registrarPreCadastro } from "@/modules/pre-cadastro/registro";
import { repositorioPreCadastros } from "@/modules/pre-cadastro/repositorio";
import { criarAmbienteDeTeste, type AmbienteDeTeste } from "./ajuda/banco-teste";

const T0 = 1_000_000;

describe("pré-cadastro da pré-venda", () => {
  let amb: AmbienteDeTeste;
  const repositorio = () => repositorioPreCadastros(amb.db);

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
  });
  afterAll(async () => amb?.encerrar());
  beforeEach(() => limparTodosOsLimites());

  it("grava nome, e-mail em minúsculas e empresa opcional", async () => {
    const r = await registrarPreCadastro(amb.db, { nome: " Ana Souza ", email: "Ana@Empresa.com.br", empresa: "" }, "1.1.1.1", T0);
    expect(r).toEqual({ ok: true });
    const [linha] = await repositorio().listar();
    expect(linha).toMatchObject({ nome: "Ana Souza", email: "ana@empresa.com.br", empresa: null });
  });

  it("o mesmo e-mail de novo responde igual e não duplica", async () => {
    const r = await registrarPreCadastro(amb.db, { nome: "Ana", email: "ANA@empresa.com.br", empresa: "X" }, "1.1.1.2", T0);
    expect(r).toEqual({ ok: true });
    expect(await repositorio().contar()).toBe(1);
  });

  it("recusa nome vazio e e-mail inválido, sem gravar", async () => {
    const r = await registrarPreCadastro(amb.db, { nome: "  ", email: "nao-e-email", empresa: "" }, null, T0);
    expect(r).toMatchObject({ ok: false, erros: { nome: expect.any(String), email: expect.any(String) } });
    expect(await repositorio().contar()).toBe(1);
  });

  it("limita envios por endereço", async () => {
    for (let i = 0; i < LIMITES_PRE_CADASTRO.porEndereco.maximo; i++) {
      await registrarPreCadastro(amb.db, { nome: "P", email: `p${i}@exemplo.com.br`, empresa: "" }, "9.9.9.9", T0);
    }
    const barrado = await registrarPreCadastro(amb.db, { nome: "P", email: "extra@exemplo.com.br", empresa: "" }, "9.9.9.9", T0);
    expect(barrado).toMatchObject({ ok: false, mensagem: expect.any(String) });
    expect((await repositorio().listar()).map((l) => l.email)).not.toContain("extra@exemplo.com.br");
  });

  it("sai da lista a pedido", async () => {
    expect(await repositorio().excluir(" ANA@empresa.com.br")).toBe(true);
    expect((await repositorio().listar()).map((l) => l.email)).not.toContain("ana@empresa.com.br");
  });
});

describe("modo pré-venda", () => {
  it("só liga com MODO_PRE_VENDA=1", () => {
    expect(emPreVenda({ MODO_PRE_VENDA: "1" })).toBe(true);
    expect(emPreVenda({ MODO_PRE_VENDA: "" })).toBe(false);
    expect(emPreVenda({})).toBe(false);
  });

  it("fecha o app e deixa abertas a apresentação e as páginas legais", () => {
    for (const fechado of ["/painel", "/painel/leads/abc", "/cadastrar", "/entrar", "/criar-organizacao", "/api/auth/sign-in/email"]) {
      expect(fechadoNaPreVenda(fechado), fechado).toBe(true);
    }
    for (const aberto of ["/", "/privacidade", "/termos", "/remover-meus-dados", "/api/saude", "/painelzinho"]) {
      expect(fechadoNaPreVenda(aberto), aberto).toBe(false);
    }
  });
});
