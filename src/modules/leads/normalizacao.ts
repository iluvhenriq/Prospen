// Funções de padronização de dados de contato. São puras (sem banco), e a
// mesma regra vale para o cadastro manual, a importação e a busca.

// Minúsculo, sem acento e com espaços simples. Usado para comparar nomes e buscar.
export function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// E-mail padronizado para achar duplicados: sem espaços nas pontas e em minúsculo.
// Vazio vira nulo.
export function normalizarEmail(valor: string | null | undefined): string | null {
  const limpo = (valor ?? "").trim().toLowerCase();
  return limpo === "" ? null : limpo;
}

// Telefone padronizado para achar duplicados: só dígitos.
// No Brasil também some o código do país (+55) e o zero antes do DDD, então
// "(11) 99999-0000", "011 99999-0000" e "+55 11 99999-0000" viram a mesma coisa.
// Vazio (ou sem nenhum dígito) vira nulo.
export function normalizarTelefone(
  valor: string | null | undefined,
  pais = "BR",
): string | null {
  let digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos === "") return null;

  // Prefixo internacional "00" (por exemplo, 0055 11 ...).
  if (digitos.startsWith("00")) digitos = digitos.slice(2);

  if (pais === "BR") {
    // Com código do país, o número tem 12 ou 13 dígitos. Sem ele, no máximo 11,
    // o que evita confundir o DDD 55 (Rio Grande do Sul) com o código do Brasil.
    if (digitos.startsWith("55") && digitos.length >= 12) digitos = digitos.slice(2);
    digitos = digitos.replace(/^0+/, "");
  }
  return digitos === "" ? null : digitos;
}

// Diz se o telefone (já padronizado) é plausível. Não garante que exista,
// só barra erros comuns de digitação.
export function telefoneValido(normalizado: string, pais = "BR"): boolean {
  if (pais === "BR") {
    // Fixo: DDD + 8 dígitos começando de 2 a 8. Celular: DDD + 9 + 8 dígitos.
    return /^[1-9]{2}[2-8]\d{7}$/.test(normalizado) || /^[1-9]{2}9\d{8}$/.test(normalizado);
  }
  return normalizado.length >= 6 && normalizado.length <= 15;
}

// Celular antigo, de antes do nono dígito (2016): DDD + 8 dígitos começando
// com 9, comum na base da Receita. Ganha o 9 na frente. Só para mostrar e
// para contatar; a regra de duplicados continua com o número como veio.
function comNonoDigito(normalizado: string): string {
  return /^[1-9]{2}9\d{7}$/.test(normalizado) ? `${normalizado.slice(0, 2)}9${normalizado.slice(2)}` : normalizado;
}

// Endereços para contatar o lead: "tel:" para ligar e, se for celular, o
// número do WhatsApp (wa.me). Por enquanto só números do Brasil; de outro
// país o código internacional não é guardado, então não dá para montar.
export function telefoneParaContato(
  telefone: string | null | undefined,
  pais = "BR",
): { ligar: string; whatsapp: string | null } | null {
  if (!telefone || pais !== "BR") return null;
  const normalizado = normalizarTelefone(telefone, "BR");
  if (!normalizado) return null;
  const numero = comNonoDigito(normalizado);
  if (!telefoneValido(numero, "BR")) return null;
  const celular = numero.length === 11;
  return { ligar: `tel:+55${numero}`, whatsapp: celular ? `https://wa.me/55${numero}` : null };
}

// Telefone para mostrar na tela. Só formata números brasileiros válidos.
export function formatarTelefone(
  telefone: string | null | undefined,
  pais = "BR",
): string {
  if (!telefone) return "";
  const bruto = normalizarTelefone(telefone, pais);
  const normalizado = bruto && pais === "BR" ? comNonoDigito(bruto) : bruto;
  if (pais === "BR" && normalizado && telefoneValido(normalizado, "BR")) {
    const ddd = normalizado.slice(0, 2);
    const resto = normalizado.slice(2);
    return resto.length === 9
      ? `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`
      : `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  }
  return telefone.trim();
}

// Protege os símbolos especiais de uma busca (% _ \) para valerem como texto comum.
export function escaparLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (simbolo) => `\\${simbolo}`);
}
