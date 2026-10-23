// Valor da venda (etapa 7): leitura do que a pessoa digita e formatação para a
// tela. Guardado em centavos (número inteiro) para não ter erro de arredondamento.

// Até 10 bilhões na moeda da empresa. Acima disso é quase certo erro de digitação.
export const MAXIMO_CENTAVOS = 1_000_000_000_000;

// Aceita o jeito brasileiro ("1.234,56", "1234,5", "R$ 1.234") e o com ponto
// decimal ("1234.56"). Vírgula presente: ela é o decimal e os pontos separam
// milhares. Sem vírgula: um ponto seguido de 1 ou 2 algarismos no fim é decimal;
// os demais pontos separam milhares. Nulo se não for um valor válido.
export function lerValorEmCentavos(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,-]/g, "");
  if (limpo === "" || limpo.includes("-")) return null;

  let inteiro: string;
  let decimal = "";
  if (limpo.includes(",")) {
    const partes = limpo.split(",");
    if (partes.length !== 2) return null;
    inteiro = partes[0].replace(/\./g, "");
    decimal = partes[1];
  } else {
    const decimalComPonto = /^(.*)\.(\d{1,2})$/.exec(limpo);
    if (decimalComPonto && !decimalComPonto[1].includes(".")) {
      inteiro = decimalComPonto[1];
      decimal = decimalComPonto[2];
    } else {
      inteiro = limpo.replace(/\./g, "");
    }
  }

  if (!/^\d*$/.test(inteiro) || !/^\d{0,2}$/.test(decimal) || (inteiro === "" && decimal === "")) return null;
  const centavos = Number(inteiro || "0") * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) && centavos <= MAXIMO_CENTAVOS ? centavos : null;
}

export function formatarValor(centavos: number, moeda: string, idioma = "pt-BR"): string {
  try {
    return new Intl.NumberFormat(idioma, { style: "currency", currency: moeda }).format(centavos / 100);
  } catch {
    // Moeda ou idioma inválido guardado por engano: mostra o número e o código.
    return `${(centavos / 100).toFixed(2)} ${moeda}`;
  }
}
