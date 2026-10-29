// Pix estático no padrão BR Code do Banco Central: o "copia e cola" e o
// conteúdo do QR, já com o valor. Testado no app do Inter em 29/10/2026 com a
// chave de src/lib/vendas.ts. Não depende de banco nem de servidor: roda no
// navegador, inclusive na versão estática da página inicial.

// Cada campo: identificador de 2 dígitos, tamanho de 2 dígitos e o valor.
function campo(id: string, valor: string): string {
  return id + String(valor.length).padStart(2, "0") + valor;
}

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do código.
function crc16(texto: string): string {
  let c = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    c ^= byte << 8;
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}

export type DadosDoPix = {
  chave: string;
  // Sem acento e em maiúsculas: alguns bancos recusam o código com acento.
  nome: string;
  cidade: string;
  valorCentavos: number;
  // Aparece no extrato de quem recebe (até 25 letras e números).
  identificador: string;
};

export function codigoPix({ chave, nome, cidade, valorCentavos, identificador }: DadosDoPix): string {
  const corpo =
    campo("00", "01") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", (valorCentavos / 100).toFixed(2)) +
    campo("58", "BR") +
    campo("59", nome) +
    campo("60", cidade) +
    campo("62", campo("05", identificador)) +
    "6304";
  return corpo + crc16(corpo);
}
