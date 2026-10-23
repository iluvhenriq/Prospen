// Endereço e banco dos testes de navegador. O banco fica no mesmo PostgreSQL
// do desenvolvimento, mas com outro nome (terminado em _e2e), e é apagado e
// recriado a cada rodada. O banco de desenvolvimento nunca é tocado.
export const PORTA_E2E = 3100;
export const URL_E2E = `http://localhost:${PORTA_E2E}`;

export function urlDoBancoE2E(): string {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // arquivo ausente: segue com as variáveis do sistema
  }
  const original = process.env.DATABASE_URL;
  if (!original) {
    throw new Error("DATABASE_URL não encontrada. Confira o arquivo .env.local.");
  }
  const url = new URL(original);
  const nome = decodeURIComponent(url.pathname.replace(/^\//, ""));
  // O servidor dos testes já recebe a DATABASE_URL do banco de testes. Sem esta
  // checagem, o sufixo era acrescentado de novo (prospen_e2e_e2e) e o preparo
  // mexia num banco que o servidor não usa.
  if (!nome.endsWith("_e2e")) url.pathname = `/${nome}_e2e`;
  return url.toString();
}
