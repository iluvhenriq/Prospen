import { beforeEach, describe, expect, it } from "vitest";
import {
  limparTodosOsLimites,
  registrarTentativa,
  verificarLimite,
  zerarTentativas,
} from "@/lib/limite-tentativas";

const regra = { maximo: 3, janelaMs: 60_000 };
const T0 = 1_000_000;

describe("limite de tentativas", () => {
  beforeEach(() => limparTodosOsLimites());

  it("não bloqueia abaixo do máximo", () => {
    registrarTentativa("k", regra.janelaMs, T0);
    registrarTentativa("k", regra.janelaMs, T0 + 1);
    expect(verificarLimite("k", regra, T0 + 2).bloqueado).toBe(false);
  });

  it("bloqueia ao atingir o máximo e informa quanto falta", () => {
    for (let i = 0; i < 3; i++) registrarTentativa("k", regra.janelaMs, T0 + i);
    const situacao = verificarLimite("k", regra, T0 + 10_000);
    expect(situacao.bloqueado).toBe(true);
    // A primeira tentativa (T0) sai da janela em T0 + 60s. Já passaram 10s.
    expect(situacao.segundosParaLiberar).toBe(50);
  });

  it("libera depois que a janela passa", () => {
    for (let i = 0; i < 3; i++) registrarTentativa("k", regra.janelaMs, T0);
    expect(verificarLimite("k", regra, T0 + 59_000).bloqueado).toBe(true);
    expect(verificarLimite("k", regra, T0 + 60_001).bloqueado).toBe(false);
  });

  it("chaves diferentes não se afetam", () => {
    for (let i = 0; i < 3; i++) registrarTentativa("a", regra.janelaMs, T0);
    expect(verificarLimite("a", regra, T0).bloqueado).toBe(true);
    expect(verificarLimite("b", regra, T0).bloqueado).toBe(false);
  });

  it("zerar devolve todas as tentativas", () => {
    for (let i = 0; i < 3; i++) registrarTentativa("k", regra.janelaMs, T0);
    zerarTentativas("k");
    expect(verificarLimite("k", regra, T0).bloqueado).toBe(false);
  });

  it("nunca informa menos de 1 segundo de espera", () => {
    for (let i = 0; i < 3; i++) registrarTentativa("k", regra.janelaMs, T0);
    expect(verificarLimite("k", regra, T0 + 59_999).segundosParaLiberar).toBe(1);
  });

  it("não deixa a memória crescer sem limite", () => {
    for (let i = 0; i < 10_500; i++) {
      registrarTentativa(`email-${i}`, regra.janelaMs, T0);
    }
    const mapa = (globalThis as unknown as { __prospenLimites: Map<string, unknown> })
      .__prospenLimites;
    expect(mapa.size).toBeLessThanOrEqual(10_000);
  });

  it("descarta primeiro as chaves vencidas ao limpar", () => {
    registrarTentativa("velha", 1_000, T0);
    for (let i = 0; i < 10_000; i++) registrarTentativa(`k-${i}`, 60_000, T0 + 5_000);
    const mapa = (globalThis as unknown as { __prospenLimites: Map<string, unknown> })
      .__prospenLimites;
    expect(mapa.has("velha")).toBe(false);
    expect(mapa.has("k-9999")).toBe(true);
  });
});
