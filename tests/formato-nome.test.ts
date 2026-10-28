import { describe, expect, it } from "vitest";
import { nomeParaExibir } from "@/lib/formato";

describe("nomeParaExibir", () => {
  it("tira a caixa alta dos nomes da Receita", () => {
    expect(nomeParaExibir("MARIA ANGELA DIPPLES AUGUSTO LEME LTDA")).toBe("Maria Angela Dipples Augusto Leme Ltda");
    expect(nomeParaExibir("PADARIA DO JOAO E FILHOS LTDA")).toBe("Padaria do Joao e Filhos Ltda");
  });

  it("mantém siglas, números e acentos", () => {
    expect(nomeParaExibir("AÇOUGUE SÃO JOSÉ ME")).toBe("Açougue São José ME");
    expect(nomeParaExibir("COMERCIO 2000 S/A")).toBe("Comercio 2000 S/A");
    expect(nomeParaExibir("AUTO-PECAS CENTRAL EIRELI")).toBe("Auto-Pecas Central Eireli");
  });

  it("conectivo no começo do nome fica com maiúscula", () => {
    expect(nomeParaExibir("DA VINCI MOVEIS")).toBe("Da Vinci Moveis");
  });

  it("não mexe no que o usuário digitou com minúsculas", () => {
    expect(nomeParaExibir("Lúcia Teste")).toBe("Lúcia Teste");
    expect(nomeParaExibir("iFood Parceiro SP")).toBe("iFood Parceiro SP");
  });

  it("preserva os espaços originais", () => {
    expect(nomeParaExibir("BAR  DO ZE")).toBe("Bar  do Ze");
  });
});
