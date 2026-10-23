import { defineConfig } from "drizzle-kit";

// Usa o mesmo arquivo de variáveis do projeto. Se ele não existir,
// valem as variáveis do sistema.
try {
  process.loadEnvFile(".env.local");
} catch {
  // arquivo ausente: segue com as variáveis do sistema
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
