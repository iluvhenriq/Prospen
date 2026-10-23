const MENSAGENS: Record<string, string> = {
  ECONNREFUSED:
    "Não consegui conectar ao PostgreSQL. Confira se ele está ligado e se a porta da DATABASE_URL está certa (a padrão é 5432).",
  ENOTFOUND:
    "Endereço do servidor não encontrado. Confira o host da DATABASE_URL.",
  "28P01":
    "Usuário ou senha incorretos. Confira a DATABASE_URL no .env.local. Se a senha tem símbolos como @ # / ou :, troque cada um pelo código correspondente (por exemplo, @ vira %40).",
  "3D000": "O banco informado ainda não existe. Rode: npm run db:criar",
};

// O Drizzle e o Node embrulham o erro original (em "cause" ou "errors").
// Percorre toda a cadeia para achar o código verdadeiro do PostgreSQL.
function coletarCodigos(erro: unknown, profundidade = 0): string[] {
  if (typeof erro !== "object" || erro === null || profundidade > 5) return [];
  const { code, cause, errors } = erro as {
    code?: unknown;
    cause?: unknown;
    errors?: unknown;
  };
  const encontrados: string[] = [];
  if (typeof code === "string" && code) encontrados.push(code);
  if (Array.isArray(errors)) {
    for (const interno of errors) {
      encontrados.push(...coletarCodigos(interno, profundidade + 1));
    }
  }
  encontrados.push(...coletarCodigos(cause, profundidade + 1));
  return encontrados;
}

// Traduz os erros mais comuns do PostgreSQL para mensagens que dizem o que fazer.
export function explicarErroBanco(erro: unknown): string {
  const conhecido = coletarCodigos(erro).find((codigo) => codigo in MENSAGENS);
  if (conhecido) return MENSAGENS[conhecido];

  if (erro instanceof Error) {
    // A causa costuma ser mais útil que a mensagem do Drizzle, que repete a consulta.
    return erro.cause instanceof Error ? erro.cause.message : erro.message;
  }
  return "Erro desconhecido.";
}
