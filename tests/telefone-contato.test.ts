import { describe, expect, it } from "vitest";
import { formatarTelefone, normalizarTelefone, telefoneParaContato } from "@/modules/leads/normalizacao";

describe("telefoneParaContato", () => {
  it("celular: liga e abre o WhatsApp", () => {
    expect(telefoneParaContato("(11) 99999-0000")).toEqual({
      ligar: "tel:+5511999990000",
      whatsapp: "https://wa.me/5511999990000",
    });
  });

  it("fixo: só liga", () => {
    expect(telefoneParaContato("(11) 4384-0761")).toEqual({ ligar: "tel:+551143840761", whatsapp: null });
  });

  it("celular antigo da Receita ganha o nono dígito", () => {
    expect(telefoneParaContato("1692070859")).toEqual({
      ligar: "tel:+5516992070859",
      whatsapp: "https://wa.me/5516992070859",
    });
  });

  it("número inválido, vazio ou de outro país não vira contato", () => {
    expect(telefoneParaContato("123")).toBeNull();
    expect(telefoneParaContato(null)).toBeNull();
    expect(telefoneParaContato("+1 415 555 0100", "US")).toBeNull();
  });
});

describe("formatarTelefone com celular antigo", () => {
  it("mostra com o nono dígito", () => {
    expect(formatarTelefone("1692070859")).toBe("(16) 99207-0859");
  });

  it("a regra de duplicados não muda", () => {
    expect(normalizarTelefone("1692070859")).toBe("1692070859");
  });
});
