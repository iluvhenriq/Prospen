// CNPJ: identifica os leads que vêm da base pública de empresas (etapa 5).
//
// Desde julho de 2026 a Receita Federal também emite CNPJ alfanumérico: os 12
// primeiros caracteres podem ter letras maiúsculas, e os 2 últimos (dígitos
// verificadores) continuam sendo números. O cálculo dos verificadores é o mesmo
// de sempre, com cada caractere valendo o seu código ASCII menos 48: de 0 a 9
// valem 0 a 9, A vale 17, B vale 18, e assim por diante. Os CNPJs antigos, só
// com números, continuam válidos.

// Tira pontos, barra, hífen e espaços, e passa para maiúsculo. Vazio vira nulo.
export function normalizarCnpj(valor: string | null | undefined): string | null {
  const limpo = (valor ?? "").replace(/[.\/\-\s]/g, "").toUpperCase();
  return limpo === "" ? null : limpo;
}

const PESOS_PRIMEIRO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificador(base: string, pesos: number[]): number {
  let soma = 0;
  for (let i = 0; i < pesos.length; i += 1) {
    soma += (base.charCodeAt(i) - 48) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

// Diz se o CNPJ (já padronizado) tem o formato e os dígitos verificadores certos.
export function cnpjValido(normalizado: string): boolean {
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(normalizado)) return false;
  // Sequências repetidas (00000000000000, 11111111111111...) passam no cálculo,
  // mas não são CNPJs de verdade.
  if (/^(.)\1{13}$/.test(normalizado)) return false;
  const primeiro = digitoVerificador(normalizado, PESOS_PRIMEIRO);
  const segundo = digitoVerificador(`${normalizado.slice(0, 12)}${primeiro}`, PESOS_SEGUNDO);
  return normalizado.endsWith(`${primeiro}${segundo}`);
}

// CNPJ para mostrar na tela, no formato 12.345.678/0001-95. Se não for válido,
// devolve o texto como veio.
export function formatarCnpj(valor: string | null | undefined): string {
  const normalizado = normalizarCnpj(valor);
  if (!normalizado) return "";
  if (!cnpjValido(normalizado)) return (valor ?? "").trim();
  const c = normalizado;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}
