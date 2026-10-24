import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { baseCnpjEstabelecimentos } from "@/db/schema";
import { limparTodosOsLimites } from "@/lib/limite-tentativas";
import { LIMITES_REMOCAO, pedirRemocao } from "@/modules/base-cnpj/remocao";
import { repositorioBaseCnpj } from "@/modules/base-cnpj/repositorio";
import { criarAmbienteDeTeste, type AmbienteDeTeste } from "./ajuda/banco-teste";

// Pedido público "remover meus dados" (decisão de 23/10/2026: automático).
const PADARIA = "10000001000190";
const T0 = 1_000_000;

// CNPJs válidos no cálculo, diferentes entre si, para os testes de limite.
function cnpjNumero(n: number): string {
  const base = `${String(20000000 + n)}0001`;
  const digito = (parcial: string) => {
    const pesos = parcial.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...parcial].reduce((total, c, i) => total + Number(c) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? "0" : String(11 - resto);
  };
  const d1 = digito(base);
  return base + d1 + digito(base + d1);
}

describe("remover meus dados", () => {
  let amb: AmbienteDeTeste;
  const busca = () =>
    repositorioBaseCnpj(amb.db).buscar({ uf: "SP", semMei: false }, null, 50);

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    await amb.db.insert(baseCnpjEstabelecimentos).values({
      cnpj: PADARIA,
      cnpjBasico: PADARIA.slice(0, 8),
      matriz: true,
      nomeFantasia: "PADARIA MODELO",
      cnaePrincipal: "1091102",
      uf: "SP",
      municipioCodigo: "7107",
      municipioNome: "SAO PAULO",
      mesReferencia: "2026-10",
    });
  });
  afterAll(async () => amb?.encerrar());
  beforeEach(() => limparTodosOsLimites());

  it("tira o CNPJ da busca na hora, aceitando pontuação", async () => {
    expect((await busca()).map((r) => r.cnpj)).toContain(PADARIA);
    const resultado = await pedirRemocao(amb.db, { cnpj: "10.000.001/0001-90", confirmacao: true }, "1.1.1.1", T0);
    expect(resultado).toEqual({ ok: true, cnpj: PADARIA });
    expect((await busca()).map((r) => r.cnpj)).not.toContain(PADARIA);
  });

  it("pedir de novo o mesmo CNPJ não dá erro", async () => {
    const resultado = await pedirRemocao(amb.db, { cnpj: PADARIA, confirmacao: true }, "1.1.1.1", T0);
    expect(resultado.ok).toBe(true);
  });

  it("recusa CNPJ inválido e pedido sem a confirmação, sem gravar nada", async () => {
    const invalido = await pedirRemocao(amb.db, { cnpj: "11.111.111/1111-11", confirmacao: true }, null, T0);
    expect(invalido).toMatchObject({ ok: false, erros: { cnpj: expect.any(String) } });
    const semConfirmar = await pedirRemocao(amb.db, { cnpj: cnpjNumero(1), confirmacao: false }, null, T0);
    expect(semConfirmar).toMatchObject({ ok: false, erros: { confirmacao: expect.any(String) } });
    const lista = await amb.db.query.baseCnpjExclusoes.findMany();
    expect(lista.map((linha) => linha.cnpj)).not.toContain(cnpjNumero(1));
  });

  it("limita os pedidos por endereço", async () => {
    for (let i = 0; i < LIMITES_REMOCAO.porEndereco.maximo; i++) {
      expect((await pedirRemocao(amb.db, { cnpj: cnpjNumero(10 + i), confirmacao: true }, "2.2.2.2", T0)).ok).toBe(true);
    }
    const barrado = await pedirRemocao(amb.db, { cnpj: cnpjNumero(99), confirmacao: true }, "2.2.2.2", T0);
    expect(barrado).toMatchObject({ ok: false, mensagem: expect.any(String) });
    // O CNPJ barrado não entrou na lista.
    const lista = await amb.db.query.baseCnpjExclusoes.findMany();
    expect(lista.map((linha) => linha.cnpj)).not.toContain(cnpjNumero(99));
    // Outro endereço continua podendo pedir.
    expect((await pedirRemocao(amb.db, { cnpj: cnpjNumero(98), confirmacao: true }, "3.3.3.3", T0)).ok).toBe(true);
  });

  it("tem um teto diário para todos juntos, mesmo sem endereço conhecido", async () => {
    for (let i = 0; i < LIMITES_REMOCAO.total.maximo; i++) {
      await pedirRemocao(amb.db, { cnpj: cnpjNumero(200 + i), confirmacao: true }, null, T0);
    }
    const barrado = await pedirRemocao(amb.db, { cnpj: cnpjNumero(999), confirmacao: true }, null, T0);
    expect(barrado.ok).toBe(false);
    const diaSeguinte = await pedirRemocao(amb.db, { cnpj: cnpjNumero(999), confirmacao: true }, null, T0 + LIMITES_REMOCAO.total.janelaMs);
    expect(diaSeguinte.ok).toBe(true);
  });
});
