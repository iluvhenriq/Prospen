import { beforeEach, describe, expect, it } from "vitest";
import { limparTodosOsLimites } from "@/lib/limite-tentativas";
import { consumirLimiteDeBusca, LIMITE_BUSCA } from "@/modules/base-cnpj/limite-busca";

// Limite diário de páginas da busca por empresa (contra extração da base).
const T0 = 1_000_000;

describe("limite de páginas da busca", () => {
  beforeEach(() => limparTodosOsLimites());

  it("aceita até o máximo do dia, barra a seguinte e libera depois de 24 horas", () => {
    for (let i = 0; i < LIMITE_BUSCA.maximo; i++) {
      expect(consumirLimiteDeBusca("empresa-a", T0 + i).bloqueado).toBe(false);
    }
    expect(consumirLimiteDeBusca("empresa-a", T0 + 10_000).bloqueado).toBe(true);
    expect(consumirLimiteDeBusca("empresa-a", T0 + LIMITE_BUSCA.janelaMs).bloqueado).toBe(false);
  });

  it("cada empresa tem o seu limite", () => {
    for (let i = 0; i < LIMITE_BUSCA.maximo; i++) consumirLimiteDeBusca("empresa-a", T0);
    expect(consumirLimiteDeBusca("empresa-a", T0).bloqueado).toBe(true);
    expect(consumirLimiteDeBusca("empresa-b", T0).bloqueado).toBe(false);
  });

  it("cobre o uso normal com folga: pelo menos 10 mil empresas por dia", () => {
    expect(LIMITE_BUSCA.maximo * 50).toBeGreaterThanOrEqual(10_000);
  });
});
