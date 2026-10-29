import { describe, expect, it } from "vitest";
import { codigoPix } from "@/modules/planos/pix";

const BASE = { chave: "contaspablohenrique@gmail.com", nome: "PROSPEN", cidade: "SAO PAULO", identificador: "FUNDADOR" };

// Pix da reserva de fundador (29/10/2026). Os códigos esperados são os da
// página de pré-venda, lidos pelo app do Inter: se mudar, o QR deixa de valer.
describe("código do Pix", () => {
  it("gera o mesmo código testado no banco", () => {
    expect(codigoPix({ ...BASE, valorCentavos: 9700 })).toBe(
      "00020126510014br.gov.bcb.pix0129contaspablohenrique@gmail.com520400005303986540597.005802BR5907PROSPEN6009SAO PAULO62120508FUNDADOR6304109E",
    );
    expect(codigoPix({ ...BASE, valorCentavos: 19700 })).toBe(
      "00020126510014br.gov.bcb.pix0129contaspablohenrique@gmail.com5204000053039865406197.005802BR5907PROSPEN6009SAO PAULO62120508FUNDADOR6304F76C",
    );
  });

  it("escreve o valor com ponto e dois decimais", () => {
    expect(codigoPix({ ...BASE, valorCentavos: 17700 })).toContain("5406177.00");
  });
});
