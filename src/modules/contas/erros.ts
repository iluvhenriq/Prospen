// Traduz os erros do Better Auth para mensagens que a pessoa entende.
// Mensagens de login não revelam se o e-mail existe: "e-mail ou senha incorretos".

import { ptBR } from "@/lib/i18n/pt-BR";

const MENSAGENS: Record<string, string> = {
  USER_ALREADY_EXISTS: ptBR.mensagens.conta.contaJaExiste,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: ptBR.mensagens.conta.contaJaExiste,
  INVALID_EMAIL_OR_PASSWORD: ptBR.mensagens.conta.emailOuSenhaIncorretos,
  INVALID_PASSWORD: ptBR.mensagens.conta.emailOuSenhaIncorretos,
  INVALID_EMAIL: ptBR.mensagens.conta.emailInvalido,
  PASSWORD_TOO_SHORT: ptBR.mensagens.conta.senhaCurtaDemais,
  PASSWORD_TOO_LONG: ptBR.mensagens.conta.senhaLongaDemais,
  EMAIL_NOT_VERIFIED: ptBR.mensagens.conta.emailNaoConfirmado,
  ORGANIZATION_ALREADY_EXISTS: ptBR.mensagens.conta.identificadorDeEmpresaEmUso,
  YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS: ptBR.mensagens.conta.jaTemEmpresa,
};

const GENERICA = ptBR.mensagens.conta.generica;

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
    return ptBR.mensagens.conta.muitasTentativas;
  }
  return GENERICA;
}
