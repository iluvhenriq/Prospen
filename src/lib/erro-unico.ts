// Descobre se um erro do banco é uma violação de unicidade (código 23505 do
// PostgreSQL) e devolve o nome da regra violada. O Drizzle e o Node embrulham o
// erro original (em "cause" ou "errors"), então percorre toda a cadeia.
export function regraDeUnicidadeViolada(erro: unknown, profundidade = 0): string | null {
  if (typeof erro !== "object" || erro === null || profundidade > 5) return null;
  const { code, constraint, cause, errors } = erro as {
    code?: unknown;
    constraint?: unknown;
    cause?: unknown;
    errors?: unknown;
  };

  if (code === "23505") return typeof constraint === "string" ? constraint : "";

  if (Array.isArray(errors)) {
    for (const interno of errors) {
      const achado = regraDeUnicidadeViolada(interno, profundidade + 1);
      if (achado !== null) return achado;
    }
  }
  return regraDeUnicidadeViolada(cause, profundidade + 1);
}
