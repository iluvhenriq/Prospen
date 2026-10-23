// Traduz os erros do Better Auth para mensagens que a pessoa entende.
// Mensagens de login não revelam se o e-mail existe: "e-mail ou senha incorretos".

const MENSAGENS: Record<string, string> = {
  USER_ALREADY_EXISTS: "Já existe uma conta com este e-mail. Tente entrar.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Já existe uma conta com este e-mail. Tente entrar.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_PASSWORD: "E-mail ou senha incorretos.",
  INVALID_EMAIL: "Informe um e-mail válido.",
  PASSWORD_TOO_SHORT: "A senha é curta demais.",
  PASSWORD_TOO_LONG: "A senha é longa demais.",
  EMAIL_NOT_VERIFIED: "Confirme seu e-mail antes de entrar.",
  ORGANIZATION_ALREADY_EXISTS: "Já existe uma empresa com este identificador. Tente de novo.",
  YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS:
    "Sua conta já tem uma empresa.",
};

const GENERICA = "Algo deu errado. Tente novamente em instantes.";

function lerCampo(erro: unknown, caminho: string[]): unknown {
  let atual: unknown = erro;
  for (const chave of caminho) {
    if (typeof atual !== "object" || atual === null) return undefined;
    atual = (atual as Record<string, unknown>)[chave];
  }
  return atual;
}

export function traduzirErroLogin(erro: unknown): string {
  const codigo = lerCampo(erro, ["body", "code"]);
  if (typeof codigo === "string" && codigo in MENSAGENS) return MENSAGENS[codigo];

  const status = lerCampo(erro, ["statusCode"]) ?? lerCampo(erro, ["status"]);
  if (status === 429 || status === "TOO_MANY_REQUESTS") {
    return "Muitas tentativas. Aguarde um instante e tente de novo.";
  }
  return GENERICA;
}
