import { describe, expect, it } from "vitest";
import { cnpjValido, formatarCnpj, normalizarCnpj } from "@/modules/leads/cnpj";

describe("CNPJ", () => {
  it("padroniza tirando pontuação e passando para maiúsculo", () => {
    expect(normalizarCnpj("11.222.333/0001-81")).toBe("11222333000181");
    expect(normalizarCnpj(" 12.abc.345/01de-35 ")).toBe("12ABC34501DE35");
    expect(normalizarCnpj("")).toBeNull();
    expect(normalizarCnpj(null)).toBeNull();
  });

  it("aceita CNPJ só com números quando os dígitos verificadores batem", () => {
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11222333000182")).toBe(false);
  });

  it("aceita o CNPJ alfanumérico (exemplo publicado pela Receita Federal)", () => {
    expect(cnpjValido("12ABC34501DE35")).toBe(true);
    expect(cnpjValido("12ABC34501DE36")).toBe(false);
  });

  it("recusa formato errado e sequências repetidas", () => {
    expect(cnpjValido("1122233300018")).toBe(false); // 13 caracteres
    expect(cnpjValido("112223330001811")).toBe(false); // 15 caracteres
    expect(cnpjValido("12ABC34501DEA5")).toBe(false); // letra no verificador
    expect(cnpjValido("12abc34501de35")).toBe(false); // minúsculas não padronizadas
    expect(cnpjValido("00000000000000")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
  });

  it("formata para mostrar na tela", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(formatarCnpj("123")).toBe("123");
    expect(formatarCnpj(null)).toBe("");
  });
});
