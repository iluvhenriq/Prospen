// Carrega o .env.local para os scripts de linha de comando.
export function carregarEnvLocal(): void {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // arquivo ausente: segue com as variáveis do sistema
  }
}
