import { beforeEach, describe, expect, it } from "vitest";
import { limparTodosOsLimites } from "@/lib/limite-tentativas";
import { consumirLimiteDeImportacao, LIMITES_IMPORTACAO } from "@/modules/leads/limite-importacao";

const T0 = 1_000_000;
const { importar, conferir } = LIMITES_IMPORTACAO;

describe("limite de frequência da importação", () => {
  beforeEach(() => limparTodosOsLimites());

  it("aceita até o máximo de importações por hora e barra a seguinte", () => {
    for (let i = 0; i < importar.maximo; i++) {
      expect(consumirLimiteDeImportacao("empresa-a", "importar", T0 + i).bloqueado).toBe(false);
    }
    const barrada = consumirLimiteDeImportacao("empresa-a", "importar", T0 + 1_000);
    expect(barrada.bloqueado).toBe(true);
    expect(barrada.segundosParaLiberar).toBeGreaterThan(0);
  });

  it("libera de novo depois da janela", () => {
    for (let i = 0; i < importar.maximo; i++) consumirLimiteDeImportacao("empresa-a", "importar", T0);
    expect(consumirLimiteDeImportacao("empresa-a", "importar", T0 + importar.janelaMs).bloqueado).toBe(false);
  });

  it("um envio barrado não conta, senão a espera nunca acabaria", () => {
    for (let i = 0; i < importar.maximo; i++) consumirLimiteDeImportacao("empresa-a", "importar", T0);
    for (let i = 0; i < 50; i++) consumirLimiteDeImportacao("empresa-a", "importar", T0 + 1_000);
    expect(consumirLimiteDeImportacao("empresa-a", "importar", T0 + importar.janelaMs).bloqueado).toBe(false);
  });

  it("cada empresa e cada intenção contam separado", () => {
    for (let i = 0; i < importar.maximo; i++) consumirLimiteDeImportacao("empresa-a", "importar", T0);
    expect(consumirLimiteDeImportacao("empresa-a", "importar", T0).bloqueado).toBe(true);
    expect(consumirLimiteDeImportacao("empresa-b", "importar", T0).bloqueado).toBe(false);
    expect(consumirLimiteDeImportacao("empresa-a", "conferir", T0).bloqueado).toBe(false);
  });

  it("conferir tem mais folga que importar", () => {
    expect(conferir.maximo).toBeGreaterThan(importar.maximo);
  });
});
