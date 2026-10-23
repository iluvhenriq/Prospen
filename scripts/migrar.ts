import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { lerEnv } from "../src/lib/env";
import { carregarEnvLocal } from "./carregar-env";

// Aplica as migrações pendentes, em ordem. Pode ser rodado várias vezes.
async function main(): Promise<void> {
  carregarEnvLocal();
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./src/db/migrations" });
    console.log("Migrações aplicadas com sucesso.");
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao aplicar as migrações:", explicarErroBanco(erro));
  process.exit(1);
});
